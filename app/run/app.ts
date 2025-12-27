import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import express from 'express';
import logger from 'morgan';
import cors from 'cors';
import {isDevelopmentMode, isProductionMode} from "@config/constants/AppMode";
import { initRoutesApi } from './modules/routes-api';
import { errorHandler } from './modules/error-handler';

const app = express();

if (isDevelopmentMode) {
    console.log('Running in development mode');
} else if (isProductionMode) {
    console.log('Running in production mode');
} else {
    console.log('Running in unknown mode:', process.env.NODE_ENV);
}

// Middlewares
app.use(logger(isDevelopmentMode ? 'dev' : 'common'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors()); // todo: origenes solo localhost y ia-apps-api

initRoutesApi(app);
app.use(errorHandler);

export default app;
