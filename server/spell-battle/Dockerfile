FROM node:24-slim
WORKDIR /app/server/spell-battle
COPY package*.json ./
RUN npm ci --omit=dev
COPY engine.mjs storage.mjs server.mjs identity-bridge.js corpus.json ./
COPY scoring.js context-hints.js ../../public/spell-drill/
ENV GOOGLE_CLOUD_PROJECT=parcyun
CMD ["node", "server.mjs"]
