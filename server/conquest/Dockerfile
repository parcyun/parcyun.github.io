FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server/conquest/package*.json ./server/conquest/
RUN npm ci --omit=dev --prefix server/conquest
COPY src/components ./src/components
COPY public ./public
COPY dist ./dist
COPY server/conquest/server.mjs server/conquest/storage.mjs ./server/conquest/
ENV CONQUEST_HOST=0.0.0.0 CONQUEST_STORAGE=firestore
CMD ["node","server/conquest/server.mjs"]
