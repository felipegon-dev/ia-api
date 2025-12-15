import { Express, Request, Response } from 'express';
import v1ApiRoutes, { container } from '@config/v1.api.routes';
import { catchAsync } from './error-handler';
import {NotFoundError} from "@application/errors/NotFoundError";

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

        app[httpMethod](path, handler);
    });

    // 404 API
    app.use((req: Request, res: Response) => {
        res.status(404).json({
            success: false,
            message: 'Endpoint not found',
        });
    });
}
