import { ValidationError } from "@application/errors/ValidationError";
import { CartItems, PaymentType } from "@application/services/payment/Payment";
import UserRepository from "@domain/repository/UserRepository";
import { PaymentMethodAttributes, UserExtended, UserPaymentMethodAttributes } from "@apptypes/UserExtended";

export class CartManager {
    private dbItems: any[] = [];
    private cartItems: CartItems[] = [];
    private user: UserExtended | null = null;
    private userPaymentMethodAttributes: UserPaymentMethodAttributes | null = null;

    constructor(private userRepository: UserRepository) {}

    // =====================
    // Public methods
    // =====================
    public async get(userId: string, cartItems: CartItems[], paymentType: PaymentType): Promise<CartManager> {
        await this.setUser(userId);
        await this.setPaymentMethodAttributes(paymentType);
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
        return "test description"; // could not be empty!
    }

    public getCartItems(): CartItems[] {
        return this.cartItems;
    }

    public getPaymentToken(): string {
        if (!this.userPaymentMethodAttributes?.paymentToken) {
            throw new ValidationError("Payment token is not set");
        }
        return this.userPaymentMethodAttributes.paymentToken;
    }

    public getPaymentType(): PaymentType {
        if (!this.userPaymentMethodAttributes?.paymentMethod?.code) {
            throw new ValidationError("Payment type is not set");
        }
        return this.userPaymentMethodAttributes.paymentMethod.code as PaymentType;
    }

    // =====================
    // Private methods
    // =====================
    private async setUser(userId: string): Promise<void> {
        const user = await this.userRepository.findByCode(userId);
        if (!user) {
            throw new ValidationError("Invalid user");
        }
        this.user = user;
    }

    private async setPaymentMethodAttributes(paymentType: PaymentType): Promise<void> {
        const user = this.requireUser();

        if (!user.userPaymentMethods || user.userPaymentMethods.length === 0) {
            throw new ValidationError("User payment methods not loaded");
        }

        const paymentTypeDb = user.userPaymentMethods
            .filter((upm): upm is UserPaymentMethodAttributes & { paymentMethod: PaymentMethodAttributes } => !!upm.paymentMethod)
            .find(upm => upm.paymentMethod!.code === paymentType);

        if (!paymentTypeDb || paymentTypeDb.status !== "active" || !paymentTypeDb.paymentToken) {
            throw new ValidationError("Invalid payment method for user");
        }

        this.userPaymentMethodAttributes = paymentTypeDb!;
    }

    private async setCartItems(cartItems: CartItems[]): Promise<void> {
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

    private requireUser(): UserExtended {
        if (!this.user) {
            throw new ValidationError("User is not set");
        }
        return this.user;
    }
}
