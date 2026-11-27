const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateRedsysOrder } = require('../src/services/security/ValidateRedsysOrder');
const params = {
    DS_MERCHANT_AMOUNT: '1999', DS_MERCHANT_ORDER: '123', DS_MERCHANT_CURRENCY: '978',
    DS_MERCHANT_MERCHANTCODE: '999', DS_MERCHANT_TERMINAL: '1',
};
const metadata = JSON.stringify({ Ds_MerchantParameters: Buffer.from(JSON.stringify(params)).toString('base64') });
const received = { Ds_Amount: '1999', Ds_Order: '123', Ds_Currency: '978', Ds_MerchantCode: '999', Ds_Terminal: '001' };
test('Redsys binds signed response to the exact stored amount and provider', () => {
    validateRedsysOrder(received, '19.99', metadata);
    for (const change of [{ Ds_Amount: '1998' }, { Ds_Currency: '840' }, { Ds_Order: 'other' },
        { Ds_MerchantCode: 'other' }, { Ds_Terminal: '2' }]) {
        assert.throws(() => validateRedsysOrder({ ...received, ...change }, '19.99', metadata));
    }
    assert.throws(() => validateRedsysOrder(received, '20.00', metadata));
});
