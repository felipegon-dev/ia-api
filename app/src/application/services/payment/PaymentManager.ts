import {PaymentMethodAttributes, UserExtended, UserPaymentMethodAttributes} from "@apptypes/UserExtended";
import {PaymentType} from "@application/services/payment/Payment";
import {ValidationError} from "@application/errors/ValidationError";
import UserData from "@application/services/base/UserData";
import Url from "@application/util/Url";
import UserPaymentOrdersRepository from "@domain/repository/UserPaymentOrdersRepository";

export class PaymentManager {
    private userPaymentMethod: (UserPaymentMethodAttributes & { paymentMethod: PaymentMethodAttributes; }) | undefined = undefined;

    constructor(
        private userData: UserData,
        private url: Url,
        private userPaymentOrdersRepository: UserPaymentOrdersRepository
    ) {}

    public get(user: UserExtended, paymentType: PaymentType): PaymentManager
    {
        if (!user.userPaymentMethods || user.userPaymentMethods.length === 0) {
            throw new ValidationError("User payment methods not loaded");
        }

        const userPaymentMethod = user.userPaymentMethods
            .filter((upm): upm is UserPaymentMethodAttributes & { paymentMethod: PaymentMethodAttributes } => !!upm.paymentMethod)
            .find(upm => upm.paymentMethod!.code === paymentType);

        if (!userPaymentMethod || userPaymentMethod.status !== "active" || !userPaymentMethod.paymentToken) {
            throw new ValidationError("Invalid payment method for user");
        }

        this.userPaymentMethod = userPaymentMethod;
        return this;
    }

    public getPaymentToken(): string {
        if (!this.userPaymentMethod?.paymentToken) {
            throw new ValidationError("Payment token is not set");
        }
        return this.userPaymentMethod.paymentToken;
    }

    public getPaymentType(): PaymentType {
        if (!this.userPaymentMethod?.paymentMethod?.code) {
            throw new ValidationError("Payment type is not set");
        }
        return this.userPaymentMethod.paymentMethod.code as PaymentType;
    }

    public getCancelUrl(): string {
        const cancelUrl = this.userData.get().lastUrl || this.userData.get().host;
        if (!cancelUrl) {
            throw new ValidationError("Cancel URL is not set");
        }
        return this.url.removeParamsFromUrl(cancelUrl + '?cancel=true');
    }

    public getReturnUrl() {
        const returnUrl = this.userData.get().lastUrl || this.userData.get().host;
        if (!returnUrl) {
            throw new ValidationError("Return URL is not set");
        }
        return this.url.removeParamsFromUrl(returnUrl + '?success=true');
    }

    public getHost(): string {
        const host = this.userData.get().host;
        if (!host) {
            throw new ValidationError("Host is not set");
        }
        return host;
    }

    async saveOrder(param: {
        userPaymentMethodId: number;
        providerId: string;
        providerMetadata: string;
        cartItems: string;
        addressItems: string;
        amount: number;
        status: string;
        shippingCost: number;
        description: string
    }) {
        await this.userPaymentOrdersRepository.create({
            userPaymentMethodId: param.userPaymentMethodId,
            providerId: param.providerId,
            providerMetadata: param.providerMetadata,
            cartItems: param.cartItems,
            addressItems: param.addressItems,
            amount: param.amount,
            shippingCost: param.shippingCost,
            description: param.description,
            status: param.status as 'pending' | 'completed' | 'failed' | 'cancelled',
        })
    }

    getUserPaymentMethodId(): number {
        console.log(this.userPaymentMethod)
        if (!this.userPaymentMethod?.id) throw new ValidationError("User payment method is not set");
        return this.userPaymentMethod.id
    }
}