import { Request, Response } from 'express';
import logger from '@src/util/logger';

/**
 * SecurityController
 *
 * Recibe alertas de seguridad desde el widget (ia-apps) y las registra
 * con el logger estructurado para que queden visibles en los logs de Docker.
 */
export class SecurityController {

    logTampering = async (req: Request, res: Response): Promise<void> => {
        const { productId, trusted, current, origin } = req.body ?? {};

        logger.error(
            {
                productId,
                trusted,
                current,
                origin,
                ip: req.ip,
                userAgent: req.headers['user-agent'] ?? 'unknown',
            },
            '⚠️  SECURITY_ALERT: Se ha detectado manipulación de datos de producto en el cliente'
        );

        res.status(200).json({ success: true, data: null });
    };
}

