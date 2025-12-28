import db from "@config/database/models";
import type {
    PaymentMethodAttributes,
    PaymentMethodCreationAttributes,
    UserPaymentMethodAttributes,
    UserPaymentMethodCreationAttributes
} from "@config/database/models";
import type { Model } from "sequelize";

export interface IPaymentRepository {
    findAllActiveMethods(): Promise<PaymentMethodAttributes[]>;
    findMethodByCode(code: string): Promise<PaymentMethodAttributes | null>;
    addMethodToUser(
        userId: number,
        paymentMethodId: number,
        paymentToken?: string,
        metadata?: Record<string, any>
    ): Promise<UserPaymentMethodAttributes>;
    findActiveMethodsByUser(userId: number): Promise<UserPaymentMethodAttributes[]>;
    deactivateUserMethod(id: number): Promise<boolean>;
    deleteUserMethodById(id: number): Promise<boolean>;
}

export default class PaymentRepository implements IPaymentRepository {
    private PaymentMethod = db.PaymentMethod;
    private UserPaymentMethod = db.UserPaymentMethod;

    public async findAllActiveMethods(): Promise<PaymentMethodAttributes[]> {
        const methods = await this.PaymentMethod.findAll({
            where: { status: 'active' },
            order: [['position', 'ASC']],
            raw: true
        });

        return methods as unknown as PaymentMethodAttributes[];
    }

    public async findMethodByCode(code: string): Promise<PaymentMethodAttributes | null> {
        const method = await this.PaymentMethod.findOne({
            where: { code },
            raw: true
        });

        return method as PaymentMethodAttributes | null;
    }

    public async addMethodToUser(
        userId: number,
        paymentMethodId: number,
        paymentToken?: string,
        metadata?: Record<string, any>
    ): Promise<UserPaymentMethodAttributes> {
        const data: UserPaymentMethodCreationAttributes = {
            userId,
            paymentMethodId,
            status: 'active', // obligatorio
            paymentToken: paymentToken ?? null,
            metadata: metadata ?? null,
        };

        const created = await this.UserPaymentMethod.create(data);
        return created.get({ plain: true });
    }

    public async findActiveMethodsByUser(userId: number): Promise<UserPaymentMethodAttributes[]> {
        const methods = await this.UserPaymentMethod.findAll({
            where: { userId, status: 'active' }
        });

        return methods.map(m => m.get({ plain: true }));
    }

    public async deactivateUserMethod(id: number): Promise<boolean> {
        const updated = await this.UserPaymentMethod.update(
            { status: 'inactive' },
            { where: { id } }
        );

        return updated[0] > 0;
    }

    public async deleteUserMethodById(id: number): Promise<boolean> {
        const deleted = await this.UserPaymentMethod.destroy({ where: { id } });
        return deleted > 0;
    }
}
