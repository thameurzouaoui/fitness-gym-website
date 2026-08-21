FROM node:22-alpine

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm install --no-fund --no-audit

COPY backend/ ./backend/
COPY ["front end/", "./front end/"]

WORKDIR /app/backend
ENV DATA_DIR=/data
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server.js"]