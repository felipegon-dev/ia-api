import { Express, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import {v1ApiRoutes, container } from '@config/v1.api.routes';
import { catchAsync } from './error-handler';
import {NotFoundError} from "@src/errors/NotFoundError";

const rateLimitedPaths = [
    '/api/v1/token',
    '/api/v1/payment',
    '/api/v1/payment/callback',
    '/api/v1/payment/callback/validate',
];

const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '50', 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests' }
});

export function initRoutesApi(app: Express) {
    v1ApiRoutes.forEach(route => {
        const {
            controller: ControllerClass,
            method,
            path,
            httpMethod = 'get',
            requires = [],
        } = route;

        // Dependencias
        const deps = requires.map(Dep => container.get(Dep));
        const controllerInstance = new ControllerClass(...deps);

        const rawHandler = controllerInstance[method]?.bind(controllerInstance);

        if (!rawHandler) {
            // ❗ Error de configuración → debe explotar al arrancar
            throw new NotFoundError(
                `No handler "${method}" in controller ${ControllerClass.name}`
            );
        }

        // 🔥 ENVOLTURA GLOBAL
        const handler = catchAsync(rawHandler);

        if (rateLimitedPaths.includes(path)) {
            app[httpMethod](path, limiter, handler);
        } else {
            app[httpMethod](path, handler);
        }
    });

    // 404 API
    app.use((req: Request, res: Response) => {
        res.status(404).json({
            success: false,
            message: 'Endpoint not found',
        });
    });
}
