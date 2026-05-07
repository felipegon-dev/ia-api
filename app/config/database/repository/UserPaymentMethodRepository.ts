import db from "@config/database/models";

export default class UserPaymentMethodRepository {

    public async findByUserId(userId: number) {
        return db.UserPaymentMethod.findAll({
            where: { userId },
            include: [
                {
                    model: db.PaymentMethod,
                    as: 'paymentMethod',
                    attributes: ['id', 'name', 'code', 'provider']
                }
            ]
        });
    }

    public async findByUserAndPaymentMethod(userId: number, paymentMethodId: number) {
        return db.UserPaymentMethod.findOne({
            where: { userId, paymentMethodId }
        });
    }

    public async upsert(data: {
        userId: number;
        paymentMethodId: number;
        paymentToken: string;
        mode: 'development' | 'production';
        status: 'active' | 'inactive';
    }) {
        const existing = await this.findByUserAndPaymentMethod(data.userId, data.paymentMethodId);
        if (existing) {
            await (existing as any).update({
                paymentToken: data.paymentToken,
                mode: data.mode,
                status: data.status,
                updatedAt: new Date()
            });
            return existing;
        }
        const created = await db.UserPaymentMethod.create({
            userId: data.userId,
            paymentMethodId: data.paymentMethodId,
            paymentToken: data.paymentToken,
            status: data.status,
        });
        await (created as any).update({ mode: data.mode });
        return created;
    }

    public async getAllPaymentMethods() {
        return db.PaymentMethod.findAll({
            where: { status: 'active' },
            order: [['position', 'ASC']],
            attributes: ['id', 'name', 'code', 'provider', 'apiVersion', 'status']
        });
    }
}
