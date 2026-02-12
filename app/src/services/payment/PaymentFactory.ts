import {
    PaymentCallbackInterface,
    PaymentRequestInterface,
    PaymentSyncInterface,
    PaymentType
} from "@src/services/payment/Payment";
import {PaypalRequest} from "@src/services/payment/paypal/PaypalRequest";
import {PaypalSync} from "@src/services/payment/paypal/PaypalSync";
import {Transfer} from "@src/services/payment/transfer/Transfer";
import {RedSysRequest} from "@src/services/payment/redsys/RedSysRequest";
import {RedSysCallback} from "@src/services/payment/redsys/RedSysCallback";

export class PaymentFactory {

    constructor(
        private paypalRequest: PaypalRequest,
        private paypalSync: PaypalSync,
        private transfer: Transfer,
        private redSysRequest: RedSysRequest,
        private redSysCallback: RedSysCallback,
    ) {
    }

    getProviderRequest(type: PaymentType): PaymentRequestInterface {
        switch (type) {
            case PaymentType.PAYPAL:
                return this.paypalRequest;
            case PaymentType.TRANSFER:
                return this.transfer;
            case PaymentType.CARD:
                return this.redSysRequest.setPaymentType(PaymentType.CARD);
            case PaymentType.BIZUM:
                return this.redSysRequest.setPaymentType(PaymentType.BIZUM);
            default:
                throw new Error(`Unsupported payment method: ${type}`);
        }
    }

    // todo
    getProviderSync(type: PaymentType): PaymentSyncInterface {
        switch (type) {
            case PaymentType.PAYPAL:
                return this.paypalSync;
            default:
                throw new Error(`Unsupported payment method: ${type}`);
        }
    }

    getProviderCallback(data: any): PaymentCallbackInterface {

        if (
            data?.Ds_SignatureVersion &&
            data?.Ds_MerchantParameters &&
            data?.Ds_Signature
        ) {
            return this.redSysCallback.setParams(
                data.Ds_SignatureVersion,
                data.Ds_Signature,
                data.Ds_MerchantParameters,
            )
        }


        throw new Error(`Unsupported callback method: ${JSON.stringify(data)}`);
    }

}