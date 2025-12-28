import {Currency} from "@config/database/vo/Currency";

export enum PaymentType {
    PAYPAL = 'paypal',
    REDSYS = 'redsys',
    BIZUM = 'bizum',
}

export interface PaymentParameters {
    cartItems: CartItems[];
    currency: Currency,
    amount: number,
    paymentToken: string,
    cancelUrl: string,
    returnUrl?: string,
    host: string,
}

export interface CartItems {
    id: string;
    quantity: number;
    price: number;
    title: string;
    currency: string;
}

export interface PaymentRequestInterface {
    createOrder(): Promise<void>;
    getResultRedirectUrl(): Promise<string>;
    setParameters(paymentParams: PaymentParameters): void;
    getOrderId(): string;
    getMetadata(): string;
}

export interface PaymentSyncInterface {
}