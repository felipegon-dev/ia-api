import { Request, Response, NextFunction } from 'express';
import { AppError } from '@application/errors/AppError';
import {AppMode} from "@config/constants/AppMode";


export const catchAsync =
    (fn: Function) =>
        (req: Request, res: Response, next: NextFunction) =>
            Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(
    err: any,
    res: Response,
) {
    const isDev = process.env.NODE_ENV !== AppMode.PRODUCTION;

    console.error(err);

    // Errores controlados (nuestros)
    if (err instanceof AppError) {
        return res.status(err.status).json({
            success: false,
            message: err.message,
            code: err.code,
            ...(isDev && { stack: err.stack }),
            ...(err instanceof Error && 'details' in err
                ? { details: (err as any).details }
                : {}),
        });
    }

    return res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(isDev && { stack: err?.stack }),
    });
}
