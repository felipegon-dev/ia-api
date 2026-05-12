import { Request, Response } from 'express';
import {BaseAuthController} from "@src/api/v1/controllers/BaseAuthController";
import logger from '@src/util/logger';
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
        try {
            await this.validateUserDomain(req);
            res.status(200).json({ success: true, data: this.token.get(req, res)});
        }  catch (error) {
            logger.error({ err: error }, 'Error in getToken');
            res.status(500).json({
                success: false,
                message: error
            });
        }

    };
}
