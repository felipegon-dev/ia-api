import {PaymentCallbackInterface, PaymentCallbackResult} from "@src/services/payment/Payment";
import crypto from 'crypto'
import {Crypt} from "@src/services/base/Crypt";
import {RedSysError} from "@src/errors/RedSysError";
import PaymentRepository from "@config/database/repository/PaymentRepository";
import {UserPaymentOrderStatus} from "@config/database/vo/UserPaymentOrderStatus";

export interface RedSysMerchantParams {
    Ds_Amount: string
    Ds_Order: string
    Ds_MerchantCode: string
    Ds_Currency: string
    Ds_Response: string
    Ds_TransactionType: string
    Ds_SecurePayment?: string
    Ds_AuthorisationCode?: string
    Ds_Card_Country?: string
    Ds_Date?: string
    Ds_Hour?: string
    Ds_PaymentToken?: string
    [key: string]: any
}

export enum RedSysResponseCode {
    // ✅ Pagos aceptados
    AUTHORIZED = '0000',
    AUTHORIZED_ALT = '000',       // alternativa que a veces usan
    AUTHORIZED_0900 = '0900',
    AUTHORIZED_0099 = '0099',

    // 🔴 Pagos denegados
    CARD_EXPIRED = '0101',
    CARD_EXCEPTION = '0102',
    INSUFFICIENT_FUNDS = '0116',
    CARD_NOT_OPERATIVE = '0129',
    INVALID_CARD = '0180',
    DENIED_GENERIC = '0190',
    BLACKLISTED_CARD = '0202',
    ISSUER_UNAVAILABLE = '0912',
    COMMERCE_NOT_REGISTERED = '0904',

    // ⚠️ Otros
    UNKNOWN = '9999'
}


export class RedSysCallback implements PaymentCallbackInterface {
    private signatureVersion: string | null = null;
    private signature: string |null = null;
    private merchantParams: string |null = null;

    constructor(private readonly paymentRepo: PaymentRepository) {
    }

    async getPaymentStatus(): Promise<PaymentCallbackResult> {
        const params = this.getMerchantParams();
        const secretKey = await this.getSecretKey(params.Ds_Order);
        this.validateSignature(secretKey);

        const responseCode = parseInt(params.Ds_Response, 10)

        return {
            order: params.Ds_Order,
            amount: parseInt(params.Ds_Amount, 10) / 100,
            responseCode: params.Ds_Response as RedSysResponseCode,
            status: (responseCode <= 99) ? UserPaymentOrderStatus.COMPLETED : UserPaymentOrderStatus.FAILED,
        }
    }
    
    public setParams(signatureVersion: string, signature: string, merchantParams: string): this {
        this.signatureVersion = signatureVersion;
        this.signature = signature;
        this.merchantParams = merchantParams;
        return this;
    }

    private getMerchantParams(): RedSysMerchantParams {
        if (!this.merchantParams) {
            throw new RedSysError('Merchant parameters not set')
        }

        try {
            const decoded = Buffer.from(this.merchantParams, 'base64').toString('utf8')
            console.log('merchant params:', decoded)
            return JSON.parse(decoded) as RedSysMerchantParams
        } catch (error) {
            throw new RedSysError('Invalid merchant parameters')
        }
    }

    private validateSignature(secretKeyBase64: string): void {
        if (!this.signature || !this.signatureVersion || !this.merchantParams) {
            throw new RedSysError('Signature parameters not set')
        }

        if (this.signatureVersion !== 'HMAC_SHA256_V1') {
            throw new RedSysError('Unsupported signature version')
        }

        const merchantParams = this.getMerchantParams()
        const order = merchantParams.Ds_Order

        if (!order) {
            throw new RedSysError('Ds_Order not found in merchant parameters')
        }

        if (!secretKeyBase64) {
            throw new RedSysError('Redsys secret key not configured')
        }

        // 1️⃣ Clave Redsys (Base64 → Buffer)
        const key = Buffer.from(secretKeyBase64, 'base64')

        // 2️⃣ Padding ZERO a múltiplo de 8
        const orderBuffer = Buffer.from(order, 'utf8')
        const blockSize = 8
        const paddedLength = Math.ceil(orderBuffer.length / blockSize) * blockSize
        const orderPadded = Buffer.alloc(paddedLength)
        orderBuffer.copy(orderPadded)

        // 3️⃣ 3DES-CBC con IV 0
        const iv = Buffer.alloc(8, 0)
        const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv)
        cipher.setAutoPadding(false)

        const keyOrder = Buffer.concat([
            cipher.update(orderPadded),
            cipher.final()
        ])

        // 4️⃣ HMAC SHA256
        const calculatedBase64 = crypto
            .createHmac('sha256', keyOrder)
            .update(this.merchantParams)
            .digest('base64')

        // 🔥 CONVERSIÓN A BASE64URL (CLAVE DEL PROBLEMA)
        const calculatedSignature = calculatedBase64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')

        const receivedSignature = this.signature.replace(/=+$/, '')

        // 5️⃣ Comparación segura
        if (calculatedSignature !== receivedSignature) {
            throw new RedSysError('Invalid Redsys signature')
        }
    }

    private async getSecretKey(orderId: string): Promise<string> {
        const token = await this.paymentRepo.getPaymentTokenByProviderId(orderId);

        if (!token) {
            throw new RedSysError('Payment token not found for order: ' + orderId);
        }

        const crypt = new Crypt(
            process.env.TOKEN_ALGORITHM!,
            process.env.TOKEN_ENCRYPTION_SECRET!
        );

        try {
            const decrypted = crypt.decrypt(token);
            const parsed = JSON.parse(decrypted);

            if (!parsed.merchantCode || !parsed.secretKey) {
                throw new RedSysError('Invalid RedSys credentials on callback');
            }

            return parsed.secretKey;
        } catch {
            throw new RedSysError('Failed to decrypt RedSys credentials');
        }
    }
}
