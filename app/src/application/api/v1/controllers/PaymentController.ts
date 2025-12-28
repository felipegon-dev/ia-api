import { Request, Response } from 'express';
import Token from "@application/services/base/Token";
import {CartManager} from "@application/services/cart/CartManager";
import {PaymentFactory} from "@application/services/payment/PaymentFactory";
import {BaseAuthController} from "@application/api/v1/controllers/BaseAuthController";
import UserDomainValidation from "@application/services/user/UserDomainValidation";
import {AddressManager} from "@application/services/user/AddressManager";
import {PaymentManager} from "@application/services/payment/PaymentManager";

export class PaymentController extends BaseAuthController{

    constructor(
        protected token: Token,
        protected userDomainValidation: UserDomainValidation,
        private cartManager: CartManager,
        private paymentFactory: PaymentFactory,
        private addressManager: AddressManager,
        private paymentManager: PaymentManager,
    ) {
        super(token, userDomainValidation);
    }

    postPayment = async (req: Request, res: Response) => {
        const user = await this.validate(req);
        const cartManager = await this.cartManager.get(user, req.body.cartItems);
        const addressManager = await this.addressManager.get(user, req.body.addressItems);
        const paymentManager = this.paymentManager.get(user, req.body.paymentCode);
        const providerRequest = this.paymentFactory.getProviderRequest(paymentManager.getPaymentType());

        providerRequest.setParameters({
            cartItems: cartManager.getCartItems(),
            paymentToken: paymentManager.getPaymentToken(),
            cancelUrl: paymentManager.getCancelUrl(),
            returnUrl: paymentManager.getCancelUrl(),
            host: paymentManager.getHost(),
        });

        await providerRequest.createOrder();

        await paymentManager.saveOrder({
            userPaymentMethodId: paymentManager.getUserPaymentMethodId(),
            providerId: providerRequest.getOrderId(),
            providerMetadata: providerRequest.getMetadata(),
            cartItems: cartManager.getCartItemsJson(),
            addressItems: addressManager.getAddressItemsJson(),
            amount: cartManager.getAmount(),
            status: 'pending', // the order is pending until confirmed with sync or callback
            shippingCost: addressManager.getShippingCost(),
            description: cartManager.getDescription(),
        });


        res.status(200).json({
            success: true,
            data: await providerRequest.getResultRedirectUrl()
        });
    }

    callbackPayment = async (req: Request, res: Response) => {
        const body = req.body;

        console.log(req)
        console.log("===== PayPal Callback Received =====");
        console.log("Full request body:", JSON.stringify(body, null, 2));
    }

    syncPayment = async (req: Request, res: Response) => {
        const body = req.body;

        console.log(req)
        console.log("===== PayPal SYNC Received =====");
        console.log("Full request body:", JSON.stringify(body, null, 2));
    }
}
