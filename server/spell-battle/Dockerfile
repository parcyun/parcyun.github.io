FROM node:24-slim
WORKDIR /app/server/spell-battle
COPY package*.json ./
RUN npm ci --omit=dev
COPY qr.mjs engine.mjs storage.mjs server.mjs identity-bridge.js corpus.json ./
COPY geoweb/ ../geoweb-battle/
COPY scoring.js context-hints.js ../../public/spell-drill/
COPY spell-drill.svg ../../public/qr/
ENV GOOGLE_CLOUD_PROJECT=parcyun
CMD ["node", "server.mjs"]
