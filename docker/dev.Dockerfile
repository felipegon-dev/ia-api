FROM node:22-alpine

WORKDIR /usr/src/app

CMD ["sh", "-c", "npm install && npm run dev"]