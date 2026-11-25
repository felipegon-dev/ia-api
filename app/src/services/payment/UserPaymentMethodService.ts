import { Crypt } from '@src/services/base/Crypt';
import UserPaymentMethodRepository from '@config/database/repository/UserPaymentMethodRepository';
import UserRepository from '@config/database/repository/UserRepository';
import { v4 as uuidv4 } from 'uuid';
import db from '@config/database/models';
export interface RedsysCredentials {
    merchantCode: string;
    secretKey: string;
}
export interface SavePaymentMethodParams {
    email: string;
    paymentMethodCode: string;
    credentials: RedsysCredentials;
    mode?: string;
}
export class UserPaymentMethodService {
    constructor(
        private userPaymentMethodRepository: UserPaymentMethodRepository,
        private userRepository: UserRepository,
        private crypt: Crypt
    ) {}
    public async getPaymentMethods() {
        return this.userPaymentMethodRepository.getAllPaymentMethods();
    }
    public async saveRedsys(params: SavePaymentMethodParams) {
        let user: any = await this.userRepository.findByEmail(params.email);
        if (!user) {
            const code = uuidv4();
            await this.userRepository.create(params.email, params.email, '', code);
            user = await this.userRepository.findByEmail(params.email);
        }
        const paymentMethod = await (db as any).PaymentMethod.findOne({
            where: { code: params.paymentMethodCode, status: 'active' }
        });
        if (!paymentMethod) {
            throw new Error(`Payment method not found: ${params.paymentMethodCode}`);
        }
        const encryptedToken = this.crypt.encrypt(
            JSON.stringify({
                merchantCode: params.credentials.merchantCode,
                secretKey: params.credentials.secretKey,
            })
        );
        await this.userPaymentMethodRepository.upsert({
            userId: user.id,
            paymentMethodId: paymentMethod.id,
            paymentToken: encryptedToken,
            mode: params.mode ?? 'production',
            status: 'active',
        });
        return { success: true };
    }
}
