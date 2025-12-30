import Token from "@src/services/base/Token";
import UserDomainValidation from "@src/services/user/UserDomainValidation";
import { CartManager } from "@src/services/cart/CartManager";
import { PaymentFactory } from "@src/services/payment/PaymentFactory";
import { AddressManager } from "@src/services/user/AddressManager";
import { PaymentManager } from "@src/services/payment/PaymentManager";
import { ShippingManager } from "@src/services/user/ShippingManager";
import { PaymentControllerValidation } from "@src/api/v1/validation/PaymentControllerValidation";

export class PaymentControllerInjection {
    constructor(
        public readonly token: Token,
        public readonly userDomainValidation: UserDomainValidation,
        public readonly cartManager: CartManager,
        public readonly paymentFactory: PaymentFactory,
        public readonly addressManager: AddressManager,
        public readonly paymentManager: PaymentManager,
        public readonly shippingManager: ShippingManager,
        public readonly paymentControllerValidation: PaymentControllerValidation
    ) {}
}
