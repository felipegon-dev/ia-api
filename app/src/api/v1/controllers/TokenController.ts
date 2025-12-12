import { Request, Response } from 'express';
import { Auth } from '@services/Auth';

export class TokenController {
    getToken = async (req: Request, res: Response) => {
        const auth = new Auth();
        res.status(200).json({ success: true, data: auth.generateToken('ia-apps') });
    };
}
