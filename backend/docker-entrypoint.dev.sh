#!/bin/sh
set -e
cd /app/backend
# El volumen backend_node_modules puede quedar desactualizado si cambia package.json.
npm install
exec "$@"
