'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('domainProducts', {
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
        comment: 'Domain owner of the product (FK → userDomains.id)',
      },

      article_id: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Google Feed: id — unique product identifier. Example: "SKU-12345"',
      },

      title: {
        type: Sequelize.STRING(150),
        allowNull: false,
        comment: 'Google Feed: title — product name. Example: "NeilPryde Combat 5.3 2024"',
      },

      description: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'Google Feed: description — detailed product description. HTML allowed.',
      },

      link: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Google Feed: link — landing page URL. Example: "https://shop.com/product/sku-12345"',
      },

      image_link: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Google Feed: image_link — main product image URL.',
      },

      availability: {
        type: Sequelize.ENUM(
            'in stock',
            'out of stock',
            'preorder',
            'backorder'
        ),
        allowNull: false,
        defaultValue: 'in stock',
        comment: 'Google Feed: availability. Example: "in stock"',
      },

      price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Google Feed: price — base price without currency. Example: 799.00',
      },

      unit_pricing_measure: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Google Feed: unit_pricing_measure. Example: "1kg", "100ml"',
      },

      product_type: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Google Feed: product_type — merchant-defined category. Example: "Windsurfing > Sails"',
      },

      brand: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Google Feed: brand. Example: "NeilPryde"',
      },

      condition: {
        type: Sequelize.ENUM('new', 'used', 'refurbished'),
        allowNull: false,
        defaultValue: 'new',
        comment: 'Google Feed: condition. Example: "new"',
      },

      item_group_id: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Google Feed: item_group_id — groups variants. Example: "COMBAT-2024"',
      },

      gtin: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Google Feed: gtin — barcode (EAN/UPC). Example: "8715738852341"',
      },

      mpn: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Google Feed: mpn — manufacturer part number. Example: "NP-COMBAT-53"',
      },

      google_product_category: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Google Feed: google_product_category. Example: "Sporting Goods > Water Sports > Windsurfing"',
      },

      sale_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Google Feed: sale_price — discounted price. Example: 699.00',
      },

      sale_price_effective_date: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Google Feed: sale_price_effective_date. Example: "2025-01-01T00:00/2025-01-10T23:59"',
      },

      tax: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Google Feed: tax — tax configuration. Example: {"country":"ES","rate":21}',
      },

      gender: {
        type: Sequelize.ENUM('male', 'female', 'unisex'),
        allowNull: true,
        comment: 'Google Feed: gender. Example: "unisex"',
      },

      age_group: {
        type: Sequelize.ENUM(
            'newborn',
            'infant',
            'toddler',
            'kids',
            'adult'
        ),
        allowNull: true,
        comment: 'Google Feed: age_group. Example: "adult"',
      },

      color: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Google Feed: color. Example: "Red / Black"',
      },

      size: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Google Feed: size. Example: "5.3"',
      },

      material: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Google Feed: material. Example: "Monofilm"',
      },

      pattern: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Google Feed: pattern. Example: "Solid"',
      },

      adult: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Google Feed: adult content flag. Example: false',
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

    await queryInterface.addIndex('domainProducts', ['userDomainId']);
    await queryInterface.addIndex('domainProducts', ['article_id']);
    await queryInterface.addIndex('domainProducts', ['item_group_id']);
  },

  async down(queryInterface, Sequelize) {
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_domainProducts_availability";'
      );
      await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_domainProducts_condition";'
      );
      await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_domainProducts_gender";'
      );
      await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_domainProducts_age_group";'
      );
    }

    await queryInterface.dropTable('domainProducts');
  },
};
