import { Crypt } from '@src/services/base/Crypt';
import UserPaymentMethodRepository from '@config/database/repository/UserPaymentMethodRepository';
import UserRepository from '@config/database/repository/UserRepository';
import { UserRedsysPaymentMethod } from '@src/services/payment/redsys/UserRedsysPaymentMethod';
import { UserTransferPaymentMethod } from '@src/services/payment/transfer/UserTransferPaymentMethod';
import { BaseUserPaymentMethod } from '@src/services/payment/userPaymentMethod/BaseUserPaymentMethod';
import { PaymentType } from '@src/services/payment/Payment';

/** Tipos que corresponden a Redsys (card y bizum comparten el mismo handler) */
const REDSYS_TYPES: ReadonlySet<string> = new Set([PaymentType.CARD, PaymentType.BIZUM]);

export class UserPaymentMethodFactory {
    constructor(
        private userPaymentMethodRepository: UserPaymentMethodRepository,
        private userRepository: UserRepository,
        private crypt: Crypt
    ) {}

    /** Devuelve el handler concreto según el PaymentType */
    public create(type: PaymentType): BaseUserPaymentMethod {
        if (REDSYS_TYPES.has(type)) {
            return new UserRedsysPaymentMethod(
                this.userPaymentMethodRepository,
                this.userRepository,
                this.crypt
            );
        }
        if (type === PaymentType.TRANSFER) {
            return new UserTransferPaymentMethod(
                this.userPaymentMethodRepository,
                this.userRepository,
                this.crypt
            );
        }
        throw new Error(`Unknown payment method type: ${type}`);
    }

    /** Lista métodos de pago activos para un usuario concreto */
    public async getPaymentMethodsByEmail(email: string) {
        return this.userPaymentMethodRepository.getPaymentMethodsByEmail(email);
    }

    /** Lista todos los métodos de pago activos */
    public async getPaymentMethods() {
        return this.userPaymentMethodRepository.getAllPaymentMethods();
    }
}
