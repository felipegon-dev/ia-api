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

            userDomainId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            providerId: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            providerMetadata: {
                type: DataTypes.JSON,
                allowNull: true,
            },

            providerAttemptsSync: {
                type: DataTypes.JSON,
                allowNull: true,
            },

            cartItems: {
                type: DataTypes.JSON,
                allowNull: false,
            },

            addressItems: {
                type: DataTypes.JSON,
                allowNull: false,
            },

            amount: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: true,
            },

            shippingCost: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: true,
                defaultValue: 0,
            },

            description: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },

            status: {
                type: DataTypes.ENUM(
                    'pending',
                    'completed',
                    'failed',
                    'cancelled'
                ),
                allowNull: false,
                defaultValue: 'pending',
            },
        },
        {
            tableName: 'userPaymentOrders',
            timestamps: true,
        }
    );

    // ✅ SOLO asociaciones propias
    UserPaymentOrders.associate = function (models) {
        UserPaymentOrders.belongsTo(models.UserPaymentMethod, {
            foreignKey: 'userPaymentMethodId',
            as: 'userPaymentMethod',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });

        UserPaymentOrders.belongsTo(models.UserDomain, {
            foreignKey: 'userDomainId',
            as: 'userDomain',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
    };

    return UserPaymentOrders;
};
