import { Request, Response } from 'express';
import UserRepository from '@config/database/repository/UserRepository';
import logger from '@src/util/logger';

const ALLOWED_STATUSES = ['active', 'inactive', 'banned'] as const;

export class AdminUserController {
    constructor(private readonly userRepository: UserRepository) {}

    /** GET /api/v1/admin/user?email=... */
    get = async (req: Request, res: Response) => {
        const email = String(req.query.email ?? '').trim();
        if (!email) {
            res.status(400).json({ success: false, message: 'Missing param: email' });
            return;
        }
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        const { id, name, code, status, createdAt, updatedAt } = user.get({ plain: true }) as any;
        res.status(200).json({ success: true, data: { id, email, name, code, status, createdAt, updatedAt } });
    };

    /** PUT /api/v1/admin/user?email=... */
    update = async (req: Request, res: Response) => {
        const email = String(req.query.email ?? '').trim();
        if (!email) {
            res.status(400).json({ success: false, message: 'Missing param: email' });
            return;
        }
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        const { name, code, status } = req.body;
        const payload: Record<string, any> = {};

        if (name !== undefined)   payload.name   = String(name).trim();
        if (code !== undefined)   payload.code   = String(code).trim();
        if (status !== undefined) {
            if (!ALLOWED_STATUSES.includes(status)) {
                res.status(400).json({ success: false, message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` });
                return;
            }
            payload.status = status;
        }

        if (Object.keys(payload).length === 0) {
            res.status(400).json({ success: false, message: 'No fields to update' });
            return;
        }

        const uid = (user.get({ plain: true }) as any).id;
        logger.info({ id: uid, payload }, 'Admin: updating user profile');
        const updated = await this.userRepository.updateById(uid, payload as any);
        res.status(200).json({ success: true, data: updated });
    };
}
