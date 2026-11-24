# Build context is the project root (see docker-compose.yml), because db:init also reads database/schema.sql.
FROM node:20-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ ./
COPY database/ /app/database/
EXPOSE 5000
CMD ["node", "src/server.js"]
