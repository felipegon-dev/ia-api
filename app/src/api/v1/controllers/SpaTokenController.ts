import { Request, Response } from 'express';
import {BaseAuthController} from "@src/api/v1/controllers/BaseAuthController";
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
        await this.validateUserDomain(req);
        res.status(200).json({ success: true, data: this.token.get(req, res)});
    };
}
