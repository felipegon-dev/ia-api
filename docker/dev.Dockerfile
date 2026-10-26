FROM node:22.23.4-alpine

WORKDIR /usr/src/app

CMD ["sh", "-c", "npm install && npm run dev"]