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
            where: { userDomainId, code, price, currency, active: true },
        });
        return result ? (result.get() as DomainShippingAttributes) : null;
    }

    private async getUserDomainIdByEmail(email: string): Promise<number | null> {
        const user = await (db.User as any).findOne({
            where: { email },
            include: [{ model: db.UserDomain, as: 'domains', attributes: ['id'] }],
        });
        if (!user) return null;
        const domains: any[] = user.domains ?? [];
        return domains.length > 0 ? domains[0].id : null;
    }

    async findAllByEmail(email: string): Promise<DomainShippingAttributes[]> {
        const userDomainId = await this.getUserDomainIdByEmail(email);
        if (!userDomainId) return [];
        const results = await (this.DomainShipping as any).findAll({
            where: { userDomainId },
            order: [['defaultMethod', 'DESC'], ['id', 'ASC']],
        });
        return results.map((r: any) => r.get() as DomainShippingAttributes);
    }

    async findByIdAndEmail(id: number, email: string): Promise<DomainShippingAttributes | null> {
        const userDomainId = await this.getUserDomainIdByEmail(email);
        if (!userDomainId) return null;
        const result = await (this.DomainShipping as any).findOne({ where: { id, userDomainId } });
        return result ? (result.get() as DomainShippingAttributes) : null;
    }

    async updateByIdAndEmail(
        id: number,
        email: string,
        data: Partial<Pick<DomainShippingAttributes,
            'name' | 'code' | 'price' | 'currency' | 'deliveryTimeDescription' |
            'freeShippingFrom' | 'active' | 'defaultMethod'>>
    ): Promise<DomainShippingAttributes | null> {
        const userDomainId = await this.getUserDomainIdByEmail(email);
        if (!userDomainId) return null;
        await (this.DomainShipping as any).update(data, { where: { id, userDomainId } });
        return this.findByIdAndEmail(id, email);
    }
}

