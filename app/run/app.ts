import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import express from 'express';
import pinoHttp from 'pino-http';
import cors from 'cors';
import {isDevelopmentMode, isProductionMode} from "@config/constants/AppMode";
import { initRoutesApi } from './modules/routes-api';
import { errorHandler } from './modules/error-handler';
import logger from '@src/util/logger';

const app = express();

// La app corre detrás de Nginx + Traefik — confiar en 1 nivel de proxy
// para que express-rate-limit y req.ip usen la IP real del cliente
// (cabecera X-Forwarded-For inyectada por Nginx)
app.set('trust proxy', 1);

if (isDevelopmentMode) {
    logger.info('Running in development mode');
} else if (isProductionMode) {
    logger.info('Running in production mode');
} else {
    logger.warn({ nodeEnv: process.env.NODE_ENV }, 'Running in unknown mode');
}

// Middlewares
app.use(pinoHttp({
    logger,

    customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },

    // Mensaje compacto en una sola línea: METHOD url statusCode Xms
    customSuccessMessage: (req, res, responseTime) =>
        `${req.method} ${(req as any).originalUrl ?? req.url} ${res.statusCode} ${responseTime}ms`,

    customErrorMessage: (req, res, err) =>
        `${req.method} ${(req as any).originalUrl ?? req.url} ${res.statusCode} — ${err.message}`,

    // No emitir los objetos req/res completos; toda la info ya va en el mensaje
    serializers: {
        req: () => undefined as any,
        res: () => undefined as any,
    },
}));
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));
app.use(cors());

initRoutesApi(app);
app.use(errorHandler);

export default app;
