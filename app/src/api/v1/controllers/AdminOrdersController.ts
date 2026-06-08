import { Request, Response } from 'express';
import UserPaymentOrdersRepository from '@config/database/repository/UserPaymentOrdersRepository';
import logger from '@src/util/logger';

const JSON_FIELDS = ['cartItems', 'addressItems', 'shippingDetails', 'providerMetadata', 'providerAttemptsSync'] as const;

function parseJsonFields(order: Record<string, any>): Record<string, any> {
    const result = { ...order };
    for (const field of JSON_FIELDS) {
        if (result[field] && typeof result[field] === 'string') {
            try {
                result[field] = JSON.parse(result[field]);
            } catch {
                // leave as-is if not valid JSON
            }
        }
    }
    return result;
}

export class AdminOrdersController {
    constructor(private readonly ordersRepository: UserPaymentOrdersRepository) {}

    /** GET /api/v1/admin/orders?email=... */
    list = async (req: Request, res: Response) => {
        const email = String(req.query.email ?? '').trim();
        if (!email) {
            res.status(400).json({ success: false, message: 'Missing param: email' });
            return;
        }
        const orders = await this.ordersRepository.findAllAdminByEmail(email);
        res.status(200).json({ success: true, data: orders.map(parseJsonFields) });
    };

    /** GET /api/v1/admin/orders/:id */
    get = async (req: Request, res: Response) => {
        const id = parseInt(String(req.params.id), 10);
        if (isNaN(id)) {
            res.status(400).json({ success: false, message: 'Invalid id' });
            return;
        }
        const order = await this.ordersRepository.findById(id);
        if (!order) {
            res.status(404).json({ success: false, message: 'Order not found' });
            return;
        }
        res.status(200).json({ success: true, data: parseJsonFields((order as any).get({ plain: true })) });
    };
}
