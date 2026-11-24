const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const requests = [];
const originalLoad = Module._load;
Module._load = function (id, ...args) {
    if (id === 'axios') return { post: async (url, body, config) => {
        requests.push({ url, body, config });
        return url.endsWith('/token') ? { data: { access_token: 'test-token' } } : {
            data: { id: 'test-order', links: [{ rel: 'approve', href: 'https://provider.test/pay' }] },
        };
    } };
    return originalLoad.call(this, id, ...args);
};
let PaypalRequest;
try {
    ({ PaypalRequest } = require('../src/services/payment/paypal/PaypalRequest'));
} finally {
    Module._load = originalLoad;
}
const { Crypt } = require('../src/services/base/Crypt');
const { Currency } = require('../config/database/vo/Currency');
test('PayPal uses a stable request id and bounded network calls for signed retries', async () => {
    process.env.TOKEN_ALGORITHM = 'aes-256-gcm';
    process.env.TOKEN_ENCRYPTION_SECRET = 'test-secret-only-for-encryption-fixture';
    const paymentToken = new Crypt(process.env.TOKEN_ALGORITHM, process.env.TOKEN_ENCRYPTION_SECRET)
        .encrypt(JSON.stringify({ client_id: 'test-client', client_secret: 'test-secret' }));
    for (let attempt = 0; attempt < 2; attempt++) {
        const request = new PaypalRequest();
        await request.setParameters({
            cartItems: [{ id: 'one', title: 'Product', price: 19.99, currency: 'EUR', quantity: 1 }],
            amount: 19.99, currency: Currency.of('EUR'), paymentToken,
            host: 'shop.test', cancelUrl: 'https://shop.test/cancel', returnUrl: 'https://shop.test/return',
            callbackUrl: 'https://api.test/callback', idempotencyKey: 'same-request-id',
        });
        await request.createOrder();
        assert.equal(await request.getResultRedirectUrl(), 'https://provider.test/pay');
    }
    const orders = requests.filter(request => request.url.endsWith('/orders'));
    assert.equal(orders.length, 2);
    for (const { config } of orders) assert.equal(config.headers['PayPal-Request-Id'], 'same-request-id');
    for (const { config } of requests) assert.equal(config.timeout, 15000);
});
