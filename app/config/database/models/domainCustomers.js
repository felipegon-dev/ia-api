'use strict';

module.exports = (sequelize, DataTypes) => {
    const DomainCustomer = sequelize.define(
        'DomainCustomer',
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
                references: {
                    model: 'userDomains',
                    key: 'id',
                },
            },

            isBilling: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            isShipping: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },

            isActive: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },

            fullName: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            email: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            phone: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            street: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            city: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            state: {
                type: DataTypes.STRING,
                allowNull: true,
            },

            zip: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            country: {
                type: DataTypes.STRING(2),
                allowNull: false,
            },

            company: {
                type: DataTypes.STRING,
                allowNull: true,
            },

            vatId: {
                type: DataTypes.STRING,
                allowNull: true,
            },
        },
        {
            tableName: 'domainCustomers',
            timestamps: true,
            hooks: {
                // Antes de guardar, asegura que solo una dirección activa por tipo por dominio
                async beforeSave(customer, options) {
                    if (customer.isActive) {
                        if (customer.isBilling) {
                            await sequelize.models.DomainCustomer.update(
                                { isActive: false },
                                {
                                    where: {
                                        userDomainId: customer.userDomainId,
                                        isBilling: true,
                                        id: { [sequelize.Op.ne]: customer.id },
                                    },
                                    transaction: options.transaction,
                                }
                            );
                        }
                        if (customer.isShipping) {
                            await sequelize.models.DomainCustomer.update(
                                { isActive: false },
                                {
                                    where: {
                                        userDomainId: customer.userDomainId,
                                        isShipping: true,
                                        id: { [sequelize.Op.ne]: customer.id },
                                    },
                                    transaction: options.transaction,
                                }
                            );
                        }
                    }
                },
            },
        }
    );

    DomainCustomer.associate = function (models) {
        DomainCustomer.belongsTo(models.UserDomain, {
            foreignKey: 'userDomainId',
            as: 'userDomain',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
    };

    return DomainCustomer;
};
