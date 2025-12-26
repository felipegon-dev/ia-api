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
    CANCEL: '/api/v1/payment/callback?cancel=true',
};

// URL de retorno visible al usuario (frontend)
export const PAYPAL_RETURN_URLS = {
    TEST_SITE: 'https://test-site.com',
    PROD_SITE: 'https://yourproduction-site.com',
};
