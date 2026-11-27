'use strict';

module.exports = (sequelize, DataTypes) => {
    const DomainSigningKey = sequelize.define(
        'DomainSigningKey',
        {
            id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },
            domainId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                comment: 'FK → userDomains.id',
            },
            purpose: {
                type: DataTypes.STRING(16),
                allowNull: false,
                validate: { isIn: [['cart', 'callback']] },
            },
            enabled: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            keyId: {
                type: DataTypes.STRING(64),
                allowNull: false,
            },
            encryptedSecret: {
                type: DataTypes.TEXT,
                allowNull: false,
            },
            previousKeyId: {
                type: DataTypes.STRING(64),
                allowNull: true,
            },
            previousEncryptedSecret: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            previousValidUntil: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: 'domainSigningKeys',
            timestamps: true,
            indexes: [{ unique: true, fields: ['domainId', 'purpose'] }],
        }
    );

    DomainSigningKey.associate = function (models) {
        DomainSigningKey.belongsTo(models.UserDomain, {
            foreignKey: 'domainId',
            as: 'userDomain',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
    };

    return DomainSigningKey;
};
