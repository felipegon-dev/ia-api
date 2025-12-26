'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.bulkInsert(
            'paymentMethods',
            [
                {
                    id: 1,
                    name: 'paypal',
                    code: 'paypal',
                    provider: 'paypal',
                    apiVersion: 'v1',
                    status: 'active',
                    position: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                {
                    id: 2,
                    name: 'stripe',
                    code: 'stripe',
                    provider: 'stripe',
                    apiVersion: 'v1',
                    status: 'active',
                    position: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            {
                updateOnDuplicate: [
                    'name',
                    'provider',
                    'apiVersion',
                    'status',
                    'position',
                    'updatedAt',
                ],
            }
        );
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete('paymentMethods', {
            code: ['paypal', 'stripe'],
        });
    },
};
