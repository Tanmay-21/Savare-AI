FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build:server

EXPOSE 3001
CMD ["node", "dist-server/server.cjs"]
