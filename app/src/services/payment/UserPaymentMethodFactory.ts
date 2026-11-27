import { Crypt } from '@src/services/base/Crypt';
import UserPaymentMethodRepository from '@config/database/repository/UserPaymentMethodRepository';
import UserRepository from '@config/database/repository/UserRepository';
import { UserRedsysPaymentMethod } from './userPaymentMethod/UserRedsysPaymentMethod';
import { UserTransferPaymentMethod } from './userPaymentMethod/UserTransferPaymentMethod';
import { BaseUserPaymentMethod } from './userPaymentMethod/BaseUserPaymentMethod';
import db from '@config/database/models';
export type PaymentMethodType = 'redsys' | 'transfer';
export class UserPaymentMethodFactory {
    constructor(
        private userPaymentMethodRepository: UserPaymentMethodRepository,
        private userRepository: UserRepository,
        private crypt: Crypt
    ) {}
    /** Devuelve el handler concreto según el tipo */
    public create(type: PaymentMethodType): BaseUserPaymentMethod {
        switch (type) {
            case 'redsys':
                return new UserRedsysPaymentMethod(
                    this.userPaymentMethodRepository,
                    this.userRepository,
                    this.crypt
                );
            case 'transfer':
                return new UserTransferPaymentMethod(
                    this.userPaymentMethodRepository,
                    this.userRepository,
                    this.crypt
                );
            default:
                throw new Error(`Unknown payment method type: ${type}`);
        }
    }
    /** Lista todos los métodos de pago activos */
    public async getPaymentMethods() {
        return this.userPaymentMethodRepository.getAllPaymentMethods();
    }
}
