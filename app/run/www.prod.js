#!/usr/bin/env node

// Entrypoint de producción — usa JS compilado en dist/, sin ts-node
// Los aliases (@config/*, @src/*, etc.) se resuelven con tsconfig-paths en runtime
const path = require('path');

require('tsconfig-paths').register({
    baseUrl: path.join(__dirname, '../dist'),
    paths: {
        '@src/*': ['src/*'],
        '@config/*': ['config/*'],
        '@run/*': ['run/*'],
        '@apptypes/*': ['src/types/*'],
    }
});

const app = require('../dist/run/app').default;
const debug = require('debug')('ia-checkout:server');
const http = require('http');
const logger = require('../dist/src/util/logger').default;

// ── Captura global de excepciones no manejadas ──────────────────────────────
process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException — proceso terminando');
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'unhandledRejection — promesa rechazada sin capturar');
});

if (!process.env.PORT) {
    throw new Error('PORT environment variable is required');
}

const port = normalizePort(process.env.PORT);
app.set('port', port);

const server = http.createServer(app);
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function normalizePort(val) {
    const port = parseInt(val, 10);
    if (isNaN(port)) return val;
    if (port >= 0) return port;
    return false;
}

function onError(error) {
    if (error.syscall !== 'listen') throw error;
    const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;
    switch (error.code) {
        case 'EACCES':
            logger.fatal({ bind }, bind + ' requires elevated privileges');
            process.exit(1);
        case 'EADDRINUSE':
            logger.fatal({ bind }, bind + ' is already in use');
            process.exit(1);
        default:
            throw error;
    }
}

function onListening() {
    const addr = server.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr?.port;
    logger.info({ bind }, 'Server listening on ' + bind);
    debug('Listening on ' + bind);
}

