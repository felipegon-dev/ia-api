import { ValidationError } from "@application/errors/ValidationError";
import { CartItems, PaymentType } from "@application/services/payment/Payment";
import { PaymentMethodAttributes, UserExtended, UserPaymentMethodAttributes } from "@apptypes/UserExtended";
import UserData from "@application/services/base/UserData";
import Url from "@application/util/Url";

export class CartManager {
    private dbItems: any[] = [];
    private cartItems: CartItems[] = [];
    private userExtended: UserExtended | null = null;
    private userPaymentMethodAttributes: UserPaymentMethodAttributes | null = null;

    constructor(private userData: UserData, private url: Url) {}

    // =====================
    // Public methods
    // =====================
    public async get(userExtended: UserExtended, cartItems: CartItems[], paymentType: PaymentType): Promise<CartManager> {
        this.userExtended = userExtended;
        await this.setPaymentMethodAttributes(paymentType);
        await this.setCartItems(cartItems);
        await this.setRequest();

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

    public getCancelUrl(): string {
        const cancelUrl = this.userData.get().lastUrl || this.userData.get().host;
        if (!cancelUrl) {
            throw new ValidationError("Cancel URL is not set");
        }
        return this.url.removeParamsFromUrl(cancelUrl);
    }

    getRequestId() {
        // todo obtaing the request from object property
        return new Date().getTime().toString();
    }

    // =====================
    // Private methods
    // =====================
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

    private requireUser(): UserExtended {
        if (!this.userExtended) {
            throw new ValidationError("User is not set");
        }
        return this.userExtended;
    }

    private async setRequest() {
        // todo save into the db the request with cart items, user id, total amount, currency, status, etc.
    }
}
