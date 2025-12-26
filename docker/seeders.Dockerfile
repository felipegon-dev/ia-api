FROM node:22-alpine

# Crear directorio de trabajo
WORKDIR /usr/src/app

CMD ["sh", "-c", "npm install && cd config/database/ && npx sequelize-cli db:seed:all"]
