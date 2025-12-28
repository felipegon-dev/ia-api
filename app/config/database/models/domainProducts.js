'use strict';

module.exports = (sequelize, DataTypes) => {
    const DomainProducts = sequelize.define(
        'DomainProducts',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
                comment: 'Primary key',
            },

            userDomainId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                comment: 'Domain owner of the product (FK → userDomains.id)',
            },

            article_id: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'Google Feed: id — unique product identifier (SKU)',
            },

            title: {
                type: DataTypes.STRING(150),
                allowNull: false,
                comment: 'Google Feed: title — product name',
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: false,
                comment: 'Google Feed: description — detailed product description (HTML allowed)',
            },

            link: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'Google Feed: link — product landing page URL',
            },

            image_link: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'Google Feed: image_link — main product image URL',
            },

            availability: {
                type: DataTypes.ENUM(
                    'in stock',
                    'out of stock',
                    'preorder',
                    'backorder'
                ),
                allowNull: false,
                defaultValue: 'in stock',
                comment: 'Google Feed: availability',
            },

            price: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: false,
                comment: 'Google Feed: price — base product price',
            },

            unit_pricing_measure: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: 'Google Feed: unit_pricing_measure (e.g. 1kg, 100ml)',
            },

            product_type: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: 'Google Feed: product_type — merchant-defined category',
            },

            brand: {
                type: DataTypes.STRING,
                allowNull: false,
                comment: 'Google Feed: brand',
            },

            condition: {
                type: DataTypes.ENUM('new', 'used', 'refurbished'),
                allowNull: false,
                defaultValue: 'new',
                comment: 'Google Feed: condition',
            },

            item_group_id: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: 'Google Feed: item_group_id — variant group identifier',
            },

            gtin: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: 'Google Feed: gtin — barcode (EAN / UPC)',
            },

            mpn: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: 'Google Feed: mpn — manufacturer part number',
            },

            google_product_category: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: 'Google Feed: google_product_category',
            },

            sale_price: {
                type: DataTypes.DECIMAL(12, 2),
                allowNull: true,
                comment: 'Google Feed: sale_price — discounted price',
            },

            sale_price_effective_date: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: 'Google Feed: sale_price_effective_date',
            },

            tax: {
                type: DataTypes.JSON,
                allowNull: true,
                comment: 'Google Feed: tax configuration (JSON)',
            },

            gender: {
                type: DataTypes.ENUM('male', 'female', 'unisex'),
                allowNull: true,
                comment: 'Google Feed: gender',
            },

            age_group: {
                type: DataTypes.ENUM(
                    'newborn',
                    'infant',
                    'toddler',
                    'kids',
                    'adult'
                ),
                allowNull: true,
                comment: 'Google Feed: age_group',
            },

            color: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: 'Google Feed: color',
            },

            size: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: 'Google Feed: size',
            },

            material: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: 'Google Feed: material',
            },

            pattern: {
                type: DataTypes.STRING,
                allowNull: true,
                comment: 'Google Feed: pattern',
            },

            adult: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: 'Google Feed: adult content flag',
            },

            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },

            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
            },
        },
        {
            tableName: 'domainProducts',
            timestamps: true,
        }
    );

    // 🔗 Associations
    DomainProducts.associate = function (models) {
        DomainProducts.belongsTo(models.UserDomain, {
            foreignKey: 'userDomainId',
            as: 'domain',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
        });
    };

    return DomainProducts;
};
