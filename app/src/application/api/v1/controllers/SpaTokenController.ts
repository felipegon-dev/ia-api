import { Request, Response } from 'express';
import {BaseControllerValidation} from "@application/api/v1/controllers/BaseControllerValidation";
/**
 * Access without authentication to get a token for SPA apps
 */

export class SpaTokenController extends BaseControllerValidation{

    /**
     * Access without authentication to get a token for SPA apps
     * @param req
     * @param res
     */
    getToken = async (req: Request, res: Response) => {
        this.validateUserDomain(req);
        res.status(200).json({ success: true, data: this.token.get(req, res)});
    };
}
