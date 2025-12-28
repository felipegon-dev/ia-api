'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        await queryInterface.bulkInsert(
            'domainProducts',
            [
                {
                    id: 1,
                    userDomainId: 1,

                    article_id: 'SKU-NP-COMBAT-53',
                    title: 'NeilPryde Combat 5.3 2024',
                    description: '<p>High performance wave sail designed for radical windsurfing.</p>',
                    link: 'https://example.com/products/neilpryde-combat-53',
                    image_link: 'https://example.com/images/combat-53.jpg',

                    availability: 'in stock',
                    price: 799.00,
                    unit_pricing_measure: null,
                    product_type: 'Windsurfing > Sails',
                    brand: 'NeilPryde',
                    condition: 'new',
                    item_group_id: 'COMBAT-2024',

                    gtin: '8715738852341',
                    mpn: 'NP-COMBAT-53',
                    google_product_category: 'Sporting Goods > Water Sports > Windsurfing',

                    sale_price: 699.00,
                    sale_price_effective_date: '2025-01-01T00:00/2025-01-10T23:59',

                    tax: JSON.stringify({
                        country: 'ES',
                        rate: 21
                    }),


                    gender: 'unisex',
                    age_group: 'adult',
                    color: 'Red / Black',
                    size: '5.3',
                    material: 'Monofilm',
                    pattern: 'Solid',
                    adult: false,

                    createdAt: now,
                    updatedAt: now,
                },

                {
                    id: 2,
                    userDomainId: 1,

                    article_id: 'SKU-FANATIC-GRIP-89',
                    title: 'Fanatic Grip 89 LTD 2024',
                    description: '<p>Compact wave board with excellent control and speed.</p>',
                    link: 'https://example.com/products/fanatic-grip-89',
                    image_link: 'https://example.com/images/grip-89.jpg',

                    availability: 'in stock',
                    price: 1899.00,
                    unit_pricing_measure: null,
                    product_type: 'Windsurfing > Boards',
                    brand: 'Fanatic',
                    condition: 'new',
                    item_group_id: 'GRIP-2024',

                    gtin: '9008415954321',
                    mpn: 'FAN-GRIP-89',
                    google_product_category: 'Sporting Goods > Water Sports > Windsurfing',

                    sale_price: null,
                    sale_price_effective_date: null,

                    tax: JSON.stringify({
                        country: 'ES',
                        rate: 21
                    }),

                    gender: 'unisex',
                    age_group: 'adult',
                    color: 'Blue / White',
                    size: '89L',
                    material: 'Carbon',
                    pattern: 'Graphic',
                    adult: false,

                    createdAt: now,
                    updatedAt: now,
                },
            ],
            {
                updateOnDuplicate: [
                    'title',
                    'description',
                    'link',
                    'image_link',
                    'availability',
                    'price',
                    'unit_pricing_measure',
                    'product_type',
                    'brand',
                    'condition',
                    'item_group_id',
                    'gtin',
                    'mpn',
                    'google_product_category',
                    'sale_price',
                    'sale_price_effective_date',
                    'tax',
                    'gender',
                    'age_group',
                    'color',
                    'size',
                    'material',
                    'pattern',
                    'adult',
                    'updatedAt',
                ],
            }
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete(
            'domainProducts',
            {
                id: [1, 2],
            }
        );
    },
};
