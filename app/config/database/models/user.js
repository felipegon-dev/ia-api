'use strict';

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define(
        'User',
        {
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },

            password: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            code: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },

            status: {
                type: DataTypes.ENUM('active', 'inactive', 'banned'),
                allowNull: false,
                defaultValue: 'active',
            }
        },
        {
            tableName: 'users',
            timestamps: true,
        }
    );

    User.associate = function(models) {

        /* =========================
           User → UserDomain (1:N)
        ========================== */
        User.hasMany(models.UserDomain, {
            foreignKey: 'userId',
            as: 'domains',
        });

        /* =========================
           User → UserPaymentMethod (1:N)
        ========================== */
        User.hasMany(models.UserPaymentMethod, {
            foreignKey: 'userId',
            as: 'userPaymentMethods',
        });

        /* =========================
           User ↔ PaymentMethod (N:M)
           through userPaymentMethods
        ========================== */
        User.belongsToMany(models.PaymentMethod, {
            through: models.UserPaymentMethod,
            foreignKey: 'userId',
            otherKey: 'paymentMethodId',
            as: 'paymentMethods',
        });
    };

    return User;
};
