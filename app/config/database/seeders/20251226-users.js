'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.bulkInsert(
            'users',
            [
                {
                    id: 1,
                    name: 'test',
                    email: 'sda@asdas.es',
                    password: 'aa', // idealmente cifrada
                    code: 'myuniqueuserid',
                    status: 'active',
                    createdAt: new Date('2025-12-15T18:51:21'),
                    updatedAt: new Date('2025-12-15T18:51:21'),
                },
            ],
            {
                updateOnDuplicate: ['name', 'email', 'password', 'code', 'status', 'updatedAt']
            }
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('users', { id: 1 });
    },
};
