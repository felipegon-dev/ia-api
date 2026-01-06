import { Request, Response } from 'express';
import { BaseAuthController } from '@src/api/v1/controllers/BaseAuthController';
import { toUserDTO, UserDTO } from '@src/api/v1/response/dto/UserDTO';
import { UserExtended } from '@apptypes/UserExtended';

export class UserController extends BaseAuthController {

    getUserById = async (req: Request, res: Response) => {
        const user: UserExtended = await this.validate(req);
        const userDTO: UserDTO = toUserDTO(user, this.userDomainValidation.getUserDomain());
        res.status(200).json({
            success: true,
            data: userDTO
        });
    }
}
