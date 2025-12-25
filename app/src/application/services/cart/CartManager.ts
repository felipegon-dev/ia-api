import {ValidationError} from "@application/errors/ValidationError";

// todo: entities cart, items

export class CartManager {
    private dbItems: any[] = [];
    private items: any[] = [];

    public validateCartItems(userId: string, items: any[]): this {
        this.items = items;
        this.dbItems = this.getCartItemsFromDatabase(userId, items);
        if (this.checkCartAvailability() && this.checkCartPrices()) {
            return this;
        }

        throw new ValidationError('Cart validation failed');
    }

    public getTotalCartAmount(): number {
        // todo: calculate total amount from db + quantity from items
        return 1;
    }

    private checkCartAvailability(): boolean {
        // todo: get items from db and check availability
        return true;
    }

    private checkCartPrices(): boolean {
        // todo: check it the prices are correct
        return true;
    }

    private getCartItemsFromDatabase(userId: string, items: any[]): any[] {
        // todo: retrieve items from db
        return [];
    }
}