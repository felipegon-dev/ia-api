'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('cartAuthorizations', 'orderId', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'userPaymentOrders', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
        });
        await queryInterface.addIndex('cartAuthorizations', ['orderId'], {
            name: 'cartAuthorizations_orderId',
        });

        const rows = await queryInterface.sequelize.query(
            'SELECT domainId, authorizationId, snapshot FROM cartAuthorizations WHERE snapshot IS NOT NULL',
            { type: Sequelize.QueryTypes.SELECT },
        );
        let unresolved = 0;
        for (const row of rows) {
            let snapshot;
            try {
                snapshot = JSON.parse(row.snapshot);
            } catch {
                unresolved++;
                continue;
            }
            if (!snapshot || typeof snapshot.providerId !== 'string' || !snapshot.providerId) {
                unresolved++;
                continue;
            }
            const orders = await queryInterface.sequelize.query(
                'SELECT id FROM userPaymentOrders WHERE userDomainId = :domainId AND BINARY providerId = BINARY :providerId LIMIT 2',
                { replacements: { domainId: row.domainId, providerId: snapshot.providerId }, type: Sequelize.QueryTypes.SELECT },
            );
            if (orders.length !== 1) {
                unresolved++;
                continue;
            }
            await queryInterface.sequelize.query(
                'UPDATE cartAuthorizations SET orderId = :orderId WHERE domainId = :domainId AND authorizationId = :authorizationId',
                { replacements: { orderId: orders[0].id, domainId: row.domainId, authorizationId: row.authorizationId } },
            );
        }
        if (unresolved) {
            console.warn(`${unresolved} cart authorization(s) could not be linked to a unique order; review manually.`);
        }
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('cartAuthorizations', 'orderId');
    },
};
