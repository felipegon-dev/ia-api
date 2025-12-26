
export enum PaymentType {
    PAYPAL = 'paypal',
    REDSYS = 'redsys',
    BIZUM = 'bizum',
}

export interface PaymentParameters {
    description: string;
    cartItems: CartItems[];
    token: string,
}

export interface CartItems {
    id: string;
    quantity: number;
    price: number;
    title: string;
    currency: string;
}

export interface Payment {
    getPaymentUrl(): Promise<string>;

    setParameters(paymentParams: PaymentParameters): void;
}
