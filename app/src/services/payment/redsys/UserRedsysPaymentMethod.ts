import { BaseUserPaymentMethod } from '@src/services/payment/userPaymentMethod/BaseUserPaymentMethod';
export class UserRedsysPaymentMethod extends BaseUserPaymentMethod {
    async save(email: string, data: Record<string, any>): Promise<{ success: boolean }> {
        const { paymentMethodCode, merchantCode, secretKey, mode = 'production' } = data;
        const user = await this.resolveUser(email);
        const pm   = await this.resolvePaymentMethod(paymentMethodCode);
        await this.persist(user.id, pm.id, { merchantCode, secretKey }, mode);
        return { success: true };
    }
    async get(email: string, paymentMethodCode: string): Promise<Record<string, any> | null> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) return null;
        const pm = await this.resolvePaymentMethod(paymentMethodCode);
        return this.fetchDecrypted(user.id, pm.id);
    }
}
