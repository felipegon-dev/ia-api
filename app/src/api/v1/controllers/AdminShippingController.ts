import { Request, Response } from 'express';
import DomainShippingRepository from '@config/database/repository/DomainShippingRepository';
import logger from '@src/util/logger';

export class AdminShippingController {
    constructor(private readonly shippingRepository: DomainShippingRepository) {}

    private getEmail(req: Request, res: Response): string | null {
        const email = String(req.query.email ?? '').trim();
        if (!email) {
            res.status(400).json({ success: false, message: 'Missing param: email' });
            return null;
        }
        return email;
    }

    /** GET /api/v1/admin/shipping-methods?email=... */
    list = async (req: Request, res: Response) => {
        const email = this.getEmail(req, res);
        if (!email) return;
        const methods = await this.shippingRepository.findAllByEmail(email);
        res.status(200).json({ success: true, data: methods });
    };

    /** GET /api/v1/admin/shipping-methods/:id?email=... */
    get = async (req: Request, res: Response) => {
        const email = this.getEmail(req, res);
        if (!email) return;
        const id = parseInt(String(req.params.id), 10);
        if (isNaN(id)) { res.status(400).json({ success: false, message: 'Invalid id' }); return; }
        const method = await this.shippingRepository.findByIdAndEmail(id, email);
        if (!method) { res.status(404).json({ success: false, message: 'Shipping method not found' }); return; }
        res.status(200).json({ success: true, data: method });
    };

    /** PUT /api/v1/admin/shipping-methods/:id?email=... */
    update = async (req: Request, res: Response) => {
        const email = this.getEmail(req, res);
        if (!email) return;
        const id = parseInt(String(req.params.id), 10);
        if (isNaN(id)) { res.status(400).json({ success: false, message: 'Invalid id' }); return; }

        const { name, code, price, currency, deliveryTimeDescription, freeShippingFrom, active, defaultMethod } = req.body;

        const allowedCodes = ['std-peninsula', 'std-baleares', 'pickup'];
        if (code !== undefined && !allowedCodes.includes(code)) {
            res.status(400).json({ success: false, message: `Invalid code. Allowed: ${allowedCodes.join(', ')}` });
            return;
        }

        const payload: Record<string, any> = {};
        if (name !== undefined)                    payload.name = String(name);
        if (code !== undefined)                    payload.code = String(code);
        if (price !== undefined)                   payload.price = parseFloat(price);
        if (currency !== undefined)                payload.currency = String(currency).toUpperCase();
        if (deliveryTimeDescription !== undefined) payload.deliveryTimeDescription = deliveryTimeDescription || null;
        if (freeShippingFrom !== undefined)        payload.freeShippingFrom = freeShippingFrom !== '' && freeShippingFrom !== null ? parseFloat(freeShippingFrom) : null;
        if (active !== undefined)                  payload.active = active === true || active === 'true' || active === 1;
        if (defaultMethod !== undefined)           payload.defaultMethod = defaultMethod === true || defaultMethod === 'true' || defaultMethod === 1;

        if (Object.keys(payload).length === 0) {
            res.status(400).json({ success: false, message: 'No fields to update' }); return;
        }

        logger.info({ id, email, payload }, 'Admin: updating shipping method');
        const updated = await this.shippingRepository.updateByIdAndEmail(id, email, payload as any);
        if (!updated) { res.status(404).json({ success: false, message: 'Shipping method not found' }); return; }
        res.status(200).json({ success: true, data: updated });
    };
}
