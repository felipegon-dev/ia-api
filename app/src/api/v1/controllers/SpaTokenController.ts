import { Request, Response } from 'express';
import Token from '@services/base/Token';
import UserData from "@services/base/UserData";

/**
 * Access without authentication to get a token for SPA apps
 */

export class SpaTokenController {
    constructor(private token: Token, private userData: UserData) {}

    /**
     * Access without authentication to get a token for SPA apps
     * @param req
     * @param res
     */
    getToken = async (req: Request, res: Response) => {
        try {
            const token = this.token.get(req, res);
            res.status(200).json({ success: true, data: token });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
}
