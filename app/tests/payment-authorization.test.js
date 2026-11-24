const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const Module = require('node:module');

let signing = { enabled: true, keyId: 'key', secret: 's'.repeat(43) };
const originalLoad = Module._load;
Module._load = function (id, ...args) {
    if (id === '@src/services/security/SigningKeys') {
        return { SigningKeys: class { async find() { return signing; } } };
    }
    if (id === '@src/services/security/PaymentAttempt') {
        return { PaymentAttempt: { async run(domain, authorization, request, create, persist) {
            const snapshot = await create('idempotent');
            await persist(snapshot, async id => { if (id !== 42) throw new Error('Invalid linked order'); });
            return snapshot.redirectUrl;
        } } };
    }
    return originalLoad.call(this, id, ...args);
};
let PaymentController;
try {
    ({ PaymentController } = require('../src/api/v1/controllers/PaymentController'));
} finally {
    Module._load = originalLoad;
}

function fixture() {
    let providerCalls = 0;
    let stored;
    let parameters;
    const request = {
        headers: {}, ip: '127.0.0.1',
        get: () => 'https://shop.test/checkout',
        body: {
            paymentCode: 'card', cartItems: [{
                id: 'one', title: 'Untrusted browser title', price: 19.99, currency: 'EUR',
                quantity: 1, image: '', url: '',
            }], addressItems: [], shippingMethods: [], description: '',
        },
    };
    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
        version: 1, keyId: 'key', merchant: 'merchant', domain: 'shop.test',
        authorizationId: 'authorization', issuedAt: now, expiresAt: now + 300, currency: 'EUR',
        items: [{
            id: 'one', title: 'Authoritative store title', priceMinor: 1999, lineTotalMinor: 1999,
            quantity: 1, image: 'https://shop.test/image', url: 'https://shop.test/product',
        }],
    })).toString('base64url');
    request.body.cartAuthorization = {
        payload, signature: createHmac('sha256', signing.secret).update('ia-cart-authorization.v1.' + payload).digest('hex'),
    };
    const manager = {
        getPaymentType: () => 'card', getPaymentToken: () => 'token', getCancelUrl: () => 'https://shop.test/cancel',
        getReturnUrl: () => 'https://shop.test/success', getHost: () => 'shop.test',
        getCallbackUrl: () => 'https://api.test/callback', getUserPaymentMethodId: () => 1,
        saveOrderOnce: async (id, data) => { stored = data; return 42; },
    };
    const dependencies = {
        token: { validate() {} },
        userDomainValidation: {
            async validate() { return { get: () => 'merchant' }; }, resolve: () => ({ id: 1 }),
        },
        paymentControllerValidation: { validateRequest() {} },
        shippingManager: { async get() { return { getAmount: () => 3, getItemsJson: () => '[]' }; } },
        paymentManager: { get: () => manager },
        paymentFactory: { getProviderRequest: () => ({
            async setParameters(value) { parameters = value; }, async createOrder() { providerCalls++; },
            getOrderId: () => 'provider', getMetadata: () => '{}', getResultRedirectUrl: async () => 'https://provider.test/pay',
        }) },
        redisManager: { async checkConnection() { return true; }, async queueEvent() { return 'stream-id'; } },
    };
    const response = { statusCode: 0, body: null, status(value) { this.statusCode = value; return this; },
        json(value) { this.body = value; return this; } };
    return { request, response, dependencies, controller: new PaymentController(dependencies),
        providerCalls: () => providerCalls, stored: () => stored, parameters: () => parameters };
}
test('invalid, missing or altered authorization never reaches the provider', async () => {
    for (const tamper of [
        f => { delete f.request.body.cartAuthorization; },
        f => { f.request.body.cartAuthorization.signature = '0'.repeat(64); },
        f => { f.request.body.cartItems[0].price = 0.01; },
        f => { f.request.body.cartItems[0].quantity = 2; },
        f => { f.request.body.shippingMethods = [{ currency: 'USD' }]; },
        f => { f.request.get = () => 'https://another.test/checkout'; },
    ]) {
        const f = fixture();
        tamper(f);
        await f.controller.postPayment(f.request, f.response);
        assert.equal(f.response.statusCode, 400);
        assert.equal(f.providerCalls(), 0);
    }
});
test('only signed descriptive data and integer totals reach payment and storage', async () => {
    const f = fixture();
    await f.controller.postPayment(f.request, f.response);
    assert.equal(f.response.statusCode, 200);
    assert.equal(f.providerCalls(), 1);
    assert.equal(f.parameters().amount, 22.99);
    assert.equal(f.parameters().cartItems[0].title, 'Authoritative store title');
    assert.equal(JSON.parse(f.stored().cartItems)[0].title, 'Authoritative store title');
});
test('awaits failed Redis health before creating an order', async () => {
    const f = fixture();
    f.dependencies.redisManager.checkConnection = async () => false;
    await f.controller.postPayment(f.request, f.response);
    assert.equal(f.response.statusCode, 503);
    assert.equal(f.providerCalls(), 0);
});
test('domains without keys retain their unsigned legacy checkout', async () => {
    const f = fixture();
    const original = signing;
    signing = null;
    delete f.request.body.cartAuthorization;
    try {
        await f.controller.postPayment(f.request, f.response);
        assert.equal(f.response.statusCode, 200);
        assert.equal(f.providerCalls(), 1);
        assert.equal(f.parameters().cartItems[0].title, 'Untrusted browser title');
    } finally {
        signing = original;
    }
});
