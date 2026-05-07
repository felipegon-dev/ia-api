import { Crypt } from '@src/services/base/Crypt';
import UserPaymentMethodRepository from '@config/database/repository/UserPaymentMethodRepository';
import UserRepository from '@config/database/repository/UserRepository';
import db from '@config/database/models';
import { v4 as uuidv4 } from 'uuid';
export abstract class BaseUserPaymentMethod {
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
        return user;
    }
    /** Busca el PaymentMethod por code */
    protected async resolvePaymentMethod(code: string): Promise<any> {
        const pm = await (db as any).PaymentMethod.findOne({
            where: { code, status: 'active' }
        });
        if (!pm) throw new Error(`Payment method not found: ${code}`);
        return pm;
    }
    /** Persiste (upsert) el token cifrado */
    protected async persist(userId: number, paymentMethodId: number, plainCredentials: object, mode: string): Promise<void> {
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
        const decrypted = this.crypt.decrypt(record.paymentToken);
        return { ...JSON.parse(decrypted), mode: record.mode, status: record.status };
    }
    abstract save(email: string, data: Record<string, any>): Promise<{ success: boolean }>;
    abstract get(email: string, paymentMethodCode: string): Promise<Record<string, any> | null>;
}
