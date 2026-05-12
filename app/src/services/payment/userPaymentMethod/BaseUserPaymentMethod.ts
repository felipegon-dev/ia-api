import { Crypt } from '@src/services/base/Crypt';
import UserPaymentMethodRepository from '@config/database/repository/UserPaymentMethodRepository';
import UserRepository from '@config/database/repository/UserRepository';
import db from '@config/database/models';
// @ts-ignore
import { v4 as uuidv4 } from 'uuid';
import { UserPaymentMethodInterface, AllowedAccessor, ACCESSOR_IA_WEBSITE } from '@src/services/payment/userPaymentMethod/UserPaymentMethodInterface';
import logger from '@src/util/logger';

export abstract class BaseUserPaymentMethod implements UserPaymentMethodInterface {
    constructor(
        protected userPaymentMethodRepository: UserPaymentMethodRepository,
        protected userRepository: UserRepository,
        protected crypt: Crypt
    ) {}
    /** Encuentra o crea el user por email */
    protected async resolveUser(email: string): Promise<any> {
        let user: any = await this.userRepository.findByEmail(email);
        if (!user) {
            await this.userRepository.create(email, email, '', uuidv4());
            user = await this.userRepository.findByEmail(email);
        }
        return user as any;
    }
    /** Busca el PaymentMethod por code */
    protected async resolvePaymentMethod(code: string): Promise<any> {
        const pm = await (db as any).PaymentMethod.findOne({
            where: { code, status: 'active' }
        });
        if (!pm) throw new Error(`Payment method not found: ${code}`);
        return pm as any;
    }
    /** Persiste (upsert) el token cifrado */
    protected async persist(userId: number, paymentMethodId: number, plainCredentials: object, mode: 'development' | 'production'): Promise<void> {
        const paymentToken = this.crypt.encrypt(JSON.stringify(plainCredentials));
        await this.userPaymentMethodRepository.upsert({
            userId,
            paymentMethodId,
            paymentToken,
            mode,
            status: 'active',
        });
    }
    /** Obtiene y descifra el token */
    protected async fetchDecrypted(userId: number, paymentMethodId: number): Promise<Record<string, any> | null> {
        const record = await this.userPaymentMethodRepository.findByUserAndPaymentMethod(userId, paymentMethodId);
        if (!record) return null;
        const r = record as any;

        try {
            const decrypted = this.crypt.decrypt(r.paymentToken);
            return { ...JSON.parse(decrypted), mode: r.mode, status: r.status };
        } catch (decryptErr) {
            try {
                const parsed = JSON.parse(r.paymentToken);
                logger.warn({ userId }, 'paymentToken is not encrypted. Using plain JSON fallback.');
                return { ...parsed, mode: r.mode, status: r.status };
            } catch {
                logger.error({ err: decryptErr, userId }, 'Cannot decrypt or parse paymentToken');
                return null;
            }
        }
    }
    abstract save(email: string, data: Record<string, any>): Promise<{ success: boolean }>;
    abstract get(email: string, paymentMethodCode?: string): Promise<Record<string, any> | null>;

    /**
     * Por defecto devuelve todos los campos de get() excepto `paymentToken`.
     * Subclases pueden sobreescribir para exponer/ocultar campos específicos.
     */
    async getFiltered(email: string, paymentMethodCode?: string): Promise<Record<string, any> | null> {
        const data = await this.get(email, paymentMethodCode);
        if (!data) return null;
        const { paymentToken, ...filtered } = data;
        return filtered;
    }

    /**
     * Por defecto sólo ia-website puede acceder.
     * Transfer sobreescribe get para añadir 'token'.
     */
    allowedAccess(): { get: AllowedAccessor[]; save: AllowedAccessor[] } {
        return {
            get: [ACCESSOR_IA_WEBSITE],
            save: [ACCESSOR_IA_WEBSITE],
        };
    }
}
