import {
    PaymentRequestInterface,
    PaymentSyncInterface,
    PaymentType
} from "@src/services/payment/Payment";
import {PaypalRequest} from "@src/services/payment/paypal/PaypalRequest";
import {PaypalSync} from "@src/services/payment/paypal/PaypalSync";

export class PaymentFactory {

    constructor(
        private paypalRequest: PaypalRequest,
        private paypalSync: PaypalSync
    ) {
    }

    getProviderRequest(type: PaymentType): PaymentRequestInterface {
        switch (type) {
            case PaymentType.PAYPAL:
                return this.paypalRequest;
            default:
                throw new Error(`Unsupported payment method: ${type}`);
        }
    }

    getProviderSync(type: PaymentType): PaymentSyncInterface {
        switch (type) {
            case PaymentType.PAYPAL:
                return this.paypalSync;
            default:
                throw new Error(`Unsupported payment method: ${type}`);
        }
    }

    getProviderCallback(type: PaymentType): PaymentSyncInterface {
        // todo
         throw new Error(`Unsupported payment method: ${type}`);
    }
}