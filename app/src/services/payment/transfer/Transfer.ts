import {PaymentParameters, PaymentRequestInterface, PaymentType} from "@src/services/payment/Payment";

export class Transfer implements PaymentRequestInterface {
    private paymentParams: PaymentParameters | null = null;

    private orderId: string | null = null;

    createOrder(): void {
        this.orderId = this.getOrderId();
    }

    async getResultRedirectUrl(): Promise<string> {
        if (!this.paymentParams?.returnUrl) {
            throw new Error('returnUrl no está definido');
        }
        return this.paymentParams.returnUrl + '&providerId=' + this.getOrderId();
    }

    getMetadata(): string {
        return JSON.stringify(this.paymentParams);
    }

    setParameters(paymentParams: PaymentParameters): void {
        this.paymentParams = paymentParams;
    }

    getOrderId(): string {
        const now = new Date();

        const yy = String(now.getFullYear()).slice(-2);
        const MM = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');

        return `${yy}${MM}${dd}${hh}${mm}${ss}`;
    }
}