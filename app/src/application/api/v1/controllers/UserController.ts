import {Request, Response} from 'express';
import { UserService } from '@application/services/UserService';
import Token from "@application/services/base/Token";

export class UserController {
    private token: Token;
    private userService: UserService;

    constructor(userService :UserService, token: Token) {
        this.token = token;
        this.userService = userService;
    }

    getUserById = async (req: Request, res: Response) => {
        this.token.validate(req);
        const userId = req.params.id;
        const user = await this.userService.getUserById(userId);
        res.status(200).json({success: true, data: user});
    }

}
