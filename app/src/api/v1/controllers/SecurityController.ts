import { Request, Response } from 'express';

/**
 * SecurityController
 *
 * Recibe alertas de seguridad desde el widget (ia-apps) y las registra
 * en la consola de error de Node para que queden visibles en los logs de Docker.
 */
export class SecurityController {

    logTampering = async (req: Request, res: Response): Promise<void> => {
        const { productId, trusted, current, origin } = req.body ?? {};

        console.error(
            '[SECURITY_ALERT] ⚠️  Se ha detectado manipulación de datos de producto en el cliente',
            JSON.stringify(
                {
                    productId,
                    trusted,
                    current,
                    origin,
                    timestamp: new Date().toISOString(),
                    ip: req.ip,
                    userAgent: req.headers['user-agent'] ?? 'unknown',
                },
                null,
                2
            )
        );

        res.status(200).json({ success: true, data: null });
    };
}

