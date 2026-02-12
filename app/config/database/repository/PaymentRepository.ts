import db from "@config/database/models";

export default class PaymentRepository {

    public async getPaymentTokenByProviderId(
        providerId: string
    ): Promise<string | null> {

        const order = await db.UserPaymentOrders.findOne({
            where: { providerId },
            include: [
                {
                    model: db.UserPaymentMethod,
                    as: 'userPaymentMethod', // 👈 CLAVE
                    required: true,
                    attributes: ['id', 'paymentToken']
                }
            ]
        });

        if (!order) {
            return null;
        }

        const userPaymentMethod = order.get('userPaymentMethod') as any;

        return userPaymentMethod?.paymentToken ?? null;
    }

    updateOrderStatus(order: string, Value: "pending" | "completed" | "failed" | "cancelled"): void {
        db.UserPaymentOrders.update(
            { status: Value },
            { where: { providerId: order } }
        );
    }
}
