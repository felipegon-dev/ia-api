import { Request, Response } from 'express';
import Token from "@application/services/base/Token";
import {CartManager} from "@application/services/cart/CartManager";
import {PaymentFactory} from "@application/services/payment/PaymentFactory";
import {BaseAuthController} from "@application/api/v1/controllers/BaseAuthController";
import UserDomainValidation from "@application/services/user/UserDomainValidation";

export class PaymentController extends BaseAuthController{

    constructor(
        protected token: Token,
        protected userDomainValidation: UserDomainValidation,
        private cartManager: CartManager,
        private paymentFactory: PaymentFactory,
    ) {
        super(token, userDomainValidation);
    }

    postPayment = async (req: Request, res: Response) => {
        const user = await this.validate(req);
        const cartManager = await this.cartManager.get(
            user,
            req.body.cartItems,
            req.body.paymentCode
        );

        const paymentRequest = this.paymentFactory.getRequest(cartManager.getPaymentType());

        paymentRequest.setParameters({
            description: cartManager.getDescription(),
            cartItems: cartManager.getCartItems(),
            paymentToken: cartManager.getPaymentToken(),
            cancelUrl: cartManager.getCancelUrl(),
            requestId: cartManager.getRequestId(),
        });

        res.status(200).json({
            success: true,
            data: await paymentRequest.getPaymentUrl()
        });
    }

    callbackPayment = async (req: Request, res: Response) => {
        const body = req.body;

        console.log(req)
        console.log("===== PayPal Callback Received =====");
        console.log("Full request body:", JSON.stringify(body, null, 2));
    }
}
