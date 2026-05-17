#!/usr/bin/env bash
# Despliegue en VPS con Docker Compose (produccion): build del frontend en el host y recrea contenedores.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo ">>> frontend: npm ci && npm run build (genera frontend/dist para Caddy)"
(cd "$ROOT/frontend" && npm ci && npm run build)

COMPOSE_FILES=(-f docker-compose.prod.yml)
FIREBASE_OVERRIDE_FILE=".docker-compose.firebase-secret.yml"
rm -f "$FIREBASE_OVERRIDE_FILE"

FIREBASE_SOURCE="${FIREBASE_SERVICE_ACCOUNT_FILE:-./snake-multijugador-firebase-adminsdk-fbsvc-77269dde1b.json}"
if [[ "$FIREBASE_SOURCE" = /* ]]; then
  FIREBASE_SOURCE_RESOLVED="$FIREBASE_SOURCE"
else
  FIREBASE_SOURCE_RESOLVED="$ROOT/$FIREBASE_SOURCE"
fi

if [ -n "${FIREBASE_SERVICE_ACCOUNT_JSON_B64:-}" ]; then
  echo ">>> Firebase: usando FIREBASE_SERVICE_ACCOUNT_JSON_B64."
elif [ -e "$FIREBASE_SOURCE_RESOLVED" ] && [ -d "$FIREBASE_SOURCE_RESOLVED" ]; then
  echo "ERROR: FIREBASE_SERVICE_ACCOUNT_FILE apunta a un directorio, no a un JSON:"
  echo "  $FIREBASE_SOURCE_RESOLVED"
  echo "Corrige la ruta del secreto y vuelve a ejecutar el deploy."
  exit 1
elif [ -e "$FIREBASE_SOURCE_RESOLVED" ]; then
  export FIREBASE_SERVICE_ACCOUNT_FILE="$FIREBASE_SOURCE_RESOLVED"
  cat > "$FIREBASE_OVERRIDE_FILE" <<'YAML'
services:
  backend:
    volumes:
      - ${FIREBASE_SERVICE_ACCOUNT_FILE}:/app/secrets/firebase-service-account.json:ro
    environment:
      FIREBASE_SERVICE_ACCOUNT_PATH: /app/secrets/firebase-service-account.json
      GOOGLE_APPLICATION_CREDENTIALS: /app/secrets/firebase-service-account.json
YAML
  COMPOSE_FILES+=(-f "$FIREBASE_OVERRIDE_FILE")
  echo ">>> Firebase: montando credenciales desde $FIREBASE_SOURCE_RESOLVED."
else
  echo ">>> Firebase: no se encontraron credenciales; se despliega sin leaderboard/ranked."
  echo ">>> Para habilitarlas, define FIREBASE_SERVICE_ACCOUNT_JSON_B64 o FIREBASE_SERVICE_ACCOUNT_FILE."
fi

echo ">>> docker compose ${COMPOSE_FILES[*]} up -d --build --force-recreate"
docker compose "${COMPOSE_FILES[@]}" up -d --build --force-recreate
