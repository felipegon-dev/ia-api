import express from 'express';
import path from 'path';
import logger from 'morgan';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { initRoutesApi } from './modules/routes-api';
import { errorHandler } from './modules/error-handler';

const app = express();
const isDev = process.env.NODE_ENV !== 'production';

// Middlewares
app.use(logger(isDev ? 'dev' : 'common'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors()); // todo: origenes solo localhost y ia-apps-api

initRoutesApi(app);
app.use(errorHandler);

export default app;
