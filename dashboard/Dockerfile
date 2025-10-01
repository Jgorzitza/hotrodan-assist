# syntax=docker/dockerfile:1
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --include=dev || npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run prisma:generate || true
RUN npm run build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "./build/server/index.js"]

# syntax=docker/dockerfile:1.6
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-bullseye AS base
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM deps AS prod-deps
RUN npm prune --omit=dev

FROM base AS runtime
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json

EXPOSE 8080
CMD ["npm", "run", "start"]
