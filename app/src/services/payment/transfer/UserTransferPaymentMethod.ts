import { BaseUserPaymentMethod } from '@src/services/payment/userPaymentMethod/BaseUserPaymentMethod';
import { AllowedAccessor, ACCESSOR_TOKEN, ACCESSOR_IA_WEBSITE } from '@src/services/payment/userPaymentMethod/UserPaymentMethodInterface';
import { PaymentType } from '@src/services/payment/Payment';

export class UserTransferPaymentMethod extends BaseUserPaymentMethod {

    /**
     * Transfer permite obtener credenciales también mediante token (ia-apps widget),
     * para mostrar el IBAN al usuario final tras seleccionar pago por transferencia.
     * save sigue siendo exclusivo de ia-website.
     */
    allowedAccess(): { get: AllowedAccessor[]; save: AllowedAccessor[] } {
        return {
            get: [ACCESSOR_TOKEN, ACCESSOR_IA_WEBSITE],
            save: [ACCESSOR_IA_WEBSITE],
        };
    }

    async save(email: string, data: Record<string, any>): Promise<{ success: boolean }> {
        const { iban, issuer } = data;
        const user = await this.resolveUser(email);
        const pm   = await this.resolvePaymentMethod(PaymentType.TRANSFER);
        await this.persist((user as any).id, (pm as any).id, { iban, issuer }, 'production');
        return { success: true };
    }

    async get(email: string): Promise<Record<string, any> | null> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) return null;
        const pm = await this.resolvePaymentMethod(PaymentType.TRANSFER);
        return this.fetchDecrypted((user as any).id, (pm as any).id);
    }

    /**
     * Para Transfer expone iban e issuer (sin datos sensibles).
     */
    async getFiltered(email: string): Promise<Record<string, any> | null> {
        const data = await this.get(email);
        if (!data) return null;
        const { iban, issuer, mode, status } = data as any;
        return { iban, issuer, mode, status };
    }
}
