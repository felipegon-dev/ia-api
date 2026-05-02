# ---- Production stage ----
FROM node:22-alpine AS production
WORKDIR /usr/src/app
COPY app/package*.json ./
RUN npm ci --omit=dev
# Copiar migraciones y config de sequelize (son JS nativos, no necesitan compilación)
COPY app/config/database/migrations ./config/database/migrations
COPY app/config/database/config/config.json ./config/database/config/config.json
# Crear .sequelizerc para indicar rutas correctas
RUN echo "const path = require('path'); module.exports = { 'config': path.resolve('config/database/config/config.json'), 'migrations-path': path.resolve('config/database/migrations') };" > .sequelizerc

CMD ["sh", "-c", "npx sequelize-cli db:migrate --env production"]
