#!/usr/bin/env bash
# Despliegue en VPS con Docker Compose (producción): pull, build del frontend en el host y recrea contenedores.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

git pull --ff-only

echo ">>> frontend: npm ci && npm run build (genera frontend/dist para Caddy)"
(cd "$ROOT/frontend" && npm ci && npm run build)

FIREBASE_SOURCE="${FIREBASE_SERVICE_ACCOUNT_FILE:-./snake-multijugador-firebase-adminsdk-fbsvc-77269dde1b.json}"
if [[ "$FIREBASE_SOURCE" = /* ]]; then
  FIREBASE_SOURCE_RESOLVED="$FIREBASE_SOURCE"
else
  FIREBASE_SOURCE_RESOLVED="$ROOT/$FIREBASE_SOURCE"
fi

if [ ! -e "$FIREBASE_SOURCE_RESOLVED" ]; then
  echo "ERROR: No existe el archivo de credenciales Firebase: $FIREBASE_SOURCE_RESOLVED"
  echo "Define FIREBASE_SERVICE_ACCOUNT_FILE con una ruta válida antes de desplegar."
  exit 1
fi

if [ -d "$FIREBASE_SOURCE_RESOLVED" ]; then
  echo "ERROR: FIREBASE_SERVICE_ACCOUNT_FILE apunta a un directorio, no a un JSON:"
  echo "  $FIREBASE_SOURCE_RESOLVED"
  echo "Corrige la ruta del secreto y vuelve a ejecutar el deploy."
  exit 1
fi

echo ">>> docker compose -f docker-compose.prod.yml up -d --build --force-recreate"
docker compose -f docker-compose.prod.yml up -d --build --force-recreate
