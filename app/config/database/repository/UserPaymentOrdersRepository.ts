import db, {
    UserPaymentOrdersCreationAttributes,
    UserPaymentOrdersAttributes
} from "@config/database/models";

export default class UserPaymentOrdersRepository {
    private UserPaymentOrders = db.UserPaymentOrders;

    /**
     * Crear una nueva orden de pago
     */
    public async create(
        data: UserPaymentOrdersCreationAttributes
    ) {
        return this.UserPaymentOrders.create(data);
    }

    /**
     * Guardar (actualizar) una orden existente usando providerId
     * Ideal para webhooks y sincronizaciones con el provider
     */
    public async save(
        providerId: string,
        data: Partial<UserPaymentOrdersAttributes>
    ) {
        const order = await this.UserPaymentOrders.findOne({
            where: { providerId },
        });

        if (!order) {
            throw new Error(`UserPaymentOrder with providerId ${providerId} not found`);
        }

        return order.update(data);
    }

    /**
     * Buscar una orden por ID del provider (PayPal order id, etc.)
     */
    public async findByProviderId(providerId: string) {
        return this.UserPaymentOrders.findOne({
            where: { providerId },
        });
    }

    /**
     * Obtener todas las órdenes de un método de pago del usuario
     */
    public async findAllByUserPaymentMethod(userPaymentMethodId: number) {
        return this.UserPaymentOrders.findAll({
            where: { userPaymentMethodId },
            order: [['createdAt', 'DESC']],
        });
    }

    /**
     * Obtener una orden por ID interno
     */
    public async findById(id: number) {
        return this.UserPaymentOrders.findByPk(id);
    }

    /**
     * Actualizar únicamente el estado de la orden
     */
    public async updateStatus(
        providerId: string,
        status: UserPaymentOrdersAttributes['status']
    ) {
        return this.save(providerId, { status });
    }

    /**
     * Añadir un intento de sincronización con el proveedor
     */
    public async addSyncAttempt(providerId: string, attemptData: any) {
        const order = await this.findByProviderId(providerId);
        if (!order) {
            throw new Error('UserPaymentOrder not found');
        }

        const attempts = order.getDataValue('providerAttemptsSync') || [];

        attempts.push({
            date: new Date(),
            ...attemptData,
        });

        return order.update({
            providerAttemptsSync: attempts,
        });
    }

    /**
     * Eliminar una orden por ID
     */
    public async deleteById(id: number): Promise<boolean> {
        const deleted = await this.UserPaymentOrders.destroy({
            where: { id },
        });
        return deleted > 0;
    }
}
