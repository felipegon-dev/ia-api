const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Transfer } = require('../src/services/payment/transfer/Transfer');

test('transfer reference uses the original date format and remains stable', async () => {
    const OriginalDate = global.Date;
    let seconds = 5;
    global.Date = class extends OriginalDate {
        constructor() { super(2026, 10, 17, 10, 11, seconds); }
    };
    try {
        const transfer = new Transfer();
        transfer.setParameters({ returnUrl: 'https://shop.test/checkout?success=true' });
        transfer.createOrder();
        assert.equal(transfer.getOrderId(), '261117101105');
        seconds = 6;
        assert.equal(transfer.getOrderId(), '261117101105');
        assert.equal(
            await transfer.getResultRedirectUrl(),
            'https://shop.test/checkout?success=true&providerId=261117101105',
        );
    } finally {
        global.Date = OriginalDate;
    }
});
