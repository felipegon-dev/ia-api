'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.bulkInsert(
            'userDomains',
            [
                {
                    id: 1,
                    userId: 1,
                    domain: 'test-site.com',
                    createdAt: new Date('2025-12-15T19:59:35'),
                    updatedAt: new Date('2025-12-15T19:59:35'),
                },
            ],
            {
                updateOnDuplicate: ['userId', 'domain', 'updatedAt']
            }
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('userDomains', { id: 1 });
    },
};
