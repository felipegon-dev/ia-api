import UserRepository from "@config/database/repository/UserRepository";
import { Request } from 'express';
import UserData from "@src/services/base/UserData";
import {UserError} from "@src/errors/UserError";
import Url from "@src/util/Url";
import {UserExtended} from "@apptypes/UserExtended";
import {ValidationError} from "@src/errors/ValidationError";
import {UserDomainAttributes} from "@apptypes/UserDomainAttributes";

export default class UserDomainValidation {

    private userDomain: UserDomainAttributes | undefined = undefined;

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

        const matchedDomain = user.domains?.find(
            (d: { domain: string }) =>
                this.url.matchDomain(userData.srvReferer as string, d.domain)
        ) ?? null;

        const allowed = !!matchedDomain;

        if (!allowed) {
            throw new UserError('Domain not found');
        }

        this.userDomain = matchedDomain;

        return user;
    }

    getDomainId(): number {
        if (!this.userDomain) throw new ValidationError('domain not set');
        return this.userDomain.id;
    }

    getDomain(): string {
        if (!this.userDomain) throw new ValidationError('domain not set');
        return this.userDomain.domain;
    }
}