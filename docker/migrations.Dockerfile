FROM node:22-alpine

# Crear directorio de trabajo
WORKDIR /usr/src/app

# Comando por defecto: ejecutar migraciones
CMD ["sh", "-c", "npm install && cd config/database && npx sequelize-cli db:migrate"]
