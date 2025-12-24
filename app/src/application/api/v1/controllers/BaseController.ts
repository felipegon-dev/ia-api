import { Request } from 'express';
import Token from '@application/services/base/Token';
import UserDomainValidation from "@application/services/user/UserDomainValidation";
import {UserExtended} from "@apptypes/UserExtended";

export class BaseController {
    constructor(protected token: Token, protected userDomainValidation: UserDomainValidation) {}

    protected async validate(req: Request): Promise<UserExtended>{
        this.validateAuth(req);
        return this.validateUserDomain(req);
    }

    protected async validateUserDomain(req: Request) {
        return this.userDomainValidation.validate(req);
    }
    protected validateAuth(req: Request) {
        this.token.validate(req);
    }
}
