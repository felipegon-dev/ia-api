'use strict';

module.exports = (sequelize, DataTypes) => {
    const DomainPreferences = sequelize.define(
        'DomainPreferences',
        {
            id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },

            userDomainId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                comment: 'Domain owner of the customer (FK → userDomains.id). Example: 1',
            },

            changeAddressUrl: {
                type: DataTypes.STRING,
                allowNull: true,
            },

            template: {
                type: DataTypes.STRING,
                allowNull: true,
            },

            googleFeedUrl: {
                type: DataTypes.STRING,
                allowNull: true,
            },
        },
        {
            tableName: 'domainPreferences',
            timestamps: true,
        }
    );


    DomainPreferences.associate = function (models) {
        DomainPreferences.belongsTo(models.UserDomain, {
            foreignKey: 'userDomainId',
            as: 'userDomain',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
    };

    return DomainPreferences;
};
