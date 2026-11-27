const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { RedSysCallback } = require('../src/services/payment/redsys/RedSysCallback');
const { Crypt } = require('../src/services/base/Crypt');

process.env.TOKEN_ALGORITHM = 'aes-256-gcm';
process.env.TOKEN_ENCRYPTION_SECRET = 'test-configuration-only-not-a-real-secret';
const secret = crypto.randomBytes(24);
const token = new Crypt(process.env.TOKEN_ALGORITHM, process.env.TOKEN_ENCRYPTION_SECRET)
    .encrypt(JSON.stringify({ merchantCode: '999', secretKey: secret.toString('base64') }));

function notification(order = '123456789012', change = {}, tamperSignature = false) {
    const body = {
        Ds_Order: order, Ds_Amount: '1999', Ds_Currency: '978', Ds_MerchantCode: '999',
        Ds_Terminal: '001', Ds_Response: '0000', ...change,
    };
    const params = Buffer.from(JSON.stringify(body)).toString('base64');
    const padded = Buffer.alloc(Math.ceil(order.length / 8) * 8);
    padded.write(order);
    const cipher = crypto.createCipheriv('des-ede3-cbc', secret, Buffer.alloc(8));
    cipher.setAutoPadding(false);
    const derived = Buffer.concat([cipher.update(padded), cipher.final()]);
    const signature = crypto.createHmac('sha256', derived).update(params).digest('base64');
    return ['HMAC_SHA256_V1', tamperSignature ? 'invalid' : signature, params];
}
let metadataReads = 0;
const repo = {
    getPaymentTokenByProviderId: async () => token,
    async getOrderByProviderId(id) {
        metadataReads++;
        const values = {
            amount: '19.99',
            providerMetadata: JSON.stringify({ Ds_MerchantParameters: Buffer.from(JSON.stringify({
                DS_MERCHANT_ORDER: id, DS_MERCHANT_AMOUNT: '1999', DS_MERCHANT_CURRENCY: '978',
                DS_MERCHANT_MERCHANTCODE: '999', DS_MERCHANT_TERMINAL: '1',
            })).toString('base64') }),
        };
        return { get: field => values[field] };
    },
};
test('only an authentic Redsys confirmation with the exact stored amount completes', async () => {
    const factory = new RedSysCallback(repo);
    const result = await factory.setParams(...notification()).getPaymentStatus();
    assert.equal(result.status.Value, 'completed');
    const before = metadataReads;
    await assert.rejects(factory.setParams(...notification(undefined, {}, true)).getPaymentStatus(), /signature/);
    assert.equal(metadataReads, before);
    for (const change of [{ Ds_Amount: '2000' }, { Ds_Currency: '840' }, { Ds_MerchantCode: 'foreign' }]) {
        await assert.rejects(factory.setParams(...notification(undefined, change)).getPaymentStatus(), /stored order/);
    }
});
test('concurrent Redsys callbacks retain their own parameters', async () => {
    const factory = new RedSysCallback(repo);
    const one = factory.setParams(...notification('123456789012'));
    const two = factory.setParams(...notification('123456789013'));
    const results = await Promise.all([one.getPaymentStatus(), two.getPaymentStatus()]);
    assert.deepEqual(results.map(value => value.order), ['123456789012', '123456789013']);
});
