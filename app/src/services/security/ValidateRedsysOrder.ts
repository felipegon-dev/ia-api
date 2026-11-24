import { ValidationError } from '@src/errors/ValidationError';
import { moneyMinor } from './HmacProtocol';

export function validateRedsysOrder(
    received: Record<string, unknown>, amount: unknown, metadata: unknown,
): void {
    let expected: Record<string, string>;
    try {
        const provider = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
        if (!provider || typeof provider.Ds_MerchantParameters !== 'string') {
            throw new Error('Missing original Redsys parameters');
        }
        expected = JSON.parse(Buffer.from(provider.Ds_MerchantParameters, 'base64').toString('utf8'));
    } catch {
        throw new ValidationError('Stored Redsys order metadata is invalid');
    }
    if (typeof received.Ds_Amount !== 'string' || !/^\d+$/.test(received.Ds_Amount) ||
        Number(received.Ds_Amount) !== moneyMinor(amount) ||
        Number(expected.DS_MERCHANT_AMOUNT) !== moneyMinor(amount) ||
        received.Ds_Order !== expected.DS_MERCHANT_ORDER ||
        received.Ds_Currency !== expected.DS_MERCHANT_CURRENCY ||
        received.Ds_MerchantCode !== expected.DS_MERCHANT_MERCHANTCODE ||
        String(received.Ds_Terminal).replace(/^0+/, '') !== String(expected.DS_MERCHANT_TERMINAL).replace(/^0+/, '')) {
        throw new ValidationError('Redsys confirmation does not match the stored order');
    }
}
