#!/usr/bin/env bash
# Despliegue en VPS con Docker Compose (producción): pull, build del frontend en el host y recrea contenedores.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

git pull --ff-only

echo ">>> frontend: npm ci && npm run build (genera frontend/dist para Caddy)"
(cd "$ROOT/frontend" && npm ci && npm run build)

echo ">>> docker compose -f docker-compose.prod.yml up -d --build"
docker compose -f docker-compose.prod.yml up -d --build
