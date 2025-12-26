'use strict';

require('dotenv').config(); // <-- Esto carga el .env
console.log(process.cwd())
const { Crypt } = require('/usr/src/app/src/application/services/base/Crypt.ts');

module.exports = {
    async up(queryInterface, Sequelize) {
        // Crear instancia de crypt con el mismo algoritmo y key que tu app
        const crypt = new Crypt(process.env.TOKEN_ALGORITHM, process.env.TOKEN_ENCRYPTION_SECRET);

        // Datos a cifrar (Client ID y Client Secret)
        const credentials = JSON.stringify({
            client_id: 'AXbL8_3-ymPpwj9OlijE7e2lsIe9F896iwcAUw9z17Q72XYUTp8JDnpiA2KudiutMnUkRGdhRbhlrNJ0',
            client_secret: 'EC9oorHYm0yanfupIvm_Xh5nZNqyVsjGvVGqhldQsixclkhlpfZaZXL3vc4XS0nL4AsJVRmT-IUszk-Q'
        });

        const encryptedToken = crypt.encrypt(credentials);

        await queryInterface.bulkInsert(
            'userPaymentMethods',
            [
                {
                    id: 1,
                    userId: 1,
                    paymentMethodId: 1, // PayPal
                    status: 'active',
                    mode: 'development',  // nuevo campo
                    paymentToken: encryptedToken, // guardamos Client ID + Secret cifrados
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
            {
                updateOnDuplicate: ['status', 'mode', 'paymentToken', 'updatedAt']
            }
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('userPaymentMethods', { id: 1 });
    },
};
