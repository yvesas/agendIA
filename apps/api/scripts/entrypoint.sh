#!/bin/sh
set -e

echo "[entrypoint] Applying database migrations..."
node dist/db/migrate.js

echo "[entrypoint] Seeding database..."
node dist/db/seed.js

echo "[entrypoint] Starting API on port ${API_PORT:-3001}..."
exec node dist/main.js
