'use strict';

const { Currency } = require('/usr/src/app/config/database/vo/Currency.ts'); // ajusta path según tu proyecto

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('domainShipping', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
        comment: 'Primary key',
      },

      userDomainId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'userDomains',
          key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        comment: 'Domain owner of the shipping method (FK → userDomains.id)',
      },

      name: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Name of the shipping method. Example: "Express", "Standard"',
      },

      code: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Unique code for the shipping method. Example: "EXPRESS", "STANDARD"',
      },

      price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'Shipping cost for this method. Example: 9.99',
      },

      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: Currency.EUR().value, // <-- aquí usamos el VO
        comment: 'Currency code. Example: "EUR", "USD"',
      },

      deliveryTimeDescription: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Estimated delivery time. Example: "1-2 business days"',
      },

      freeShippingFrom: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Minimum order amount for free shipping. Example: 50.00',
      },

      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this shipping method is active',
      },

      defaultMethod: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this is the default shipping method',
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },

      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('domainShipping', ['userDomainId']);
    await queryInterface.addIndex('domainShipping', ['code']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('domainShipping');
  },
};
