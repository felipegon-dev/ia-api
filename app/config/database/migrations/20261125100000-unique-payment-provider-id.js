'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const duplicates = await queryInterface.sequelize.query(
            'SELECT 1 FROM userPaymentOrders GROUP BY providerId HAVING COUNT(*) > 1 LIMIT 1',
            { type: Sequelize.QueryTypes.SELECT },
        );
        if (duplicates.length) {
            throw new Error('Duplicate payment provider IDs exist; reconcile them before applying this migration');
        }
        await queryInterface.addIndex('userPaymentOrders', ['providerId'], {
            name: 'userPaymentOrders_providerId_unique',
            unique: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeIndex('userPaymentOrders', 'userPaymentOrders_providerId_unique');
    },
};
