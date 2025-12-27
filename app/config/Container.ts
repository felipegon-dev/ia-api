import Token from "@application/services/base/Token";
import {ValidationError} from "@application/errors/ValidationError";
import UserData from "@application/services/base/UserData";
import UserRepository from "@domain/repository/UserRepository";
import UserDomainValidation from "@application/services/user/UserDomainValidation";
import Url from '@application/util/Url'
import PaymentRepository from "@domain/repository/PaymentRepository";
import {PaymentFactory} from "@application/services/payment/PaymentFactory";
import {CartManager} from "@application/services/cart/CartManager";

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
        this.instances.set(Url, new Url());
        this.instances.set(UserRepository, new UserRepository())
        this.instances.set(Token, new Token(this.get(UserData)));

        // User services
        this.instances.set(UserDomainValidation,
            new UserDomainValidation(
                this.get(UserRepository),
                this.get(UserData),
                this.get((Url))
            )
        )

        // Payment services
        this.instances.set(PaymentRepository, new PaymentRepository());
        this.instances.set(PaymentFactory, new PaymentFactory())

        // Cart Services
        this.instances.set(CartManager, new CartManager(this.get(UserData), this.get(Url)));
    }

    public get<T>(Service: Constructor<T>): T {
        const instance = this.instances.get(Service);

        if (!instance) {
            throw new ValidationError(`Service not found in container: ${Service.name}`);
        }

        return instance;
    }
}
