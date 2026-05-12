import { Request, Response, NextFunction } from 'express';
import { AppError } from '@src/errors/AppError';
import { isDevelopmentMode } from "@config/constants/AppMode";
import logger from '@src/util/logger';

export const catchAsync =
    (fn: Function) =>
        (req: Request, res: Response, next: NextFunction) =>
            Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Manejador global de errores de Express.
 * DEBE tener 4 parámetros para que Express lo reconozca como error handler.
 */
export function errorHandler(
    err: any,
    req: Request,
    res: Response,
    _next: NextFunction,
): void {
    // Siempre loguear con nivel adecuado
    if (err instanceof AppError && err.status < 500) {
        // Errores controlados 4xx → warn (no son bugs del servidor)
        logger.warn(
            { err, method: req.method, url: req.url, status: err.status },
            err.message,
        );
    } else {
        // Errores 5xx o desconocidos → error
        logger.error(
            { err, method: req.method, url: req.url },
            err?.message ?? 'Unhandled error',
        );
    }

    // Errores controlados (nuestros AppError)
    if (err instanceof AppError) {
        res.status(err.status).json({
            success: false,
            message: err.message,
            code: err.code,
            ...(isDevelopmentMode && { stack: err.stack }),
            ...(err instanceof Error && 'details' in err
                ? { details: (err as any).details }
                : {}),
        });
        return;
    }

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(isDevelopmentMode && { stack: err?.stack }),
    });
}
