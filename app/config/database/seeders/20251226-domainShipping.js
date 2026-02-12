'use strict';

const { Currency } = require('/usr/src/app/config/database/vo/Currency.ts'); // ajusta path según tu proyecto

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        await queryInterface.bulkInsert(
            'domainShipping',
            [
                {
                    id: 1,
                    userDomainId: 1,
                    name: 'Express',
                    code: 'EXPRESS',
                    price: 9.99,
                    currency: Currency.EUR().value,
                    deliveryTimeDescription: '1-2 business days',
                    freeShippingFrom: 100.0,
                    active: true,
                    defaultMethod: true,
                    createdAt: now,
                    updatedAt: now,
                },
                {
                    id: 2,
                    userDomainId: 1,
                    name: 'Standard',
                    code: 'STANDARD',
                    price: 4.99,
                    currency: Currency.EUR().value,
                    deliveryTimeDescription: '3-5 business days',
                    freeShippingFrom: 50.0,
                    active: true,
                    defaultMethod: false,
                    createdAt: now,
                    updatedAt: now,
                },
            ],
            {
                updateOnDuplicate: [
                    'name',
                    'code',
                    'price',
                    'currency',
                    'deliveryTimeDescription',
                    'freeShippingFrom',
                    'active',
                    'defaultMethod',
                    'updatedAt',
                ],
            }
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('domainShipping', { userDomainId: 1 });
    },
};
