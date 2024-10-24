# Build stage
FROM node:16-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build:ci

# Production stage
FROM node:16-alpine AS production

WORKDIR /app

COPY --from=builder /app/.next /app/.next
COPY --from=builder /app/public /app/public
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/node_modules ./node_modules

# Install only production dependencies
RUN npm install --production

EXPOSE 3000

CMD ["npm", "run", "start"]
