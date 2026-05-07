import { Request, Response } from 'express';
import { UserPaymentMethodFactory } from '@src/services/payment/userPaymentMethod/UserPaymentMethodFactory';
import { PaymentType } from '@src/services/payment/Payment';
export class UserPaymentMethodController {
    constructor(private factory: UserPaymentMethodFactory) {}
    /** GET /api/v1/admin/payment-methods */
    getPaymentMethods = async (req: Request, res: Response) => {
        try {
            const methods = await this.factory.getPaymentMethods();
            res.status(200).json({ success: true, data: methods });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    // ── Generic credentials ──────────────────────────────────────────────
    /** GET /api/v1/admin/payment-methods/:method?email=...&code=... */
    getCredentials = async (req: Request, res: Response) => {
        try {
            const method = req.params.method as PaymentType;
            const { email, code } = req.query as { email: string; code?: string };
            if (!email) {
                res.status(400).json({ success: false, message: 'Missing param: email' });
                return;
            }
            const data = await (this.factory.create(method) as any).get(email, code);
            if (!data) { res.status(404).json({ success: false, message: 'No credentials found' }); return; }
            res.status(200).json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
    /** POST /api/v1/admin/payment-methods/:method */
    saveCredentials = async (req: Request, res: Response) => {
        try {
            const method = req.params.method as PaymentType;
            const { email, ...credentials } = req.body;
            if (!email) {
                res.status(400).json({ success: false, message: 'Missing field: email' });
                return;
            }
            const result = await this.factory.create(method).save(email, credentials);
            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
}
