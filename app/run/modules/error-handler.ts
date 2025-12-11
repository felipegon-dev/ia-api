// error-handler.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de manejo de errores
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    const isDev = process.env.NODE_ENV !== 'production';

    res.locals.message = err.message;
    res.locals.error = isDev ? err : {};

    res.status(err.status || 500).json({
        success: false,
        message: err.message,
        ...(isDev && { stack: err.stack }),
    });
}
