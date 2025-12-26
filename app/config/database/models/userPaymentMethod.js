'use strict';

module.exports = (sequelize, DataTypes) => {
    const UserPaymentMethod = sequelize.define(
        'UserPaymentMethod',
        {
            status: {
                type: DataTypes.ENUM('active', 'inactive'),
                allowNull: false,
                defaultValue: 'active',
            },
            paymentToken: {
                type: DataTypes.STRING(255),
                allowNull: true,
                comment: 'Provider token used to charge the user',
            },
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

    UserPaymentMethod.associate = function(models) {

        /* =========================
           UserPaymentMethod → User (N:1)
        ========================== */
        UserPaymentMethod.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user',
        });

        /* =========================
           UserPaymentMethod → PaymentMethod (N:1)
        ========================== */
        UserPaymentMethod.belongsTo(models.PaymentMethod, {
            foreignKey: 'paymentMethodId',
            as: 'paymentMethod',
        });
    };

    return UserPaymentMethod;
};
