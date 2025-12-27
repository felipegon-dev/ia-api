import axios from 'axios';
import {CartItems, Payment, PaymentParameters} from "@application/services/payment/Payment";
import {PAYPAL_API_URLS, PAYPAL_CALLBACK_URLS, PAYPAL_ENDPOINTS} from "./PaypalUrls";
import {Crypt} from "@application/services/base/Crypt";
import {ValidationError} from "@application/errors/ValidationError";
import {PaymentError} from "@application/errors/PaymentError";
import {AppMode} from "@config/constants/AppMode";

export interface PaypalCredentials {
    client_id: string;
    client_secret: string;
}

export class Paypal implements Payment {
    private paymentUrl: string | null = null;
    private readonly mode: AppMode;
    private readonly apiBaseUrl: string;
    private paymentParams: PaymentParameters | null = null;
    private credentials: PaypalCredentials | null = null;

    constructor() {
        this.mode = process.env.NODE_ENV === AppMode.DEVELOPMENT ? AppMode.DEVELOPMENT : AppMode.PRODUCTION;
        this.apiBaseUrl = process.env.BASE_API_URL as string;
    }

    /** Solo guarda los parámetros y descifra el token */
    public async setParameters(paymentParams: PaymentParameters): Promise<void> {
        if (!paymentParams.token) throw new Error('Payment token is required');
        if (!paymentParams.cartItems || paymentParams.cartItems.length === 0) throw new ValidationError('Cart items are required');

        this.paymentParams = paymentParams;
        this.setCredentials(paymentParams);
    }

    private setCredentials(paymentParams: PaymentParameters) {
        const crypt = new Crypt(
            process.env.TOKEN_ALGORITHM as string,
            process.env.TOKEN_ENCRYPTION_SECRET as string
        );

        try {
            const decrypted = crypt.decrypt(paymentParams.token);
            const parsed: Partial<PaypalCredentials> = JSON.parse(decrypted);

            if (!parsed.client_id || !parsed.client_secret) {
                throw new ValidationError('Invalid decrypted PayPal credentials');
            }

            this.credentials = parsed as PaypalCredentials;
        } catch (err) {
            throw new PaymentError('Failed to decrypt PayPal credentials: ' + (err as Error).message);
        }
    }

    /** Devuelve la URL de pago, creando la orden si no existe */
    public async getPaymentUrl(): Promise<string> {
        await this.createOrder();

        if (!this.paymentUrl) throw new ValidationError('Payment URL not initialized');

        return this.paymentUrl;
    }

    /** Crear la orden en PayPal */
    private async createOrder(): Promise<void> {
        if (!this.paymentParams || !this.credentials) {
            throw new PaymentError('Payment parameters or credentials not set');
        }

        try {
            const accessToken = await this.generateAccessToken();
            const response = await this.createPaypalOrder(accessToken);
            this.paymentUrl = this.extractApprovalUrl(response);
        } catch (err) {
            throw new PaymentError('Failed to create PayPal order: ' + (err as Error).message);
        }
    }

    private getPaypalApiUrl(): string {
        return this.mode === AppMode.PRODUCTION ? PAYPAL_API_URLS.PROD : PAYPAL_API_URLS.SANDBOX;
    }

    // =========================
    // Private helper methods
    // =========================

    private async generateAccessToken(): Promise<string> {
        const tokenResponse = await axios.post(
            `${this.getPaypalApiUrl()}${PAYPAL_ENDPOINTS.OAUTH2_TOKEN}`,
            'grant_type=client_credentials',
            {
                auth: {
                    username: this.credentials!.client_id,
                    password: this.credentials!.client_secret,
                },
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            }
        );

        const accessToken = tokenResponse.data.access_token;
        if (!accessToken) throw new PaymentError('Failed to generate PayPal access token');

        return accessToken;
    }

    private async createPaypalOrder(accessToken: string) {
        const items = this.convert2PaypalItems();
        const currency = this.getCurrency();
        const totalAmount = this.getAmount();
        const description = this.paymentParams!.description

        try {
            return await axios.post(
                `${this.getPaypalApiUrl()}${PAYPAL_ENDPOINTS.CREATE_ORDER}`,
                {
                    intent: 'CAPTURE',
                    purchase_units: [
                        {
                            description,
                            amount: {
                                currency_code: currency,
                                value: totalAmount,
                                breakdown: {
                                    item_total: {
                                        currency_code: currency,
                                        value: totalAmount,
                                    },
                                },
                            },
                            items,
                        },
                    ],
                    application_context: {
                        return_url: `${this.apiBaseUrl}${PAYPAL_CALLBACK_URLS.SUCCESS}`,
                        cancel_url: this.paymentParams?.cancelUrl,
                        user_action: 'PAY_NOW',
                        brand_name: 'Your App Name',
                    },
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
        } catch (err: any) {
            console.error(err.response?.data || err.message);
            throw new PaymentError('PayPal order creation failed: ' + (err as Error).message);
        }
    }

    private convert2PaypalItems() {
        return this.paymentParams!.cartItems.map((item: CartItems) => ({
            name: item.title,
            quantity: item.quantity.toString(),
            unit_amount: {
                currency_code: item.currency,
                value: item.price.toFixed(2),
            },
        }));
    }

    private getAmount() {
        return this.paymentParams!.cartItems
            .reduce((sum, item) => sum + item.price * item.quantity, 0)
            .toFixed(2);
    }

    private getCurrency() {
        const currencies = new Set(this.paymentParams!.cartItems.map(i => i.currency));
        if (currencies.size > 1) throw new ValidationError('All cart items must have the same currency');
        return this.paymentParams!.cartItems[0].currency;
    }

    private extractApprovalUrl(response: any): string {
        try {
            const approvalLink = response.data.links.find((link: any) => link.rel === 'approve');
            if (!approvalLink) throw new PaymentError('PayPal approval URL not found');
            return approvalLink.href;
        } catch (err) {
            throw new PaymentError('Failed to extract approval URL from PayPal response: ' + (err as Error).message);
        }
    }
}
