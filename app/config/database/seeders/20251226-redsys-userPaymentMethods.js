'use strict';

require('dotenv').config({ path: '/usr/src/app/.env' }); // Carga .env
const { Crypt } = require('/usr/src/app/src/services/base/Crypt.ts');

module.exports = {
    async up(queryInterface, Sequelize) {
        // Instancia Crypt con la misma config que la app
        const crypt = new Crypt(
            process.env.TOKEN_ALGORITHM,
            process.env.TOKEN_ENCRYPTION_SECRET
        );

        // Credenciales Redsys (merchantCode + secretKey)
        const credentials = JSON.stringify({
            merchantCode: '999008881', // <-- tu FUC
            secretKey: 'sq7HjrUOBfKmC576ILgskD5srU870gJ7' // <-- clave Redsys (base64)
        });

        const encryptedToken = crypt.encrypt(credentials);

        await queryInterface.bulkInsert(
            'userPaymentMethods',
            [
                {
                    id: 2,
                    userId: 1,
                    paymentMethodId: 7, // Redsys
                    status: 'active',
                    mode: 'development', // development | production
                    paymentToken: encryptedToken,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            {
                updateOnDuplicate: [
                    'status',
                    'mode',
                    'paymentToken',
                    'updatedAt'
                ]
            }
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete(
            'userPaymentMethods',
            { id: 2 }
        );
    },
};
