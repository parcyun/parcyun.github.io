FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY mail.mjs ledger.mjs server.mjs ./
USER node
CMD ["node","server.mjs"]
