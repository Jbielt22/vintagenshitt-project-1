FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json

RUN npm ci --omit=dev

COPY backend/ ./backend/
COPY assets/ ./assets/

EXPOSE 5000

CMD ["node", "backend/src/server.js"]
