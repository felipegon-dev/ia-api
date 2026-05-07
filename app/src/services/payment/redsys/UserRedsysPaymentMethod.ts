import { BaseUserPaymentMethod } from '@src/services/payment/userPaymentMethod/BaseUserPaymentMethod';
import { UserAttributes } from '@config/database/models';

export class UserRedsysPaymentMethod extends BaseUserPaymentMethod {
    async save(email: string, data: Record<string, any>): Promise<{ success: boolean }> {
        const { paymentMethodCode, merchantCode, secretKey, mode = 'production' } = data;
        const user = await this.resolveUser(email);
        const pm   = await this.resolvePaymentMethod(paymentMethodCode);
        await this.persist((user as any).id, (pm as any).id, { merchantCode, secretKey }, mode as 'development' | 'production');
        return { success: true };
    }
    async get(email: string, paymentMethodCode?: string): Promise<Record<string, any> | null> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) return null;
        const pm = await this.resolvePaymentMethod(paymentMethodCode!);
        return this.fetchDecrypted((user as any).id, (pm as any).id);
    }
}
