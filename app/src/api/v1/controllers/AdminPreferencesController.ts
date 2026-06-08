import { Request, Response } from 'express';
import DomainPreferencesRepository from '@config/database/repository/DomainPreferencesRepository';
import logger from '@src/util/logger';

export class AdminPreferencesController {
    constructor(private readonly preferencesRepository: DomainPreferencesRepository) {}

    /** GET /api/v1/admin/preferences?email=... */
    get = async (req: Request, res: Response) => {
        const email = String(req.query.email ?? '').trim();
        if (!email) {
            res.status(400).json({ success: false, message: 'Missing param: email' });
            return;
        }
        const prefs = await this.preferencesRepository.findByEmail(email);
        if (!prefs) {
            res.status(404).json({ success: false, message: 'No preferences found for this user' });
            return;
        }
        res.status(200).json({ success: true, data: prefs });
    };

    /** PUT /api/v1/admin/preferences?email=... */
    update = async (req: Request, res: Response) => {
        const email = String(req.query.email ?? '').trim();
        if (!email) {
            res.status(400).json({ success: false, message: 'Missing param: email' });
            return;
        }
        const { callbackPaymentsUrl } = req.body;
        const url = callbackPaymentsUrl?.trim() || null;

        logger.info({ email, url }, 'Admin: updating preferences callbackPaymentsUrl');
        const updated = await this.preferencesRepository.updateByEmail(email, url);
        if (!updated) {
            res.status(404).json({ success: false, message: 'No preferences found for this user' });
            return;
        }
        res.status(200).json({ success: true, data: updated });
    };
}
