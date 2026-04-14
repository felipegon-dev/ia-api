import db from "@config/database/models";
import { DomainShippingAttributes } from "@config/database/models";

export default class DomainShippingRepository {
    private DomainShipping = db.DomainShipping;

    /**
     * Validates a shipping method exists in DB with matching code, price, currency and active = true
     */
    async findByCodePriceCurrency(
        userDomainId: number,
        code: string,
        price: number,
        currency: string
    ): Promise<DomainShippingAttributes | null> {
        const result = await this.DomainShipping.findOne({
            where: {
                userDomainId,
                code,
                price,
                currency,
                active: true,
            },
        });

        return result ? (result.get() as DomainShippingAttributes) : null;
    }
}

