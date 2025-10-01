# syntax=docker/dockerfile:1
# Multi-stage build for production-ready dashboard
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm install

FROM deps AS build
WORKDIR /app
COPY . .
# Generate Prisma client (fail fast if error)
RUN npm run prisma:generate
# Build application
RUN npm run build

FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Install production dependencies only
RUN npm install --omit=dev

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app

# Copy production dependencies
COPY --from=prod-deps /app/node_modules ./node_modules
# Copy build artifacts
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json

# Expose port (standardized to 8080)
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=5 CMD wget -qO- http://localhost:${PORT:-8080}/ || exit 1

# Run server
CMD ["npm", "run", "start"]
