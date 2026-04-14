import {UserExtended} from "@apptypes/UserExtended";
import DomainShippingRepository from "@config/database/repository/DomainShippingRepository";
import {ValidationError} from "@src/errors/ValidationError";

export type ShippingMethods = {
    method: string;
    code: string;
    price: number;
    currency: string;
    deliveryTime: string;
    active: boolean
};

export class ShippingManager {
    private shippingMethods: ShippingMethods[] = [];

    constructor(private readonly domainShippingRepository: DomainShippingRepository) {}

    async get(user: UserExtended, userDomainId: number, shippingMethods: ShippingMethods[]): Promise<ShippingManager> {
        for (const method of shippingMethods) {
            const found = await this.domainShippingRepository.findByCodePriceCurrency(
                userDomainId,
                method.code,
                method.price,
                method.currency
            );

            if (!found) {
                throw new ValidationError(
                    `Shipping method not valid: code="${method.code}", price=${method.price}, currency="${method.currency}"`
                );
            }
        }

        this.shippingMethods = shippingMethods;
        return this;
    }

    getItemsJson(): string {
        return JSON.stringify(this.shippingMethods);
    }

    getAmount() {
        return this.shippingMethods.find(m => m.active)?.price ?? 0;
    }
}