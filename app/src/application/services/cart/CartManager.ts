import { CartItems } from "@application/services/payment/Payment";
import {  UserExtended } from "@apptypes/UserExtended";


/**
 * Aim: Validate payment method and cart items.
 * Provide necessary data for payment processing
 */
export class CartManager {
    private cartItems: CartItems[] = [];
    private userExtended: UserExtended | null = null;


    // =====================
    // Public methods
    // =====================
    public async get(userExtended: UserExtended, cartItems: CartItems[]): Promise<CartManager> {
        this.userExtended = userExtended;
        await this.setCartItems(cartItems);

        return this;
    }

    public getAmount(): number {
        return 1;
    }

    public getCurrency(): string {
        return "EUR";
    }

    public getDescription(): string {
        return "test description"; // todo; text from the user
    }

    public getCartItems() {
        return this.cartItems;
    }

    public getCartItemsJson(): string {
        return '';
    }

    // =====================
    // Private methods
    // =====================
    private async setCartItems(cartItems: CartItems[]): Promise<void> {
        // todo: validation of cart items structure
        // todo: elastic search find items
        // todo: check prices and availability
        this.cartItems = cartItems;
    }

    private checkCartAvailability(): boolean {
        return true;
    }

    private checkCartPrices(): boolean {
        return true;
    }

    private getCartItemsFromDatabase(userId: string, items: any[]): any[] {
        return [];
    }
}
