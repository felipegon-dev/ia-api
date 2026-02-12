import {Currency} from "@config/database/vo/Currency";
import {UserPaymentOrderStatus} from "@config/database/vo/UserPaymentOrderStatus";

export enum PaymentType {
    PAYPAL = 'paypal',
    CARD = 'card',
    BIZUM = 'bizum',
    TRANSFER = 'transfer',
}

export interface PaymentParameters {
    cartItems: CartItems[];
    currency: Currency,
    amount: number,
    paymentToken: string,
    cancelUrl: string,
    returnUrl?: string,
    host: string,
    callbackUrl: string
}

export interface CartItems {
    id: string;
    quantity: number;
    price: number;
    title: string;
    currency: string;
}

export interface PaymentRequestInterface {
    createOrder(): void;
    getResultRedirectUrl(): Promise<string>;
    setParameters(paymentParams: PaymentParameters): void;
    getOrderId(): string;
    getMetadata(): string;
}

export interface PaymentCallbackResult {
    order: string,
    amount: number,
    responseCode: string,
    status: UserPaymentOrderStatus,
}
export interface PaymentCallbackInterface {
    getPaymentStatus(): Promise<PaymentCallbackResult>;
}

export interface PaymentSyncInterface {
}