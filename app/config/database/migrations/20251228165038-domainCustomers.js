'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('domainCustomers', {
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
        comment: 'Domain owner of the customer (FK → userDomains.id). Example: 1',
      },

      isBilling: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indicates if this address is billing. Example: true',
      },

      isShipping: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indicates if this address is shipping. Example: true',
      },

      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indicates if this address is currently being used. Example: true',
      },

      fullName: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Full name of the customer. Example: "Pepe Pérez"',
      },

      email: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Email address. Example: "pepe@pepe.com"',
      },

      phone: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Phone number. Example: "+34600111222"',
      },

      street: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Street address. Example: "123 Main St"',
      },

      city: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'City. Example: "Sample City"',
      },

      state: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'State / Province. Example: "CA"',
      },

      zip: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'ZIP / Postal code. Example: "12345"',
      },

      country: {
        type: Sequelize.STRING(2),
        allowNull: false,
        comment: 'Country code (ISO 3166-1 alpha-2). Example: "ES"',
      },

      company: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Company name (optional). Example: "ACME Corp"',
      },

      vatId: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'VAT ID (optional). Example: "ESB12345678"',
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Creation timestamp',
      },

      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Last update timestamp',
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('domainCustomers');
  },
};
