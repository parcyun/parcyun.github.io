FROM node:24-slim
WORKDIR /app/server/spell-battle
COPY package*.json ./
RUN npm ci --omit=dev
COPY qr.mjs daily-close.mjs player-focus.mjs engine.mjs storage.mjs server.mjs identity-bridge.js corpus.json ./
COPY geoweb/ ../geoweb-battle/
COPY geoGameDifficulty.js ../../src/components/
COPY scoring.js context-hints.js geo-scoring.js ../../public/spell-drill/
COPY spell-drill.svg ../../public/qr/
ENV GOOGLE_CLOUD_PROJECT=parcyun
CMD ["node", "server.mjs"]
