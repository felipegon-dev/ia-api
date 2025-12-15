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

    // Relación con UserDomain
    User.associate = function(models) {
        User.hasMany(models.UserDomain, {
            foreignKey: 'userId',
            as: 'domains', // para usar user.getDomains()
        });
    };

    return User;
};
