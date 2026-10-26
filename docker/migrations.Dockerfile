FROM node:22.23.4-alpine

# Crear directorio de trabajo
WORKDIR /usr/src/app

# Comando por defecto: ejecutar migraciones
CMD ["sh", "-c", "npm install && npx sequelize-cli db:migrate"]
