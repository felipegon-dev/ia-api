'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('domainSigningKeys', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      domainId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'userDomains', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      purpose: {
        type: Sequelize.STRING(16),
        allowNull: false,
        comment: "'cart' (shop → checkout) | 'callback' (checkout → shop)",
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      keyId: {
        type: Sequelize.STRING(64),
        allowNull: false
      },
      encryptedSecret: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'AES-256-GCM with HMAC_ENCRYPTION_SECRET',
      },
      previousKeyId: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      previousEncryptedSecret: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      previousValidUntil: {
        type: Sequelize.DATE,
        allowNull: true
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
    await queryInterface.addIndex('domainSigningKeys', ['domainId', 'purpose'], {
      unique: true,
      name: 'domainSigningKeys_domainId_purpose_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('domainSigningKeys');
  }
};
