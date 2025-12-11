import { Express, Request, Response } from 'express';
import { UserController } from '@api/v1/controllers/UserController';
import v1ApiRoutes from '@config/routes/v1.api.routes';

/**
 * API routes with Controllers
 */
export function initRoutesApi(app: Express) {
    const userController = new UserController();

    // Mapeo backend: vinculamos name → handler
    const controllerMapping: Record<string, any> = {
        getUserById: userController.getUserById.bind(userController),
        // Agrega más mappings según v1ApiRoutes
    };

    // Registramos las rutas dinámicamente según v1ApiRoutes
    v1ApiRoutes.forEach(route => {
        const handler = controllerMapping[route.name];
        if (!handler) {
            throw new Error(`no error handler for: ${route.name}`);
        }

        // Ruta pública, sin middleware auth
        app.get(route.path, handler);
    });

    // 404 específico para rutas /api no encontradas
    app.use((req: Request, res: Response) => {
        res.status(404).json({
            success: false,
            message: 'Endpoint not found',
        });
    });
}
