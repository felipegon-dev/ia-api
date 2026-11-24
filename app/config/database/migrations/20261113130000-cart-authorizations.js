'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('cartAuthorizations', {
            domainId: { type: Sequelize.INTEGER, primaryKey: true, allowNull: false },
            authorizationId: { type: Sequelize.STRING(128), primaryKey: true, allowNull: false },
            requestHash: { type: Sequelize.STRING(64), allowNull: false },
            snapshot: { type: Sequelize.TEXT('long'), allowNull: true },
            redirectUrl: { type: Sequelize.TEXT, allowNull: true },
            createdAt: { type: Sequelize.DATE, allowNull: false },
        });
    },
    async down(queryInterface) {
        await queryInterface.dropTable('cartAuthorizations');
    },
};
