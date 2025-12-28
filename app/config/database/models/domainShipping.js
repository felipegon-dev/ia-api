'use strict';

const { Currency } = require('/usr/src/app/config/database/vo/Currency.ts'); // ajusta path según tu proyecto

module.exports = (sequelize, DataTypes) => {
    const DomainShipping = sequelize.define(
        'DomainShipping',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },

            userDomainId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                comment: 'Domain owner of the shipping method (FK → userDomains.id)',
            },

            name: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'Name of the shipping method. Example: "Express", "Standard"',
            },

            code: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'Unique code for the shipping method. Example: "EXPRESS", "STANDARD"',
            },

            price: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                defaultValue: 0,
                comment: 'Shipping cost for this method. Example: 9.99',
            },

            currency: {
                type: DataTypes.STRING(3),
                allowNull: false,
                defaultValue: Currency.EUR().value, // usamos VO para consistencia
                comment: 'Currency code. Example: "EUR", "USD"',
            },

            deliveryTimeDescription: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: 'Estimated delivery time. Example: "1-2 business days"',
            },

            freeShippingFrom: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: true,
                comment: 'Minimum order amount for free shipping. Example: 50.00',
            },

            active: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
                comment: 'Whether this shipping method is active',
            },

            defaultMethod: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Whether this is the default shipping method',
            },

            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },

            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: 'domainShipping',
            timestamps: true,
        }
    );

    // 🔗 Asociaciones
    DomainShipping.associate = function(models) {
        DomainShipping.belongsTo(models.UserDomain, {
            foreignKey: 'userDomainId',
            as: 'userDomain',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
    };

    return DomainShipping;
};
