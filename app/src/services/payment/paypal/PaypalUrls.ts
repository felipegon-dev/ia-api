import {SHARED_URLS} from "@config/constants/sharedUrls";

export const PAYPAL_API_URLS = {
    PROD: 'https://api-m.paypal.com',
    SANDBOX: 'https://api-m.sandbox.paypal.com',
};

// Endpoints de PayPal (relativos a base URL)
export const PAYPAL_ENDPOINTS = {
    CREATE_ORDER: '/v2/checkout/orders',
    OAUTH2_TOKEN: '/v1/oauth2/token',
};
