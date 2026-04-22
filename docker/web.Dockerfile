# syntax=docker/dockerfile:1.7

# -----------------------------------------------------------------------------
# Builder: install full deps and build the Next.js app (standalone output).
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /repo

# NEXT_PUBLIC_* vars are baked into the client bundle at build time and must
# be supplied as build args, not runtime env.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN npm ci

COPY apps/web ./apps/web

RUN npm run build --workspace=@agendia/web

# -----------------------------------------------------------------------------
# Runtime: standalone server + static assets only.
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

# Next.js standalone output carries a trimmed node_modules with everything
# needed to run the server, preserving the monorepo layout.
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
