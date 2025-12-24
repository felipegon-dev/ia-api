import UserRepository from "@domain/repository/UserRepository";
import { Request } from 'express';
import UserData from "@application/services/base/UserData";
import {UserError} from "@application/errors/UserError";
import Url from "@application/util/Url";
import {UserExtended} from "@apptypes/UserExtended";

export default class UserDomainValidation {

    constructor(
        private userRepository: UserRepository,
        private userData: UserData,
        private url: Url
    ) {
    }

    /**
     * Validates user exists and the domain is allowed
     * @param req
     */
    public async validate(req: Request) : Promise<UserExtended> {
        const userData = this.userData.set(req).get();
        if (!userData?.userId) {
            throw new UserError('User not found');
        }
        const user = await this.userRepository.findByCode(userData.userId as string);
        if (!user) {
            throw new UserError('User not found');
        }

        const allowed = user.domains?.some((d: { domain: string; }) =>
            this.url.matchDomain(userData.srvReferer as string, d.domain)
        ) ?? false;


        if (!allowed) {
            throw new UserError('Domain not found');
        }

        return user;
    }
}