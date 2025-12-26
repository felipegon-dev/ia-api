import {PaymentType} from "@application/services/payment/Payment";
import {Paypal} from "@application/services/payment/paypal/Paypal";

export class PaymentFactory {

    get(type: PaymentType) {
        switch (type) {
            case PaymentType.PAYPAL:
                return new Paypal();
            default:
                throw new Error(`Unsupported payment method: ${type}`);
        }
    }
}