/**
 * TEST: Redsys Callback
 *
 * Genera parámetros Redsys firmados y hace POST a la API.
 *
 * USO:
 *   # Contra ngrok (tunnel activo):
 *   node tests/redsys-callback.test.js
 *
 *   # Directamente contra la API local (sin ngrok):
 *   TARGET_URL=http://localhost:3000 node tests/redsys-callback.test.js
 *
 *   # Con datos personalizados:
 *   ORDER_ID=260507120408 REDSYS_SECRET_KEY=sq7HjrUOBfKmC576ILgskD5srU870gJ7 node tests/redsys-callback.test.js
 *
 * VARIABLES DE ENTORNO:
 *   TARGET_URL          → URL base del servidor (default: ngrok URL)
 *   NGROK_URL           → URL pública de ngrok (solo si TARGET_URL no está definido)
 *   ORDER_ID            → providerId del pedido en la BD
 *   AMOUNT              → importe en céntimos (ej: 4784 = 47.84 EUR)
 *   DS_RESPONSE         → código de respuesta Redsys (0000 = autorizado)
 *   REDSYS_SECRET_KEY   → secretKey de Redsys en Base64 (en sandbox: sq7HjrUOBfKmC576ILgskD5srU870gJ7)
 */

const crypto = require('crypto');
const https  = require('https');
const http   = require('http');
const { URLSearchParams } = require('url');

// ─── CONFIGURACIÓN ────────────────────────────────────────────────────────────

const NGROK_URL   = process.env.NGROK_URL  || 'https://ungraved-intercoracoid-christoper.ngrok-free.dev';
const TARGET_URL  = process.env.TARGET_URL || NGROK_URL;
const CALLBACK    = '/api/v1/payment/callback';

/**
 * secretKey de Redsys tal como está en la BD (antes de cifrar con Crypt).
 * En sandbox Redsys el valor por defecto es: sq7HjrUOBfKmC576ILgskD5srU870gJ7
 */
const SECRET_KEY = process.env.REDSYS_SECRET_KEY || 'sq7HjrUOBfKmC576ILgskD5srU870gJ7';

/**
 * providerId del pedido que existe en la BD.
 * Debe coincidir con un registro en user_payment_orders.
 */
const ORDER_ID   = process.env.ORDER_ID   || '000001'; // ← cambia esto

/** Importe en céntimos (ej: 4784 = 47.84 EUR) */
const AMOUNT     = process.env.AMOUNT     || '4784';

/** Código de respuesta Redsys: 0000 = pago autorizado */
const DS_RESPONSE = process.env.DS_RESPONSE || '0000';

// ─── GENERACIÓN DE FIRMA ──────────────────────────────────────────────────────

function buildMerchantParams(orderId, amount, response) {
    const params = {
        Ds_Date:            new Date().toLocaleDateString('es-ES'),
        Ds_Hour:            new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        Ds_Amount:          amount,
        Ds_Currency:        '978',          // EUR
        Ds_Order:           orderId,
        Ds_MerchantCode:    '999008881',    // código sandbox Redsys
        Ds_Terminal:        '1',
        Ds_Response:        response,
        Ds_TransactionType: '0',
        Ds_SecurePayment:   '1',
        Ds_AuthorisationCode: '123456',
    };

    return Buffer.from(JSON.stringify(params)).toString('base64');
}

function sign(secretKeyPlain, orderId, merchantParamsB64) {
    // 1. Clave en Buffer desde Base64
    const key = Buffer.from(secretKeyPlain, 'base64');

    // 2. Order con padding ZERO a múltiplo de 8
    const orderBuffer  = Buffer.from(orderId, 'utf8');
    const blockSize    = 8;
    const paddedLength = Math.ceil(orderBuffer.length / blockSize) * blockSize;
    const orderPadded  = Buffer.alloc(paddedLength);
    orderBuffer.copy(orderPadded);

    // 3. 3DES-CBC con IV 0
    const iv     = Buffer.alloc(8, 0);
    const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
    cipher.setAutoPadding(false);
    const keyOrder = Buffer.concat([cipher.update(orderPadded), cipher.final()]);

    // 4. HMAC-SHA256 → Base64URL
    const sig = crypto
        .createHmac('sha256', keyOrder)
        .update(merchantParamsB64)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return sig;
}

// ─── POST ─────────────────────────────────────────────────────────────────────

async function postCallback() {
    const merchantParams = buildMerchantParams(ORDER_ID, AMOUNT, DS_RESPONSE);
    const signature      = sign(SECRET_KEY, ORDER_ID, merchantParams);

    const body = new URLSearchParams({
        Ds_SignatureVersion:   'HMAC_SHA256_V1',
        Ds_MerchantParameters: merchantParams,
        Ds_Signature:          signature,
    }).toString();

    const url = new URL(CALLBACK, TARGET_URL);

    console.log('\n──────────────────────────────────────────');
    console.log('POST', url.toString());
    console.log('Ds_Order           :', ORDER_ID);
    console.log('Ds_Amount          :', AMOUNT, '(céntimos →', (parseInt(AMOUNT) / 100).toFixed(2), 'EUR)');
    console.log('Ds_Response        :', DS_RESPONSE, DS_RESPONSE === '0000' ? '(AUTORIZADO ✅)' : '(DENEGADO ❌)');
    console.log('MerchantParameters :', merchantParams);
    console.log('Signature          :', signature);
    console.log('──────────────────────────────────────────\n');

    return doRequest(url, body);
}

function doRequest(url, body, redirectCount) {
    redirectCount = redirectCount || 0;
    if (redirectCount > 5) {
        console.error('❌ Demasiadas redirecciones');
        return Promise.resolve();
    }

    const transport = url.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
        const req = transport.request(
            {
                hostname: url.hostname,
                path:     url.pathname + (url.search || ''),
                method:   'POST',
                headers: {
                    'Content-Type':   'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(body),
                    'ngrok-skip-browser-warning': '1',
                },
            },
            (res) => {
                // Seguir redirecciones 301/302/307/308
                if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                    const redirectUrl = new URL(res.headers.location, url.origin);
                    console.log('↪  Redirect', res.statusCode, '→', redirectUrl.toString());
                    resolve(doRequest(redirectUrl, body, redirectCount + 1));
                    return;
                }

                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    console.log('HTTP Status :', res.statusCode);
                    console.log('Response    :', data);
                    console.log('──────────────────────────────────────────\n');

                    if (res.statusCode === 200) {
                        console.log('✅  Callback procesado correctamente');
                    } else {
                        console.log('❌  Error en el callback (status', res.statusCode + ')');
                        if (res.statusCode === 404) {
                            console.log('    → Comprueba que ngrok está activo y NGROK_URL apunta al tunnel correcto');
                        }
                        if (res.statusCode === 500) {
                            console.log('    → El ORDER_ID no existe en la BD o la secretKey de Redsys no coincide');
                        }
                    }
                    resolve(res.statusCode);
                });
            }
        );

        req.on('error', (err) => {
            console.error('❌ Error de conexión:', err.message);
            console.log('   → Comprueba que ngrok está corriendo: ngrok http 3000');
            reject(err);
        });
        req.write(body);
        req.end();
    });
}

postCallback().catch(err => {
    console.error('Error ejecutando el test:', err);
    process.exit(1);
});


