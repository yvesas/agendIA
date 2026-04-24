# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# Builder: install full deps (incl. dev) and compile the NestJS app.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /repo

# Only workspace manifests first, so `npm ci` layer is cached until deps change.
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN npm ci

# Build the shared contracts package first so api can import from it.
COPY packages/contracts ./packages/contracts
RUN npm run build --workspace=@agendia/contracts

# Copy api sources (web sources are not needed to build the api).
COPY apps/api ./apps/api

RUN npm run build --workspace=@agendia/api

# -----------------------------------------------------------------------------
# Runtime: ship compiled js + migrations + workspace node_modules only.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Preserve the monorepo layout so both hoisted and workspace-local node_modules
# resolve correctly. Some deps (e.g. @nestjs/cache-manager) are not hoisted and
# only appear under apps/api/node_modules.
COPY --from=builder /repo/package.json /repo/package-lock.json ./
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder /repo/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /repo/apps/api/package.json ./apps/api/package.json
COPY --from=builder /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /repo/apps/api/dist ./apps/api/dist
COPY --from=builder /repo/apps/api/src/db/migrations ./apps/api/src/db/migrations
COPY apps/api/scripts/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

WORKDIR /app/apps/api
EXPOSE 3001

CMD ["/usr/local/bin/entrypoint.sh"]
