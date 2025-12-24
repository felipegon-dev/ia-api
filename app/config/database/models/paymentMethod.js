'use strict';

module.exports = (sequelize, DataTypes) => {
    const PaymentMethod = sequelize.define(
        'PaymentMethod',
        {
            name: {
                type: DataTypes.STRING(100),
                allowNull: false,
            },

            code: {
                type: DataTypes.STRING(50),
                allowNull: false,
                unique: true,
            },

            provider: {
                type: DataTypes.STRING(50),
                allowNull: true,
            },

            apiVersion: {
                type: DataTypes.STRING(20),
                allowNull: true,
            },

            status: {
                type: DataTypes.ENUM('active', 'inactive'),
                allowNull: false,
                defaultValue: 'active',
            },

            position: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
        },
        {
            tableName: 'paymentMethods',
            timestamps: true,
        }
    );

    PaymentMethod.associate = function(models) {
        PaymentMethod.hasMany(models.UserPaymentMethod, {
            foreignKey: 'paymentMethodId',
            as: 'userPaymentMethods',
        });

        PaymentMethod.belongsToMany(models.User, {
            through: models.UserPaymentMethod,
            foreignKey: 'paymentMethodId',
            otherKey: 'userId',
            as: 'users',
        });
    };

    return PaymentMethod;
};
