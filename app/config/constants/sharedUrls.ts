import {isDevelopmentMode} from "@config/constants/AppMode";

const CALLBACK = '/api/v1/payment/callback';
export const SHARED_URLS = {
    PAYMENT_CALLBACK: CALLBACK,
    PAYMENT_CALLBACK_FULL:  isDevelopmentMode ?
        'https://ungraved-intercoracoid-christoper.ngrok-free.dev'+CALLBACK :
        process.env.BASE_API_URL+CALLBACK

}