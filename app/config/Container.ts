import Token from "@src/services/base/Token";
import { ValidationError } from "@src/errors/ValidationError";
import UserData from "@src/services/base/UserData";
import UserRepository from "@config/database/repository/UserRepository";
import UserDomainValidation from "@src/services/user/UserDomainValidation";
import Url from "@src/util/Url";
import PaymentRepository from "@config/database/repository/PaymentRepository";
import { PaymentFactory } from "@src/services/payment/PaymentFactory";
import { CartManager } from "@src/services/cart/CartManager";
import { PaypalSync } from "@src/services/payment/paypal/PaypalSync";
import { PaypalRequest } from "@src/services/payment/paypal/PaypalRequest";
import {PaymentManager} from "@src/services/payment/PaymentManager";
import UserPaymentOrdersRepository from "@config/database/repository/UserPaymentOrdersRepository";
import {AddressManager} from "@src/services/user/AddressManager";

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
