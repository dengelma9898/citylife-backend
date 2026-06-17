# syntax=docker/dockerfile:1

# --- Stage 1: Build ---
# Compiles TypeScript; devDependencies (TypeScript, Nest CLI) stay in this stage only.
FROM node:24-slim AS builder

ARG NODE_ENV=prd

WORKDIR /app

COPY package*.json ./
ENV HUSKY=0
RUN npm ci

COPY . .
RUN npm run build:${NODE_ENV}

# --- Stage 2: Runtime ---
# Only production dependencies, compiled output, and runtime assets.
FROM node:24-slim AS production

ARG NODE_ENV=prd
ARG PORT=3000

WORKDIR /app

COPY package*.json ./
ENV HUSKY=0
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/pass-templates ./pass-templates
COPY --from=builder --chown=node:node /app/.env.${NODE_ENV} ./.env.${NODE_ENV}

ENV NODE_ENV=${NODE_ENV}
ENV PORT=${PORT}

USER node

EXPOSE ${PORT}

CMD ["node", "dist/main.js"]
