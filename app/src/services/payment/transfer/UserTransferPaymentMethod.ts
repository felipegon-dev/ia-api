import { BaseUserPaymentMethod } from '@src/services/payment/userPaymentMethod/BaseUserPaymentMethod';
import { PaymentType } from '@src/services/payment/Payment';
export class UserTransferPaymentMethod extends BaseUserPaymentMethod {
    async save(email: string, data: Record<string, any>): Promise<{ success: boolean }> {
        const { iban } = data;
        const user = await this.resolveUser(email);
        const pm   = await this.resolvePaymentMethod(PaymentType.TRANSFER);
        await this.persist(user.id, pm.id, { iban }, 'production');
        return { success: true };
    }
    async get(email: string): Promise<Record<string, any> | null> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) return null;
        const pm = await this.resolvePaymentMethod(PaymentType.TRANSFER);
        return this.fetchDecrypted(user.id, pm.id);
    }
}
