import { Request, Response } from 'express';
import { BaseAuthController } from '@application/api/v1/controllers/BaseAuthController';
import { toUserDTO, UserDTO } from '@application/api/v1/response/dto/UserDTO';
import { UserExtended } from '@apptypes/UserExtended';

export class UserController extends BaseAuthController {

    getUserById = async (req: Request, res: Response) => {
        const user: UserExtended = await this.validate(req);
        const userDTO: UserDTO = toUserDTO(user);
        res.status(200).json({
            success: true,
            data: userDTO
        });
    }
}
