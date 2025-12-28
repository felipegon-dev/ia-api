'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('userPaymentOrders', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      userPaymentMethodId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'userPaymentMethods',
          key: 'id'
        },
      },

      userDomainId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'userDomains',
          key: 'id'
        },
      },

      providerId: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Response from the payment provider (PayPal, Klarna, etc.)'
      },

      providerMetadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Response from the payment provider (PayPal, Klarna, etc.)'
      },

      providerAttemptsSync: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Attempts to sync with the payment provider'
      },

      cartItems: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Details of the items purchased, includes product IDs, quantities, prices, taxes.'
      },

      addressItems: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Shipping and billing address details, billing address and shipping address.'
      },

      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Total amount of the order, all cart items with shipping'
      },

      shippingDetails: {
        type: Sequelize.JSON,
        allowNull: false,
        comment: 'Shipping methods with cost for the order'
      },

      description: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Description of the order'
      },

      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Order status'
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },

      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Opcional: índice por userPaymentMethodId para consultas rápidas
    await queryInterface.addIndex('userPaymentOrders', ['userPaymentMethodId']);
    await queryInterface.addIndex('userPaymentOrders', ['userDomainId']);
  },

  async down(queryInterface, Sequelize) {
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_userPaymentOrders_status";'
      );
      await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_userPaymentOrders_mode";'
      );
    }

    await queryInterface.dropTable('userPaymentOrders');
  }
};
