import {PaymentRequestInterface, PaymentResponseInterface, PaymentType} from "@application/services/payment/Payment";
import {PaypalRequest} from "@application/services/payment/paypal/PaypalRequest";
import {PaypalResponse} from "@application/services/payment/paypal/PaypalResponse";

export class PaymentFactory {

    constructor(
        private paypalRequest: PaypalRequest,
        private paypalResponse: PaypalResponse
    ) {
    }

    getRequest(type: PaymentType): PaymentRequestInterface {
        switch (type) {
            case PaymentType.PAYPAL:
                return this.paypalRequest;
            default:
                throw new Error(`Unsupported payment method: ${type}`);
        }
    }

    getResponse(type: PaymentType): PaymentResponseInterface {
        switch (type) {
            case PaymentType.PAYPAL:
                return this.paypalResponse;
            default:
                throw new Error(`Unsupported payment method: ${type}`);
        }
    }
}