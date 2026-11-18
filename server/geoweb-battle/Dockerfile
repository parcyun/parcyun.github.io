FROM node:24-slim
WORKDIR /app
COPY server/geoweb-battle/package*.json server/geoweb-battle/
RUN cd server/geoweb-battle && npm ci --omit=dev
COPY server/geoweb-battle/*.mjs server/geoweb-battle/
COPY server/geoweb-battle/*.js server/geoweb-battle/
COPY server/geoweb-battle/corpus.json server/geoweb-battle/
COPY public/spell-drill/scoring.js public/spell-drill/
COPY public/qr/spell-drill.svg public/qr/
ENV GOOGLE_CLOUD_PROJECT=parcyun
CMD ["node", "server/geoweb-battle/server.mjs"]
