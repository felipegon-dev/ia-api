import Token from "@application/services/base/Token";
import {UserService} from "@application/services/UserService";
import {ValidationError} from "@application/errors/ValidationError";
import UserData from "@application/services/base/UserData";
import UserRepository from "@domain/repository/UserRepository";
import UserValidation from "@application/services/user/UserValidation";

type Constructor<T> = new (...args: any[]) => T;

/**
 * IMPORTANT: All classes need to be registered here
 */

export class Container {
    private instances = new Map<Constructor<any>, any>();

    constructor() {
        this.register();
    }

    private register(): void {
        // Base services
        this.instances.set(UserData, new UserData());
        this.instances.set(UserRepository, new UserRepository())
        this.instances.set(Token, new Token(this.get(UserData)));
        this.instances.set(UserService, new UserService());
        this.instances.set(UserValidation, new UserValidation(this.get(UserRepository), this.get(UserData)))
    }

    public get<T>(Service: Constructor<T>): T {
        const instance = this.instances.get(Service);

        if (!instance) {
            throw new ValidationError(`Service not found in container: ${Service.name}`);
        }

        return instance;
    }
}
