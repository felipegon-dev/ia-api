import { CartItems } from "@src/services/payment/Payment";
import {  UserExtended } from "@apptypes/UserExtended";
import {ValidationError} from "@src/errors/ValidationError";
import {Currency} from "@config/database/vo/Currency";


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
        this.cartItems = cartItems;
        this.validateCartItems();

        return this;
    }

    public getAmount(): number {
        return parseFloat(
            this.cartItems
                .reduce((sum, item) => sum + item.price * item.quantity, 0)
                .toFixed(2)
        );
    }

    public getCurrency(): Currency {
        if (!this.cartItems.length) {
            throw new ValidationError('Cart is empty, cannot determine currency');
        }

        const currencies = new Set(this.cartItems.map(i => i.currency));
        if (currencies.size > 1) {
            throw new ValidationError('All cart items must have the same currency');
        }

        // Usamos el value object Currency.of() para obtener el VO
        return Currency.of(this.cartItems[0].currency);
    }

    public getDescription(): string {
        return "test description"; // todo; text from the user
    }

    public getCartItems() {
        return this.cartItems;
    }

    public getCartItemsJson(): string {
        return JSON.stringify(this.cartItems);
    }

    private validateCartItems(): void {
        // todo: optional for dev, prod mandatory
    }
}
