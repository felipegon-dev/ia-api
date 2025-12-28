import Token from "@application/services/base/Token";
import { ValidationError } from "@application/errors/ValidationError";
import UserData from "@application/services/base/UserData";
import UserRepository from "@domain/repository/UserRepository";
import UserDomainValidation from "@application/services/user/UserDomainValidation";
import Url from "@application/util/Url";
import PaymentRepository from "@domain/repository/PaymentRepository";
import { PaymentFactory } from "@application/services/payment/PaymentFactory";
import { CartManager } from "@application/services/cart/CartManager";
import { PaypalSync } from "@application/services/payment/paypal/PaypalSync";
import { PaypalRequest } from "@application/services/payment/paypal/PaypalRequest";
import {PaymentManager} from "@application/services/payment/PaymentManager";
import UserPaymentOrdersRepository from "@domain/repository/UserPaymentOrdersRepository";
import {AddressManager} from "@application/services/user/AddressManager";

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
        this.registerRepositories();
        this.registerBaseServices();
        this.registerUserServices();
        this.registerPaymentServices();
    }

    private registerRepositories(): void {
        this.instances.set(UserRepository, new UserRepository());
        this.instances.set(UserPaymentOrdersRepository, new UserPaymentOrdersRepository());
    }

    // --------------------
    // Base services
    // --------------------
    private registerBaseServices(): void {
        this.instances.set(UserData, new UserData());
        this.instances.set(Url, new Url());
        this.instances.set(Token, new Token(this.get(UserData)));
    }

    // --------------------
    // User services
    // --------------------
    private registerUserServices(): void {
        this.instances.set(
            UserDomainValidation,
            new UserDomainValidation(
                this.get(UserRepository),
                this.get(UserData),
                this.get(Url)
            )
        );
        this.instances.set(AddressManager, new AddressManager());
    }

    // --------------------
    // Payment services
    // --------------------
    private registerPaymentServices(): void {
        this.instances.set(PaymentRepository, new PaymentRepository());
        this.instances.set(PaypalSync, new PaypalSync());
        this.instances.set(PaypalRequest, new PaypalRequest());

        this.instances.set(
            PaymentFactory,
            new PaymentFactory(
                this.get(PaypalRequest),
                this.get(PaypalSync)
            )
        );

        this.instances.set(CartManager, new CartManager());
        this.instances.set(PaymentManager, new PaymentManager(
            this.instances.get(UserData),
            this.instances.get(Url),
            this.instances.get(UserPaymentOrdersRepository)
        ));
    }

    public get<T>(Service: Constructor<T>): T {
        const instance = this.instances.get(Service);

        if (!instance) {
            throw new ValidationError(`Service not found in container: ${Service.name}`);
        }

        return instance;
    }
}
