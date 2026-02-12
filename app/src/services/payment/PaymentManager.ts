import {PaymentMethodAttributes, UserExtended, UserPaymentMethodAttributes} from "@apptypes/UserExtended";
import {PaymentType} from "@src/services/payment/Payment";
import {ValidationError} from "@src/errors/ValidationError";
import UserData from "@src/services/base/UserData";
import Url from "@src/util/Url";
import UserPaymentOrdersRepository from "@config/database/repository/UserPaymentOrdersRepository";
import {UserPaymentOrderStatus} from "@config/database/vo/UserPaymentOrderStatus";
import PaymentRepository from "@config/database/repository/PaymentRepository";
import {isDevelopmentMode} from "@config/constants/AppMode";
import {CALL_BACK_BASE_URL_DEV, CALL_BACK_PATH} from "@config/v1.api.routes";

export class PaymentManager {
    private userPaymentMethod: (UserPaymentMethodAttributes & { paymentMethod: PaymentMethodAttributes; }) | undefined = undefined;

    constructor(
        private userData: UserData,
        private url: Url,
        private userPaymentOrdersRepository: UserPaymentOrdersRepository,
        private paymentRepo: PaymentRepository
    ) {}

    public get(user: UserExtended, paymentType: PaymentType): PaymentManager
    {
        if (!user.userPaymentMethods || user.userPaymentMethods.length === 0) {
            throw new ValidationError("User payment methods not loaded");
        }

        const userPaymentMethod = user.userPaymentMethods
            .filter((upm): upm is UserPaymentMethodAttributes & { paymentMethod: PaymentMethodAttributes } => !!upm.paymentMethod)
            .find(upm => upm.paymentMethod!.code === paymentType);

        if (!userPaymentMethod || userPaymentMethod.status !== "active") {
            throw new ValidationError("Invalid payment method for user");
        }

        this.userPaymentMethod = userPaymentMethod;
        return this;
    }

    public getPaymentToken(): string {
        return this.userPaymentMethod?.paymentToken as string;
    }

    public getPaymentType(): PaymentType {
        if (!this.userPaymentMethod?.paymentMethod?.code) {
            throw new ValidationError("Payment type is not set");
        }
        return this.userPaymentMethod.paymentMethod.code as PaymentType;
    }

    public getCancelUrl(paymentType: PaymentType): string {
        const cancelUrl = this.userData.get().lastUrl || this.userData.get().host;
        if (!cancelUrl) {
            throw new ValidationError("Cancel URL is not set");
        }
        return this.url.removeParamsFromUrl(cancelUrl + '?method='+paymentType+'&cancel=true');
    }

    public getReturnUrl(paymentType: PaymentType) {
        const returnUrl = this.userData.get().lastUrl || this.userData.get().host;
        if (!returnUrl) {
            throw new ValidationError("Return URL is not set");
        }
        return this.url.removeParamsFromUrl(returnUrl + '?method='+paymentType+'&success=true');
    }

    public getHost(): string {
        const host = this.userData.get().host;
        if (!host) {
            throw new ValidationError("Host is not set");
        }
        return host;
    }

    public async saveOrder(param: {
        userPaymentMethodId: number;
        userDomainId: number,
        providerId: string;
        providerMetadata: string;
        cartItems: string;
        addressItems: string;
        amount: number;
        status: string;
        shippingDetails: string;
        description: string
    }) {
        await this.userPaymentOrdersRepository.create({
            userPaymentMethodId: param.userPaymentMethodId,
            userDomainId: param.userDomainId,
            providerId: param.providerId,
            providerMetadata: param.providerMetadata,
            cartItems: param.cartItems,
            addressItems: param.addressItems,
            amount: param.amount,
            shippingDetails: param.shippingDetails,
            description: param.description,
            status: param.status as 'pending' | 'completed' | 'failed' | 'cancelled',
        })
    }

    public getUserPaymentMethodId(): number {
        if (!this.userPaymentMethod?.id) throw new ValidationError("User payment method is not set");
        return this.userPaymentMethod.id
    }

    public async updateOrderStatus(order: string, userPaymentOrderStatus: UserPaymentOrderStatus): Promise<void> {
        this.paymentRepo.updateOrderStatus(order, userPaymentOrderStatus.Value);
    }

    public getCallbackUrl(): string {
        let baseUrl = '';
        if (isDevelopmentMode) {
            baseUrl = CALL_BACK_BASE_URL_DEV;
        } else {
            baseUrl = process.env.VITE_API_URL as string;
        }

        return baseUrl+CALL_BACK_PATH;

    }
}