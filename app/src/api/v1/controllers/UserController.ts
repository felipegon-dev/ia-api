import { Request, Response } from 'express';
import { UserService } from '@services/UserService';

export class UserController {
    constructor(private userService = new UserService()) {}

    // GET /user/:id
    getUserById = async (req: Request, res: Response) => {
        try {
            const userId = req.params.id;
            const user = await this.userService.getUserById(userId);
            res.status(200).json({ success: true, data: user });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
}
