const CALLBACK = '/api/v1/payment/callback';
export const SHARED_URLS = {
    PAYMENT_CALLBACK: CALLBACK,
    PAYMENT_CALLBACK_FULL: (process.env.CALLBACK_HOST ?? '') + CALLBACK
}
