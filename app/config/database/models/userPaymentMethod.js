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
            },

            metadata: {
                type: DataTypes.JSON,
                allowNull: true,
            },
        },
        {
            tableName: 'userPaymentMethods',
            timestamps: true,
        }
    );

    UserPaymentMethod.associate = function(models) {
        UserPaymentMethod.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user',
        });

        UserPaymentMethod.belongsTo(models.PaymentMethod, {
            foreignKey: 'paymentMethodId',
            as: 'paymentMethod',
        });
    };

    return UserPaymentMethod;
};
