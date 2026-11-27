const assert = require('node:assert/strict');
const { test } = require('node:test');
const { AdminDomainController } = require('../src/api/v1/controllers/AdminDomainController');

function response(email = 'merchant@example.com') {
    return {
        locals: { adminEmail: email },
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
}

function model(values) {
    return { get: () => ({ ...values }) };
}

test('creates an API user and associates a verified domain with the signed email', async () => {
    let ensured;
    let created;
    const users = {
        ensureForVerifiedEmail: async (email, name) => {
            ensured = { email, name };
            return model({ id: 8, email, code: 'merchant-code', status: 'active' });
        },
        findById: async () => null,
    };
    const domains = {
        findByDomain: async () => null,
        create: async (userId, domain) => {
            created = { userId, domain };
            return model({ id: 15, userId, domain });
        },
    };
    const controller = new AdminDomainController(users, domains);
    const res = response();

    await controller.create({ body: { domain: ' SHOP.EXAMPLE.COM ', name: 'Merchant' } }, res);

    assert.deepEqual(ensured, { email: 'merchant@example.com', name: 'Merchant' });
    assert.deepEqual(created, { userId: 8, domain: 'shop.example.com' });
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body.data, { id: 15, domain: 'shop.example.com' });
});

test('returns the existing domain idempotently for its owner and rejects another owner', async () => {
    const existing = model({ id: 15, userId: 8, domain: 'shop.example.com' });
    const users = {
        ensureForVerifiedEmail: async () => {
            throw new Error('Existing domains should not provision another account');
        },
        findById: async () => model({ id: 8, email: 'merchant@example.com' }),
    };
    const domains = {
        findByDomain: async () => existing,
        create: async () => {
            throw new Error('Existing domains must not be duplicated');
        },
    };
    const controller = new AdminDomainController(users, domains);
    const ownerResponse = response();

    await controller.create({ body: { domain: 'shop.example.com' } }, ownerResponse);

    assert.equal(ownerResponse.statusCode, 200);
    assert.deepEqual(ownerResponse.body.data, { id: 15, domain: 'shop.example.com' });

    users.findById = async () => model({ id: 9, email: 'other@example.com' });
    const otherResponse = response();
    await controller.create({ body: { domain: 'shop.example.com' } }, otherResponse);
    assert.equal(otherResponse.statusCode, 409);
});

test('rejects invalid domain input before creating an API account', async () => {
    const users = {
        ensureForVerifiedEmail: async () => {
            throw new Error('Invalid domains must not create accounts');
        },
    };
    const domains = { findByDomain: async () => null };
    const controller = new AdminDomainController(users, domains);
    const res = response();

    await controller.create({ body: { domain: 'https://127.0.0.1/admin' } }, res);

    assert.equal(res.statusCode, 400);
});
