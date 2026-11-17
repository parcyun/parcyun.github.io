FROM node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY *.mjs *.js corpus.json ./
ENV GOOGLE_CLOUD_PROJECT=parcyun
CMD ["node", "server.mjs"]
