import {UserExtended} from "@apptypes/UserExtended";

export type ShippingMethods = {
    method: string;
    price: number;
    currency: string;
    deliveryTime: string;
    active: boolean
};

export class ShippingManager {
    private shippingMethods: ShippingMethods[] = [];

    async get(user: UserExtended, shippingMethods: ShippingMethods[]): Promise<ShippingManager> {
        // todo validate items
        this.shippingMethods = shippingMethods;
        return this;
    }

    getItemsJson(): string {
        return JSON.stringify(this.shippingMethods);
    }
}