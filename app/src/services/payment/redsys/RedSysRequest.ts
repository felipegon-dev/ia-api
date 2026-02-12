import {
    PaymentParameters,
    PaymentRequestInterface, PaymentType
} from "@src/services/payment/Payment";
import { Crypt } from "@src/services/base/Crypt";
import { PaymentError } from "@src/errors/PaymentError";
import { ValidationError } from "@src/errors/ValidationError";
import { isProductionMode } from "@config/constants/AppMode";
import crypto from "crypto";

/**
 * Credenciales Redsys
 */
interface RedSysCredentials {
    merchantCode: string; // FUC
    secretKey: string;    // Clave Redsys (BASE64)
}

/**
 * URLs oficiales Redsys
 */
const REDSYS_URLS = {
    PROD: 'https://sis.redsys.es/sis/realizarPago',
    SANDBOX: 'https://sis-t.redsys.es:25443/sis/realizarPago',
};

export class RedSysRequest implements PaymentRequestInterface {

    private paymentParams: PaymentParameters | null = null;
    private credentials: RedSysCredentials | null = null;
    private orderId: string | null = null;
    private metadata: {
        Ds_SignatureVersion: string;
        Ds_MerchantParameters: string;
        Ds_Signature: string;
    } | null = null;

    // =========================
    // PUBLIC
    // =========================
    private paymentType: PaymentType = PaymentType.CARD;

    async setParameters(paymentParams: PaymentParameters): Promise<void> {
        if (!paymentParams.paymentToken) {
            throw new ValidationError('Payment token is required');
        }

        if (!paymentParams.cartItems?.length) {
            throw new ValidationError('Cart items are required');
        }

        this.paymentParams = paymentParams;
        this.setCredentials(paymentParams);
    }

    /**
     * Devuelve la URL del TPV + params Redsys por GET
     * El frontend los reenviará por POST
     */
    async getResultRedirectUrl(): Promise<string> {
        if (!this.metadata) {
            throw new ValidationError('Payment not initialized');
        }

        const baseUrl = isProductionMode
            ? REDSYS_URLS.PROD
            : REDSYS_URLS.SANDBOX;

        const query = new URLSearchParams({
            Ds_SignatureVersion: this.metadata.Ds_SignatureVersion,
            Ds_MerchantParameters: this.metadata.Ds_MerchantParameters,
            Ds_Signature: this.metadata.Ds_Signature,
        });

        return `${baseUrl}?${query.toString()}`;
    }

    /**
     * Genera Order + Params + Firma
     */
    async createOrder(): Promise<void> {
        if (!this.paymentParams || !this.credentials) {
            throw new PaymentError('Payment parameters or credentials not set');
        }

        this.orderId = this.generateOrderId();

        let redsysParams;
        if (this.paymentType === PaymentType.BIZUM) {
            redsysParams = this.buildRedSysBizumParams();
        } else if (this.paymentType === PaymentType.CARD) {
            redsysParams = this.buildRedSysCardParams();
        } else {
            throw new ValidationError('No supported payment type for RedSys: '+ this.paymentType);
        }

        const merchantParameters = this.encodeMerchantParameters(redsysParams);
        const signature = this.sign(merchantParameters);

        this.metadata = {
            Ds_SignatureVersion: 'HMAC_SHA256_V1',
            Ds_MerchantParameters: merchantParameters,
            Ds_Signature: signature,
        };
    }

    getOrderId(): string {
        if (!this.orderId) {
            throw new ValidationError('Order ID not available');
        }
        return this.orderId;
    }

    getMetadata(): string {
        if (!this.metadata) {
            throw new ValidationError('Metadata not available');
        }
        return JSON.stringify(this.metadata);
    }

    // =========================
    // PRIVATE
    // =========================

    /**
     * Descifra credenciales Redsys
     */
    private setCredentials(paymentParams: PaymentParameters) {
        const crypt = new Crypt(
            process.env.TOKEN_ALGORITHM!,
            process.env.TOKEN_ENCRYPTION_SECRET!
        );

        try {
            const decrypted = crypt.decrypt(paymentParams.paymentToken);
            const parsed = JSON.parse(decrypted);
            console.log('request parsed token:', parsed)

            if (!parsed.merchantCode || !parsed.secretKey) {
                throw new ValidationError('Invalid RedSys credentials');
            }

            this.credentials = parsed;
        } catch {
            throw new PaymentError('Failed to decrypt RedSys credentials');
        }
    }

