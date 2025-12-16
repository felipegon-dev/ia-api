import { Request } from 'express';
import Token from '@application/services/base/Token';
import UserDomainValidation from "@application/services/user/UserDomainValidation";

export class BaseControllerValidation {
    constructor(protected token: Token, private userDomainValidation: UserDomainValidation) {}

    protected validate(req: Request){
        this.validateAuth(req);
        this.validateUserDomain(req);
    }

    protected async validateUserDomain(req: Request) {
        await this.userDomainValidation.validate(req);
    }
    protected validateAuth(req: Request) {
        this.token.validate(req);
    }
}
