const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Sequelize } = require('sequelize');
const db = require('../../config/database/models');
const { PaymentAttempt } = require('../../src/services/security/PaymentAttempt');
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function (id, ...args) {
    return id === '@config/v1.api.routes' ? { CALL_BACK_PATH: '/callback' } : originalLoad.call(this, id, ...args);
};
const { PaymentManager } = require('../../src/services/payment/PaymentManager');
Module._load = originalLoad;
const UserPaymentOrdersRepository = require('../../config/database/repository/UserPaymentOrdersRepository').default;

test('real MariaDB locks and durable snapshots recover concurrent attempts', async () => {
    assert.equal(process.env.IA_HMAC_TEST_DATABASE, '1', 'Run only against an isolated test database');
    const schema = await db.sequelize.getQueryInterface().showAllTables();
    assert.deepEqual(schema, [], 'Integration test requires an empty database');
    const migration = require('../../config/database/migrations/20261113130000-cart-authorizations');
    const orderMigration = require('../../config/database/migrations/20261117100000-cart-authorization-order');
    const uniqueMigration = require('../../config/database/migrations/20261125100000-unique-payment-provider-id');
    try {
        await db.sequelize.query(`CREATE TABLE userPaymentOrders (
            id INT AUTO_INCREMENT PRIMARY KEY, userDomainId INT NOT NULL, providerId VARCHAR(255) NOT NULL,
            userPaymentMethodId INT, providerMetadata JSON, providerAttemptsSync JSON,
            cartItems JSON, addressItems JSON, amount DECIMAL(12,2), shippingDetails JSON,
            description VARCHAR(255), status VARCHAR(32), createdAt DATETIME, updatedAt DATETIME
        )`);
        await migration.up(db.sequelize.getQueryInterface(), Sequelize);
        await db.sequelize.query("INSERT INTO userPaymentOrders (id,userDomainId,providerId) VALUES (42,1,'test-provider'),(43,2,'test-provider'),(44,1,'duplicate'),(45,1,'duplicate')");
        await db.sequelize.query(`INSERT INTO cartAuthorizations (domainId,authorizationId,requestHash,snapshot,createdAt) VALUES
            (1,'historic','hash','{"providerId":"test-provider"}',NOW()),
            (1,'ambiguous','hash','{"providerId":"duplicate"}',NOW()),
            (3,'other-domain','hash','{"providerId":"test-provider"}',NOW()),
            (1,'incomplete','hash',NULL,NOW())`);
        await orderMigration.up(db.sequelize.getQueryInterface(), Sequelize);
        const historic = await db.sequelize.query(
            "SELECT authorizationId, orderId FROM cartAuthorizations ORDER BY authorizationId",
            { type: Sequelize.QueryTypes.SELECT },
        );
        assert.deepEqual(historic.map(row => [row.authorizationId, row.orderId]), [
            ['ambiguous', null], ['historic', 42], ['incomplete', null], ['other-domain', null],
        ]);
        const authorization = randomUUID();
        let providerCalls = 0;
        let release;
        let entered;
        const waiting = new Promise(resolve => { release = resolve; });
        const started = new Promise(resolve => { entered = resolve; });
        const create = async () => {
            providerCalls++;
            entered();
            await waiting;
            return {
                providerId: 'test-provider', redirectUrl: 'https://provider.test/pay',
                providerMetadata: '{}', userPaymentMethodId: 1, cartItems: '[]',
                addressItems: '[]', shippingDetails: '[]', amount: 19.99, description: '',
            };
        };
        const first = PaymentAttempt.run(1, authorization, { amount: 1999 }, create, async (_, linkOrder) => {
            await linkOrder(42);
            throw new Error('simulated restart after provider snapshot');
        });
        await started;
        await assert.rejects(
            PaymentAttempt.run(1, authorization, { amount: 1999 }, create, async () => {}),
            /being processed/,
        );
        release();
        await assert.rejects(first, /simulated restart/);
        const [pending] = await db.sequelize.query(
            'SELECT orderId, redirectUrl FROM cartAuthorizations WHERE authorizationId = :authorization',
            { replacements: { authorization }, type: Sequelize.QueryTypes.SELECT },
        );
        assert.equal(pending.orderId, 42);
        assert.equal(pending.redirectUrl, null);
        const result = await PaymentAttempt.run(1, authorization, { amount: 1999 }, create, async (_, linkOrder) => linkOrder(42));
        assert.equal(result, 'https://provider.test/pay');
        assert.equal(providerCalls, 1);
        await assert.rejects(
            PaymentAttempt.run(1, authorization, { amount: 2000 }, create, async () => {}),
            /different payment/,
        );
        assert.equal(await PaymentAttempt.run(1, authorization, { amount: 1999 }, create, async () => {}), result);
        assert.equal(providerCalls, 1);
        await db.sequelize.query('DELETE FROM userPaymentOrders WHERE id=42');
        const [deleted] = await db.sequelize.query(
            'SELECT orderId FROM cartAuthorizations WHERE authorizationId = :authorization',
            { replacements: { authorization }, type: Sequelize.QueryTypes.SELECT },
        );
        assert.equal(deleted.orderId, null);

        await assert.rejects(uniqueMigration.up(db.sequelize.getQueryInterface(), Sequelize), /Duplicate payment provider IDs/);
        await db.sequelize.query('DELETE FROM userPaymentOrders WHERE id IN (44,45)');
        await uniqueMigration.up(db.sequelize.getQueryInterface(), Sequelize);

        const manager = new PaymentManager(null, null, new UserPaymentOrdersRepository(), null);
        const orderData = {
            userPaymentMethodId: 1, userDomainId: 1, providerId: '261125100000',
            providerMetadata: '{}', cartItems: '[]', addressItems: '{"buyer":"one"}',
            amount: 10, status: 'pending', shippingDetails: '[]', description: '',
        };
        const results = await Promise.allSettled([
            manager.saveOrderOnce(orderData.providerId, orderData),
            manager.saveOrderOnce(orderData.providerId, { ...orderData, addressItems: '{"buyer":"two"}' }),
        ]);
        assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
        const collision = results.find(result => result.status === 'rejected').reason;
        assert.equal(collision.name, 'SequelizeUniqueConstraintError');
        assert.ok(collision.errors.some(error => error.path === 'providerId' || error.path === 'userPaymentOrders_providerId_unique'));

        const retrySnapshot = { ...orderData, providerId: '261125100001', redirectUrl: 'https://provider.test/retry' };
        const retryAuthorization = randomUUID();
        let writes = 0;
        const persist = async (data, link, orderId) => {
            await manager.saveOrderOnce(data.providerId, data, orderId, link);
            if (++writes === 1) throw new Error('simulated queue failure');
        };
        await assert.rejects(PaymentAttempt.run(1, retryAuthorization, {}, async () => retrySnapshot, persist), /queue failure/);
        await PaymentAttempt.run(1, retryAuthorization, {}, async () => { throw new Error('created twice'); }, persist);
        const [count] = await db.sequelize.query(
            'SELECT COUNT(*) AS count FROM userPaymentOrders WHERE providerId = :providerId',
            { replacements: { providerId: retrySnapshot.providerId }, type: Sequelize.QueryTypes.SELECT },
        );
        assert.equal(count.count, 1);
        await assert.rejects(manager.saveOrderOnce('261125100002', {
            ...orderData, providerId: '261125100002',
        }, null, async () => { throw new Error('link failure'); }), /link failure/);
        const [rolledBack] = await db.sequelize.query(
            "SELECT COUNT(*) AS count FROM userPaymentOrders WHERE providerId = '261125100002'",
            { type: Sequelize.QueryTypes.SELECT },
        );
        assert.equal(rolledBack.count, 0);
    } finally {
        await migration.down(db.sequelize.getQueryInterface());
        await db.sequelize.getQueryInterface().dropTable('userPaymentOrders');
        if (PaymentAttempt.locks) await PaymentAttempt.locks.close();
        await db.sequelize.close();
    }
});
