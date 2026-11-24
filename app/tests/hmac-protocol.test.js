const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { test } = require('node:test');
const { callbackHeaders, verifyCart, moneyMinor } = require('../src/services/security/HmacProtocol');
const ltnVector = require('./fixtures/ltn-hmac-v1.json');
const secret = 'test-secret-with-at-least-thirty-two-bytes';
const key = { enabled: true, keyId: 'key-1', secret };
const now = 1800000000;
const payload = {
    version: 1, keyId: 'key-1', merchant: 'shop', domain: 'shop.example.test',
    authorizationId: 'auth-123', issuedAt: now, expiresAt: now + 300, currency: 'EUR',
    items: [{ id: 'item-1', title: 'Artículo', priceMinor: 1999, lineTotalMinor: 3998,
        quantity: 2, image: 'https://shop.example.test/image', url: 'https://shop.example.test/item' }],
};
function sign(value = payload, signingSecret = secret) {
    const encoded = Buffer.from(JSON.stringify(value)).toString('base64url');
    return { payload: encoded, signature: crypto.createHmac('sha256', signingSecret)
        .update('ia-cart-authorization.v1.' + encoded).digest('hex') };
}
test('Node consumes the same Unicode cart and callback vectors as LTN PHP', () => {
    const data = ltnVector.expected.cart;
    assert.deepEqual(verifyCart(ltnVector.cart, {
        enabled: true, keyId: data.keyId, secret: ltnVector.secret,
    }, data.merchant, data.domain, data.issuedAt), data);
    assert.deepEqual(callbackHeaders(ltnVector.callback.rawBody, {
        enabled: true, keyId: 'callback-1', secret: ltnVector.secret,
    }, ltnVector.expected.eventType, ltnVector.expected.providerId, data.issuedAt),
    ltnVector.callback.headers);
});
test('cart signature binds merchant, domain, quantities, price and expiry', () => {
    const result = verifyCart(sign(), key, 'shop', 'shop.example.test', now);
    assert.equal(result.items[0].priceMinor, 1999);
    for (const change of [
        { merchant: 'other' }, { domain: 'other.test' }, { expiresAt: now - 1 },
        { issuedAt: now + 301 }, { items: [{ ...payload.items[0], lineTotalMinor: 1 }] },
    ]) {
        assert.throws(() => verifyCart(sign({ ...payload, ...change }), key, 'shop', 'shop.example.test', now));
    }
    assert.throws(() => verifyCart(sign(payload, 'wrong'), key, 'shop', 'shop.example.test', now));
    assert.throws(() => verifyCart(undefined, key, 'shop', 'shop.example.test', now));
});
test('rotation accepts previous key only within its window', () => {
    const rotated = { ...key, keyId: 'key-2', secret: 'new-secret', previousKeyId: 'key-1',
        previousSecret: secret, previousValidUntil: now + 10 };
    assert.ok(verifyCart(sign(), rotated, 'shop', 'shop.example.test', now));
    assert.throws(() => verifyCart(sign(), rotated, 'shop', 'shop.example.test', now + 11));
});
test('invalid authorizations expose specific errors and reject malformed signed lines', () => {
    assert.throws(() => verifyCart(sign({ ...payload, expiresAt: now - 1 }), key, 'shop', 'shop.example.test', now),
        error => error.code === 'CART_AUTHORIZATION_EXPIRED');
    assert.throws(() => verifyCart(sign(payload, 'wrong'), key, 'shop', 'shop.example.test', now),
        error => error.code === 'CART_AUTHORIZATION_INVALID_SIGNATURE');
    for (const items of [
        [{ ...payload.items[0], quantity: 0 }],
        [{ ...payload.items[0], quantity: 1.5 }],
        [{ ...payload.items[0], priceMinor: -1 }],
        [payload.items[0], payload.items[0]],
        [{ ...payload.items[0], priceMinor: 1.001 }],
    ]) {
        assert.throws(() => verifyCart(sign({ ...payload, items }), key, 'shop', 'shop.example.test', now));
    }
});
test('callback signs exact Unicode body and stable event identity', () => {
    const body = '{"title":"Artículo","amount":"19.99"}';
    const headers = callbackHeaders(body, key, 'postPayment', 'provider-1', now);
    const eventId = crypto.createHash('sha256').update('postPayment:provider-1').digest('hex');
    assert.equal(headers['X-IA-Event-Id'], eventId);
    assert.equal(headers['X-IA-Signature'], 'v1=' + crypto.createHmac('sha256', secret)
        .update(`v1\nkey-1\n${eventId}\n${now}\n${body}`).digest('hex'));
    assert.equal(callbackHeaders(body, key, 'postPayment', 'provider-1', now + 1)['X-IA-Event-Id'], eventId);
    assert.notEqual(callbackHeaders(body + ' ', key, 'postPayment', 'provider-1', now)['X-IA-Signature'],
        headers['X-IA-Signature']);
});
test('money conversion avoids floating comparisons and rejects fractional cents', () => {
    assert.equal(moneyMinor('19.99'), 1999);
    assert.equal(moneyMinor('0.01'), 1);
    assert.throws(() => moneyMinor('1.001'));
    assert.throws(() => moneyMinor('-1'));
});
