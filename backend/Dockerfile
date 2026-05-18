# syntax=docker/dockerfile:1
# Build from repository root: docker build -f backend/Dockerfile --target development .

FROM node:22-bookworm-slim AS development
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/docker-entrypoint.dev.sh /usr/local/bin/docker-entrypoint.dev.sh
RUN sed -i 's/\r$//' /usr/local/bin/docker-entrypoint.dev.sh \
  && chmod +x /usr/local/bin/docker-entrypoint.dev.sh
COPY backend/ ./
COPY shared/ /app/shared/
EXPOSE 2567
ENTRYPOINT ["docker-entrypoint.dev.sh"]
CMD ["npm", "run", "start"]

FROM node:22-bookworm-slim AS production
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
COPY shared/ /app/shared/
RUN npm run build
ENV NODE_ENV=production
EXPOSE 2567
CMD ["node", "build/backend/src/index.js"]