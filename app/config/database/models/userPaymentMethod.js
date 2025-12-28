'use strict';

module.exports = (sequelize, DataTypes) => {
    const UserPaymentMethod = sequelize.define(
        'UserPaymentMethod',
        {
            // =========================
            // PK
            // =========================
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },

            // =========================
            // FK → User
            // =========================
            userId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            // =========================
            // FK → PaymentMethod
            // =========================
            paymentMethodId: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            // =========================
            // Status
            // =========================
            status: {
                type: DataTypes.ENUM('active', 'inactive'),
                allowNull: false,
                defaultValue: 'active',
            },

            // =========================
            // Mode (env)
            // =========================
            mode: {
                type: DataTypes.ENUM('development', 'production'),
                allowNull: false,
                defaultValue: 'development',
                comment: 'Environment for the credentials',
            },

            // =========================
            // Provider credentials
            // =========================
            paymentToken: {
                type: DataTypes.TEXT,
                allowNull: true,
                comment: 'Encrypted provider token (Client ID + Secret)',
            },

            // =========================
            // Extra provider data
            // =========================
            metadata: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Extra provider-specific data',
            },
        },
        {
            tableName: 'userPaymentMethods',
            timestamps: true,
        }
    );

    // =========================
    // Associations
    // =========================
    UserPaymentMethod.associate = function (models) {
        /* =========================
           UserPaymentMethod → User (N:1)
        ========================== */
        UserPaymentMethod.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });

        /* =========================
           UserPaymentMethod → PaymentMethod (N:1)
        ========================== */
        UserPaymentMethod.belongsTo(models.PaymentMethod, {
            foreignKey: 'paymentMethodId',
            as: 'paymentMethod',
            onDelete: 'RESTRICT',
            onUpdate: 'CASCADE',
        });

        /* =========================
           UserPaymentMethod → Orders (1:N)
        ========================== */
        UserPaymentMethod.hasMany(models.UserPaymentOrders, {
            foreignKey: 'userPaymentMethodId',
            as: 'orders',
        });
    };

    return UserPaymentMethod;
};
