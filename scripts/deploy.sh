#!/usr/bin/env bash
# Run on the VPS from the repository root (same directory that contains frontend/, backend/, scripts/).
# Despliegue **sin Docker** (Node + PM2). Para Docker + Caddy usa scripts/pull-git-and-restart-docker.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

git pull --ff-only

echo ">>> frontend: npm ci && npm run build"
(cd "$ROOT/frontend" && npm ci && npm run build)

echo ">>> backend: npm ci && npm run build"
(cd "$ROOT/backend" && npm ci && npm run build)

ECOSYSTEM="$ROOT/backend/ecosystem.config.cjs"
if pm2 describe colyseus-app >/dev/null 2>&1; then
  echo ">>> pm2 restart colyseus-app"
  pm2 restart colyseus-app --update-env
else
  echo ">>> pm2 start (first deploy)"
  pm2 start "$ECOSYSTEM"
fi

pm2 save
