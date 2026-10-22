import { Request, Response } from 'express';
import {BaseAuthController} from "@src/api/v1/controllers/BaseAuthController";
import logger from '@src/util/logger';
import { AppError } from '@src/errors/AppError';
/**
 * Access without authentication to get a token for SPA apps
 */

export class SpaTokenController extends BaseAuthController{

    /**
     * Access without authentication to get a token for SPA apps
     * @param req
     * @param res
     */
    getToken = async (req: Request, res: Response) => {
        res.setHeader('Cache-Control', 'no-store');
        try {
            await this.validateUserDomain(req);
            res.status(200).json({ success: true, data: this.token.get(req, res)});
        }  catch (error) {
            logger.error({ err: error }, 'Error in getToken');
            const appError = error instanceof AppError ? error : null;
            res.status(appError?.status ?? 500).json({
                success: false,
                code: appError?.code ?? 'INTERNAL_ERROR',
                message: appError?.message ?? 'Internal server error',
            });
        }

    };
}
