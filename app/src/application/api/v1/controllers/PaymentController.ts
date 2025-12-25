import { Request, Response } from 'express';
import Token from "@application/services/base/Token";
import {CartManager} from "@application/services/cart/CartManager";
import {PaymentManager} from "@application/services/payment/paymentManager";

export class PaymentController {
    public constructor(
        private token: Token,
        private cartManager: CartManager,
        private paymentManager: PaymentManager,
    ) {
    }

    // todo

    postPayment = async (req: Request, res: Response) => {
        const tokenPayload = this.token.validate(req);
        const cartManager = this.cartManager.validateCartItems(tokenPayload.userId, req.body.items);
        //this.paymentManager.validatePayment()
        res.status(200).json({
            success: true,
            data: this.paymentManager.getPaymentUrl()
        });
    }
}
