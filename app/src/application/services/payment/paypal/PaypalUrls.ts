// PayPal base URLs según modo
export const PAYPAL_API_URLS = {
    PROD: 'https://api-m.paypal.com',
    SANDBOX: 'https://api-m.sandbox.paypal.com',
};

// Endpoints de PayPal (relativos a base URL)
export const PAYPAL_ENDPOINTS = {
    CREATE_ORDER: '/v2/checkout/orders',
    OAUTH2_TOKEN: '/v1/oauth2/token',
};

// URLs de callback en tu API
export const PAYPAL_CALLBACK_URLS = {
    SUCCESS: '/api/v1/payment/callback',
};
