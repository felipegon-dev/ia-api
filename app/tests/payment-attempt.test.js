const { test } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const rows = new Map();
let locked = false;
let failPersist = false;
let calls = 0;
const locks = {
    async transaction() { return { async rollback() {} }; },
    async query(sql) {
        if (sql.includes('GET_LOCK')) {
            if (locked) return [{ acquired: 0 }];
            locked = true;
            return [{ acquired: 1 }];
        }
        locked = false;
    },
};
const db = {
    sequelize: {
        async query(sql, { replacements: p }) {
            const key = `${p.domainId}:${p.authorizationId}`;
            if (sql.startsWith('SELECT')) return rows.has(key) ? [rows.get(key)] : [];
            if (sql.startsWith('INSERT')) rows.set(key, { requestHash: p.requestHash });
            else if (p.snapshot) rows.get(key).snapshot = p.snapshot;
            else if (p.orderId) rows.get(key).orderId = p.orderId;
            else rows.get(key).redirectUrl = p.redirectUrl;
        },
    },
};
const originalLoad = Module._load;
Module._load = function (id, ...args) {
    return id === '@config/database/models' ? db : originalLoad.call(this, id, ...args);
};
const { PaymentAttempt } = require('../src/services/security/PaymentAttempt');
Module._load = originalLoad;
PaymentAttempt.lockPool = () => locks;
const snapshot = {
    providerId: 'provider', redirectUrl: 'https://provider.test', providerMetadata: '{}',
    userPaymentMethodId: 1, cartItems: '[]', addressItems: '[]', shippingDetails: '[]', amount: 10, description: '',
};
const create = async key => { assert.equal(key.length, 38); calls++; return snapshot; };
const persist = async (_, linkOrder) => {
    await linkOrder(42);
    if (failPersist) throw new Error('Temporary database failure');
};

test('authorization survives persistence failure without creating another provider order', async () => {
    failPersist = true;
    await assert.rejects(PaymentAttempt.run(1, 'recover', { price: 10 }, create, persist), /Temporary/);
    assert.equal(calls, 1);
    assert.equal(rows.get('1:recover').orderId, 42);
    assert.equal(rows.get('1:recover').redirectUrl, undefined);
    failPersist = false;
    assert.equal(await PaymentAttempt.run(1, 'recover', { price: 10 }, create, persist), snapshot.redirectUrl);
    assert.equal(calls, 1);
    assert.equal(await PaymentAttempt.run(1, 'recover', { price: 10 }, create, persist), snapshot.redirectUrl);
    assert.equal(calls, 1);
    await assert.rejects(PaymentAttempt.run(1, 'recover', { price: 11 }, create, persist), /different payment/);
});
test('concurrent use rejects before reaching the payment provider', async () => {
    let release;
    const waiting = new Promise(resolve => { release = resolve; });
    const first = PaymentAttempt.run(1, 'concurrent', {}, async key => {
        await waiting;
        return create(key);
    }, persist);
    await new Promise(resolve => setImmediate(resolve));
    const before = calls;
    await assert.rejects(PaymentAttempt.run(1, 'concurrent', {}, create, persist), /being processed/);
    assert.equal(calls, before);
    release();
    await first;
});

test('a replaced transfer snapshot survives failure and uses its linked order on retry', async () => {
    const replacement = { ...snapshot, providerId: 'new-reference', redirectUrl: 'https://provider.test/new-reference' };
    await assert.rejects(PaymentAttempt.run(1, 'collision', {}, create, async (_, link, orderId, replace) => {
        assert.equal(orderId, null);
        await replace(replacement);
        await link(43);
        throw new Error('Queue unavailable');
    }), /Queue unavailable/);
    const result = await PaymentAttempt.run(1, 'collision', {}, async () => {
        throw new Error('Provider must not be called again');
    }, async (recovered, _, orderId) => {
        assert.equal(recovered.providerId, 'new-reference');
        assert.equal(orderId, 43);
        return recovered;
    });
    assert.equal(result, replacement.redirectUrl);
});
