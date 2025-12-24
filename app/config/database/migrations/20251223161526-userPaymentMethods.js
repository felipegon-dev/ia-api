'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('userPaymentMethods', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },

      paymentMethodId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'paymentMethods',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },

      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
      },

      paymentToken: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Provider token used to charge the user'
      },

      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Extra provider-specific data'
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

    // Evitar duplicados por usuario y método de pago
    await queryInterface.addConstraint('userPaymentMethods', {
      fields: ['userId', 'paymentMethodId'],
      type: 'unique',
      name: 'unique_user_payment_method'
    });
  },

  async down(queryInterface, Sequelize) {
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_userPaymentMethods_status";'
      );
    }

    await queryInterface.dropTable('userPaymentMethods');
  }
};
