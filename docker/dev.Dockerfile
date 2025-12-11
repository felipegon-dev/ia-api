FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./

CMD ["sh", "-c", "npm install && npm run dev"]