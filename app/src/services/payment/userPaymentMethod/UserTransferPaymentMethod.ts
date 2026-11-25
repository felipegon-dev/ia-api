import { BaseUserPaymentMethod } from './BaseUserPaymentMethod';
export class UserTransferPaymentMethod extends BaseUserPaymentMethod {
    /** code fijo para transferencia bancaria */
    private static readonly CODE = 'transfer';
    async save(email: string, data: Record<string, any>): Promise<{ success: boolean }> {
        const { iban } = data;
        const user = await this.resolveUser(email);
        const pm   = await this.resolvePaymentMethod(UserTransferPaymentMethod.CODE);
        await this.persist(user.id, pm.id, { iban }, 'production');
        return { success: true };
    }
    async get(email: string): Promise<Record<string, any> | null> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) return null;
        const pm = await this.resolvePaymentMethod(UserTransferPaymentMethod.CODE);
        return this.fetchDecrypted(user.id, pm.id);
    }
}
