# ---- Production stage ----
FROM node:22-alpine AS production
WORKDIR /usr/src/app
COPY app/package*.json ./
RUN npm ci --omit=dev
# Copiar migraciones y config de sequelize
COPY app/config/database/migrations ./config/database/migrations
COPY app/config/database/config/config.js ./config/database/config/config.js
COPY app/.sequelizerc ./.sequelizerc

CMD ["sh", "-c", "npx sequelize-cli db:migrate --env production"]
