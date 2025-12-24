'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('paymentMethods', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },

      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },

      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },

      provider: {
        type: Sequelize.STRING(50),
        allowNull: true
      },

      apiVersion: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'API version (e.g. v1, v2, 2023-10-16)'
      },

      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active'
      },

      position: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('paymentMethods');
    await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_paymentMethods_status";'
    );
  }
};
