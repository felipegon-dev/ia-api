#!/usr/bin/env node

// Entrypoint de producción del worker — usa JS compilado en dist/, sin ts-node
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

require('../dist/run/worker-redis');

