import { Request, Response } from 'express';
import { BaseAuthController } from "@src/api/v1/controllers/BaseAuthController";
import { UserPaymentOrderStatus } from "@config/database/vo/UserPaymentOrderStatus";
import {PaymentControllerInjection} from "@src/api/v1/injection/PaymentControllerInjection";
export class PaymentController extends BaseAuthController {

    private readonly inject: PaymentControllerInjection;

    constructor(inject: PaymentControllerInjection) {
        super(inject.token, inject.userDomainValidation);
        this.inject = inject;
    }

    postPayment = async (req: Request, res: Response) => {
        this.inject.paymentControllerValidation.validateRequest(req);

        const user = await this.validate(req);

        const cartManager = await this.inject.cartManager.get(user, req.body.cartItems);
        const addressManager = await this.inject.addressManager.get(user, req.body.addressItems);
        const shippingManager = await this.inject.shippingManager.get(user, req.body.shippingMethods);
        const paymentManager = this.inject.paymentManager.get(user, req.body.paymentCode);

        const providerRequest = this.inject.paymentFactory
            .getProviderRequest(paymentManager.getPaymentType());

        providerRequest.setParameters({
            cartItems: cartManager.getCartItems(),
            currency: cartManager.getCurrency(),
            amount: cartManager.getAmount(),
            paymentToken: paymentManager.getPaymentToken(),
            cancelUrl: paymentManager.getCancelUrl(),
            returnUrl: paymentManager.getReturnUrl(),
            host: paymentManager.getHost(),
        });

        await providerRequest.createOrder();

        await paymentManager.saveOrder({
            userPaymentMethodId: paymentManager.getUserPaymentMethodId(),
            userDomainId: this.inject.userDomainValidation.getDomainId(),
            providerId: providerRequest.getOrderId(),
            providerMetadata: providerRequest.getMetadata(),
            cartItems: cartManager.getCartItemsJson(),
            addressItems: addressManager.getItemsJson(),
            amount: cartManager.getAmount(),
            status: UserPaymentOrderStatus.PENDING.Value,
            shippingDetails: shippingManager.getItemsJson(),
            description: req.body.description,
        });

        res.status(200).json({
            success: true,
            data: await providerRequest.getResultRedirectUrl()
        });
    };

    callbackPayment = async (req: Request, res: Response) => {
        console.log("===== PayPal Callback Received =====");
        console.log("Full request body:", JSON.stringify(req.body, null, 2));
        res.status(200).send('OK');
    };

    syncPayment = async (req: Request, res: Response) => {
        console.log("===== PayPal SYNC Received =====");
        console.log("Full request body:", JSON.stringify(req.body, null, 2));
        res.status(200).send('OK');
    };
}
