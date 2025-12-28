'use strict';

module.exports = (sequelize, DataTypes) => {
    const UserPaymentOrders = sequelize.define(
        'UserPaymentOrders',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },

            userPaymentMethodId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            providerId: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'Order ID returned by the payment provider (PayPal, Klarna, etc.)',
            },

            providerMetadata: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Full response from the payment provider',
            },

            providerAttemptsSync: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Attempts to sync order status with the payment provider',
            },

            cartItems: {
                type: DataTypes.JSON,
                allowNull: false,
                comment: 'Items purchased: products, quantities, prices, taxes',
            },

            addressItems: {
                type: DataTypes.JSON,
                allowNull: false,
                comment: 'Billing and shipping address data',
            },

            amount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: true,
                comment: 'Total amount including items and shipping',
            },

            shippingCost: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: true,
                defaultValue: 0,
                comment: 'Shipping cost',
            },

            description: {
                type: DataTypes.STRING(255),
                allowNull: true,
                comment: 'Order description',
            },

            status: {
                type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
                allowNull: false,
                defaultValue: 'pending',
                comment: 'Order status',
            },

            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },

            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
        },
        {
            tableName: 'userPaymentOrders',
            timestamps: true,
        }
    );

    // 🔗 Associations
    UserPaymentOrders.associate = function (models) {
        UserPaymentOrders.belongsTo(models.UserPaymentMethod, {
            foreignKey: 'userPaymentMethodId',
            as: 'userPaymentMethod',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
    };

    return UserPaymentOrders;
};
