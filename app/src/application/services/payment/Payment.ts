
export enum PaymentType {
    PAYPAL = 'paypal',
    REDSYS = 'redsys',
    BIZUM = 'bizum',
}

export interface PaymentParameters {
    description: string;
    cartItems: CartItems[];
    paymentToken: string,
    cancelUrl: string,
    requestId?: string;
}

export interface CartItems {
    id: string;
    quantity: number;
    price: number;
    title: string;
    currency: string;
}

export interface PaymentRequestInterface {
    getPaymentUrl(): Promise<string>;
    setParameters(paymentParams: PaymentParameters): void;
}


export interface PaymentResponseInterface {
}