    /**
     * Parámetros Redsys (JSON plano)
     */
    private buildRedSysCardParams(): Record<string, string> {
        const amount = Math.round(this.paymentParams!.amount * 100);

        return {
            DS_MERCHANT_AMOUNT: amount.toString(),
            DS_MERCHANT_ORDER: this.orderId!,
            DS_MERCHANT_MERCHANTCODE: this.credentials!.merchantCode,
            DS_MERCHANT_CURRENCY: '978',
            DS_MERCHANT_TRANSACTIONTYPE: '0',
            DS_MERCHANT_TERMINAL: '1',
            DS_MERCHANT_MERCHANTURL: this.paymentParams!.callbackUrl,
            DS_MERCHANT_URLOK: this.paymentParams!.returnUrl!,
            DS_MERCHANT_URLKO: this.paymentParams!.cancelUrl,
            DS_MERCHANT_MERCHANTNAME: this.paymentParams!.host,
            DS_MERCHANT_PAYMENT_TOKEN: this.paymentParams?.paymentToken as string
        };
    }

    private buildRedSysBizumParams(): Record<string, string> {
        const amount = Math.round(this.paymentParams!.amount * 100);

        return {
            DS_MERCHANT_AMOUNT: amount.toString(),
            DS_MERCHANT_ORDER: this.orderId!,
            DS_MERCHANT_MERCHANTCODE: this.credentials!.merchantCode,
            DS_MERCHANT_CURRENCY: '978',
            DS_MERCHANT_TRANSACTIONTYPE: '0',
            DS_MERCHANT_TERMINAL: '1',

            // 🔥 BIZUM
            DS_MERCHANT_PAYMETHODS: 'z',
            DS_MERCHANT_PRODUCTDESCRIPTION: 'Compra en ' + this.paymentParams!.host,
            DS_MERCHANT_CONSUMERLANGUAGE: '001',

            DS_MERCHANT_MERCHANTURL: this.paymentParams!.callbackUrl,
            DS_MERCHANT_URLOK: this.paymentParams!.returnUrl!,
            DS_MERCHANT_URLKO: this.paymentParams!.cancelUrl,
            DS_MERCHANT_MERCHANTNAME: this.paymentParams!.host,
        };
    }

    /**
     * JSON → Base64
     */
    private encodeMerchantParameters(params: Record<string, string>): string {
        return Buffer
            .from(JSON.stringify(params))
            .toString('base64');
    }

    private sign(merchantParameters: string): string {
        if (!this.credentials) {
            throw new PaymentError('RedSys credentials not set');
        }
        if (!this.orderId) {
            throw new PaymentError('Order ID not set');
        }

        // 1️⃣ Clave secreta decodificada de Base64
        const key = Buffer.from(this.credentials.secretKey, 'base64');

        // 2️⃣ Order rellenado a múltiplo de 8 bytes (ZERO PADDING)
        const orderBuffer = Buffer.from(this.orderId, 'utf8');
        const blockSize = 8;
        const paddedLength = Math.ceil(orderBuffer.length / blockSize) * blockSize;
        const orderPadded = Buffer.alloc(paddedLength);
        orderBuffer.copy(orderPadded);

        // 3️⃣ 3DES-CBC con IV a ceros (IGUAL que PHP)
        const iv = Buffer.alloc(8, 0);
        const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
        cipher.setAutoPadding(false); // 🔥 CLAVE
        const keyOrder = Buffer.concat([
            cipher.update(orderPadded),
            cipher.final()
        ]);

        // 4️⃣ HMAC SHA256 final
        return crypto
            .createHmac('sha256', keyOrder)
            .update(merchantParameters)
            .digest('base64');
    }

    /**
     * Order ID válido Redsys (4–12 dígitos)
     */
    private generateOrderId(): string {
        return Date.now().toString().slice(-12);
    }

    setPaymentType(paymentType: PaymentType): this {
        this.paymentType = paymentType;
        return this;
    }
}
