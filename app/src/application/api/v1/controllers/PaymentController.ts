import { Request, Response } from 'express';
import Token from "@application/services/base/Token";
import {CartManager} from "@application/services/cart/CartManager";
import {PaymentFactory} from "@application/services/payment/PaymentFactory";

export class PaymentController {
    public constructor(
        private token: Token,
        private cartManager: CartManager,
        private paymentFactory: PaymentFactory,
    ) {
    }

    postPayment = async (req: Request, res: Response) => {
        const tokenPayload = this.token.validate(req);
        const cartManager = await this.cartManager.get(
            tokenPayload.userId,
            req.body.cartItems,
            req.body.paymentCode
        );

        const payment = this.paymentFactory.get(cartManager.getPaymentType());

        payment.setParameters({
            description: cartManager.getDescription(),
            cartItems: cartManager.getCartItems(),
            token: cartManager.getPaymentToken(),
        });


        res.status(200).json({
            success: true,
            data: await payment.getPaymentUrl()
        });
    }
}
