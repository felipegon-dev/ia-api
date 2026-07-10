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

    async get(
        user: UserExtended,
        userDomainId: number,
        shippingMethods: ShippingMethods[],
        cartAmount: number
    ): Promise<ShippingManager> {
        for (const method of shippingMethods) {
            const found = await this.domainShippingRepository.findActiveByCodesCurrency(
                userDomainId,
                this.getCodeAliases(method.code),
                String(method.currency).toUpperCase(),
            );

            if (!found) {
                throw new ValidationError(
                    `Shipping method not valid: code="${method.code}", price=${method.price}, currency="${method.currency}"`
                );
            }

            const expectedPrice = this.getExpectedPrice(found.price, found.freeShippingFrom, cartAmount);
            const requestPrice = this.normalizeAmount(method.price);

            if (requestPrice !== expectedPrice) {
                throw new ValidationError(
                    `Shipping method price not valid: code="${method.code}", expected=${expectedPrice}, got=${requestPrice}`
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

    private getCodeAliases(code: string): string[] {
        const normalized = String(code ?? '').trim().toLowerCase();

        if (normalized === 'std-peninsula' || normalized === 'standard') {
            return ['std-peninsula', 'standard'];
        }

        if (normalized === 'std-baleares') {
            return ['std-baleares'];
        }

        if (normalized === 'pickup') {
            return ['pickup'];
        }

        return [normalized];
    }

    private getExpectedPrice(price: number, freeShippingFrom: number | null | undefined, cartAmount: number): number {
        const basePrice = this.normalizeAmount(price);
        const freeFrom = freeShippingFrom == null ? null : this.normalizeAmount(freeShippingFrom);
        const isFree = freeFrom != null && freeFrom > 0 && this.normalizeAmount(cartAmount) >= freeFrom;

        return isFree ? 0 : basePrice;
    }

    private normalizeAmount(amount: number): number {
        return Number(Number(amount ?? 0).toFixed(2));
    }
}