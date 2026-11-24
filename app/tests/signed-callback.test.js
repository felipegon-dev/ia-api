const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const Module = require('node:module');

let outgoing;
let ok = true;
const originalLoad = Module._load;
Module._load = function (id, ...args) {
    if (id === 'node-fetch') return async (url, options) => {
        outgoing = { url, ...options };
        return { ok, status: ok ? 200 : 503, text: async () => '{"success":true}' };
    };
    return originalLoad.call(this, id, ...args);
};
let BaseEvent;
try {
    BaseEvent = require('../src/events/Base/BaseEvent').default;
} finally {
    Module._load = originalLoad;
}
const { default: EventData, EventType } = require('../src/services/queue/EventData');
class Callback extends BaseEvent {
    getEventType() { return EventType.postPayment; }
}
test('callback transport sends exactly the signed UTF-8 bytes without insecure TLS or redirects', async () => {
    const event = new Callback({});
    event.setEventData(new EventData('postPayment', 'provider', EventType.postPayment));
    const data = {
        callbackUrl: 'https://store.test/callback', providerMetadata: {}, cartItems: [{ title: 'Artículo náutico' }],
        addressItems: [], amount: '19.99', shippingDetails: [], description: 'Pedido', createdAt: new Date(0),
        signingKey: { enabled: true, keyId: 'active', secret: 's'.repeat(43) },
    };
    assert.equal(await event.sendCallback(data), true);
    const headers = outgoing.headers;
    const message = `v1\nactive\n${headers['X-IA-Event-Id']}\n${headers['X-IA-Timestamp']}\n${outgoing.body}`;
    assert.equal(headers['X-IA-Signature'], 'v1=' + createHmac('sha256', data.signingKey.secret).update(message).digest('hex'));
    assert.equal(outgoing.redirect, 'manual');
    assert.equal(outgoing.agent, undefined);
    assert.ok(outgoing.signal);
    assert.equal(JSON.parse(outgoing.body).cartItems[0].title, 'Artículo náutico');
    assert.equal(outgoing.body.includes(data.signingKey.secret), false);
    const eventId = headers['X-IA-Event-Id'];
    assert.equal(await event.sendCallback(data), true);
    assert.equal(outgoing.headers['X-IA-Event-Id'], eventId);
    ok = false;
    assert.equal(await event.sendCallback(data), false);
    ok = true;
    await event.sendCallback({ ...data, signingKey: null });
    assert.equal(outgoing.headers['X-IA-Signature'], undefined);
});
