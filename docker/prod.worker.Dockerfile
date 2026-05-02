# ---- Build stage ----
FROM node:22-alpine AS builder
WORKDIR /usr/src/app
COPY app/package*.json ./
RUN npm ci
COPY app/ ./
# Compilar TypeScript y reescribir aliases
RUN ./node_modules/.bin/tsc --project tsconfig.json && ./node_modules/.bin/tsc-alias -p tsconfig.json
# Copiar archivos .json que tsc no incluye
RUN mkdir -p dist/config/database/config && \
    cp config/database/config/config.json dist/config/database/config/config.json
# ---- Production stage ----
FROM node:22-alpine AS production
WORKDIR /usr/src/app
COPY app/package*.json ./
RUN npm ci --omit=dev
# Copiar archivos compilados
COPY --from=builder /usr/src/app/dist ./dist
# Copiar entrypoint de producción del worker
COPY app/run/worker-redis.prod.js ./run/worker-redis.prod.js
CMD ["npm", "run", "prod:worker"]
