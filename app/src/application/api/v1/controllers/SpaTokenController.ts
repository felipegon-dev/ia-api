import { Request, Response } from 'express';
import Token from '@application/services/base/Token';
import UserValidation from "@domain/services/UserValidation";
/**
 * Access without authentication to get a token for SPA apps
 */

export class SpaTokenController {
    constructor(private token: Token, private userValidation: UserValidation) {}

    /**
     * Access without authentication to get a token for SPA apps
     * @param req
     * @param res
     */
    getToken = async (req: Request, res: Response) => {
        this.userValidation.validate(req);
        res.status(200).json({ success: true, data: this.token.get(req, res)});
    };
}
