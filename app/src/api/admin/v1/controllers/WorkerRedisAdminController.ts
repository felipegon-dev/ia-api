import { Request, Response } from 'express';
import RedisManager from '@src/services/queue/RedisManager';
import { AdminBasicAuthService } from '@src/api/admin/v1/security/AdminBasicAuthService';
import { UnauthorizedError } from '@src/errors/UnauthorizedError';

export class WorkerRedisAdminController {
    constructor(
        private readonly redisManager: RedisManager,
        private readonly adminBasicAuthService: AdminBasicAuthService,
    ) {}

    /** POST /api/admin/v1/worker-events/invalidate */
    invalidateByProviderId = async (req: Request, res: Response) => {
        try {
            this.adminBasicAuthService.validate(req);
        } catch (error) {
            if (error instanceof UnauthorizedError) {
                res.setHeader('WWW-Authenticate', 'Basic realm="ia-admin"');
            }
            throw error;
        }

        const providerId = String(req.body?.providerId ?? req.query?.providerId ?? '').trim();
        if (!providerId) {
            res.status(400).json({ success: false, message: 'Missing param: providerId' });
            return;
        }

        const result = await this.redisManager.invalidateEventsByOrderId(providerId);
        if (result.matched === 0) {
            res.status(404).json({
                success: false,
                message: `No worker events found for providerId ${providerId}`,
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                providerId,
                ...result,
            },
        });
    };
}
