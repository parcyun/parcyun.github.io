FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json server.mjs search.cjs ./
USER node
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node","server.mjs"]
