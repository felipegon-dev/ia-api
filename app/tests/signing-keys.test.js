const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHmac } = require('node:crypto');
const { SigningKeys } = require('../src/services/security/SigningKeys');
const { SigningKeyManager, parseGraceSeconds } = require('../src/services/security/SigningKeyManager');
const { createSigningKeyCrypt } = require('../src/services/security/SigningKeyCrypto');
const { callbackHeaders } = require('../src/services/security/HmacProtocol');

const crypt = createSigningKeyCrypt('test-hmac-encryption-secret-0123456789');
let now = 1700000000;
const clock = () => now;

function memoryStore() {
    const rows = new Map();
    return {
        rows,
        async findByDomainAndPurpose(domainId, purpose) { return rows.get(`${domainId}:${purpose}`) ?? null; },
        async findAllByDomainIds(ids) { return [...rows.values()].filter(r => ids.includes(r.domainId)); },
        async mutate(domainId, purpose, fn) {
            const key = `${domainId}:${purpose}`;
            const { write, result } = fn(rows.get(key) ?? null);
            if (write) rows.set(key, { ...(rows.get(key) ?? { domainId, purpose }), ...write });
            return result;
        },
    };
}

test('HMAC_ENCRYPTION_SECRET is mandatory', () => {
    assert.throws(() => createSigningKeyCrypt(''), /HMAC_ENCRYPTION_SECRET/);
    assert.throws(() => createSigningKeyCrypt(undefined), /HMAC_ENCRYPTION_SECRET/);
});

test('generate stores only ciphertext and find returns the decrypted secret', async () => {
    const store = memoryStore();
    const manager = new SigningKeyManager(store, crypt, clock);
    const keys = new SigningKeys(store, crypt, clock);

    assert.equal(await keys.find(1, 'cart'), null);
    const { status, secret } = await manager.generate(1, 'cart');
    assert.equal(Buffer.from(secret, 'base64url').length, 32);
    assert.equal(status.enabled, false);
    assert.equal(JSON.stringify(status).includes(secret), false);
    assert.equal(JSON.stringify([...store.rows.values()]).includes(secret), false);

    const key = await keys.find(1, 'cart');
    assert.deepEqual(key, { enabled: false, keyId: status.keyId, secret });
    assert.equal(await keys.find(1, 'callback'), null);

    const headers = callbackHeaders('{}', key, 'callbackPayment', 'p1', now);
    const expected = createHmac('sha256', Buffer.from(secret, 'utf8'))
        .update(`v1\n${key.keyId}\n${headers['X-IA-Event-Id']}\n${now}\n{}`).digest('hex');
    assert.equal(headers['X-IA-Signature'], 'v1=' + expected);
});

test('rotation keeps the previous key only for the grace window', async () => {
    now = 1700000000;
    const store = memoryStore();
    const manager = new SigningKeyManager(store, crypt, clock);
    const keys = new SigningKeys(store, crypt, clock);

    const first = await manager.generate(2, 'callback');
    await manager.setEnabled(2, 'callback', true);
    const second = await manager.generate(2, 'callback', 600);
    assert.equal(second.status.enabled, true);
    assert.equal(second.status.previousKeyId, first.status.keyId);
    await assert.rejects(manager.generate(2, 'callback'), { status: 409 });

    const rotated = await keys.find(2, 'callback');
    assert.equal(rotated.secret, second.secret);
    assert.equal(rotated.previousSecret, first.secret);
    assert.equal(rotated.previousValidUntil, now + 600);

    now += 601;
    const expired = await keys.find(2, 'callback');
    assert.equal(expired.previousSecret, undefined);
    assert.equal((await manager.list([2])).find(s => s.purpose === 'callback').previousKeyId, null);
    await manager.generate(2, 'callback');

    await manager.retirePrevious(2, 'callback');
    assert.equal((await keys.find(2, 'callback')).previousKeyId, undefined);
});

test('grace seconds are limited to 300 or 600…604800', () => {
    assert.equal(parseGraceSeconds(undefined), 300);
    assert.equal(parseGraceSeconds('600'), 600);
    for (const bad of [0, 299, 301, 599, 604801, '1e3', -300, 600.5]) {
        assert.throws(() => parseGraceSeconds(bad), { status: 400 });
    }
});

test('cannot enable without a key; tampered ciphertext throws instead of returning null', async () => {
    const store = memoryStore();
    const manager = new SigningKeyManager(store, crypt, clock);
    await assert.rejects(manager.setEnabled(3, 'cart', true), { status: 409 });

    await manager.generate(3, 'cart');
    const row = store.rows.get('3:cart');
    const keys = new SigningKeys(store, createSigningKeyCrypt('another-hmac-encryption-secret-012345'), clock);
    await assert.rejects(keys.find(3, 'cart'), /Unable to decrypt/);
    assert.ok(row.encryptedSecret);
});

test('legacy (no row) works without HMAC_ENCRYPTION_SECRET; stored keys fail closed', async () => {
    const saved = process.env.HMAC_ENCRYPTION_SECRET;
    delete process.env.HMAC_ENCRYPTION_SECRET;
    try {
        const store = memoryStore();
        const keys = new SigningKeys(store);
        assert.equal(await keys.find(4, 'cart'), null);

        const manager = new SigningKeyManager(store, () => createSigningKeyCrypt());
        assert.equal((await manager.list([4]))[0].configured, false);
        await assert.rejects(manager.generate(4, 'cart'), /HMAC_ENCRYPTION_SECRET/);
        assert.equal(store.rows.size, 0);

        await new SigningKeyManager(store, crypt, clock).generate(4, 'callback');
        await assert.rejects(keys.find(4, 'callback'), /HMAC_ENCRYPTION_SECRET/);
    } finally {
        if (saved === undefined) delete process.env.HMAC_ENCRYPTION_SECRET;
        else process.env.HMAC_ENCRYPTION_SECRET = saved;
    }
});
