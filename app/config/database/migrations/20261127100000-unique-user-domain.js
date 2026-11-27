'use strict';

module.exports = {
    async up(queryInterface) {
        await queryInterface.addConstraint('userDomains', {
            fields: ['domain'],
            type: 'unique',
            name: 'unique_user_domain_name',
        });
    },

    async down(queryInterface) {
        await queryInterface.removeConstraint('userDomains', 'unique_user_domain_name');
    },
};
