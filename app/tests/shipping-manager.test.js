const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ShippingManager } = require('../src/services/user/ShippingManager');

const method = {
    method: 'STANDARD',
    code: 'STANDARD',
    price: 4.99,
    currency: 'EUR',
    deliveryTime: '3-5 days',
    active: true,
};

function manager() {
    return new ShippingManager({
        async findActiveByCodesCurrency(domainId, codes, currency) {
            assert.equal(domainId, 42);
            assert.deepEqual(codes, ['std-peninsula', 'standard']);
            assert.equal(currency, 'EUR');
            return { price: 4.99, freeShippingFrom: 50 };
        },
    });
}

test('accepts configured shipping and returns its amount', async () => {
    const shipping = await manager().get({}, 42, [method], 20);
    assert.equal(shipping.getAmount(), 4.99);
    assert.deepEqual(JSON.parse(shipping.getItemsJson()), [method]);
});

test('rejects a manipulated shipping price', async () => {
    await assert.rejects(
        manager().get({}, 42, [{ ...method, price: 0 }], 20),
        /Shipping method price not valid/,
    );
});

test('accepts free shipping when the threshold is reached', async () => {
    const shipping = await manager().get({}, 42, [{ ...method, price: 0 }], 50);
    assert.equal(shipping.getAmount(), 0);
});
