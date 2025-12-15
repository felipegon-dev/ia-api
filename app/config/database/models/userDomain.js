'use strict';

module.exports = (sequelize, DataTypes) => {
    const UserDomain = sequelize.define(
        'UserDomain',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            userId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            domain: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true // cada domain único globalmente
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            }
        },
        {
            tableName: 'userDomains',
            timestamps: true
        }
    );

    // Relaciones
    UserDomain.associate = function(models) {
        UserDomain.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });
    };

    return UserDomain;
};
