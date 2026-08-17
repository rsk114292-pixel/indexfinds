#!/bin/sh
set -eu

echo "[start-prod] running database migrations"
pnpm migration:run:prod

echo "[start-prod] starting api"
exec node dist/src/main
