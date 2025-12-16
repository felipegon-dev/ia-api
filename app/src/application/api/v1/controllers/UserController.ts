import {Request, Response} from 'express';
import {BaseControllerValidation} from "@application/api/v1/controllers/BaseControllerValidation";

export class UserController extends BaseControllerValidation{

    getUserById = async (req: Request, res: Response) => {
        this.validate(req);
        res.status(200).json({success: true, data: { id: 1, name: "Johassssn kkg" }});
    }

}
