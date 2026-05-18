# Despliegue (DigitalOcean VPS / producción)

## Evitar conflictos con `git pull`

No edites archivos **versionados** en el servidor (por ejemplo para cambiar URLs). Usa solo:

- Variables de entorno ignoradas por git (véase [`frontend/.env.example`](frontend/.env.example)).
- Configuración del proxy (Caddy/Nginx), Docker Compose, PM2 y sistema.

Si el VPS tiene cambios locales mezclados con el remoto, **antes** de alinear el árbol copia cualquier `.env` que necesites. Luego, con el código nuevo ya desplegado:

```bash
git fetch origin
git reset --hard origin/main
```

Eso descarta modificaciones locales en archivos trackeados; los `.env` no trackeados se mantienen.

## Arquitectura (Docker + Caddy)

Orquestación habitual: **backend** (Colyseus en **2567** dentro de la red Docker), **Caddy** (puertos **80/443**, TLS, estáticos y proxy WebSocket) y el **frontend** como **`frontend/dist`** en producción (no el servidor de desarrollo Vite en **5173**).

- **Caddyfile en la raíz del repo:** [`Caddyfile`](Caddyfile) — usa la variable de entorno `SITE_ADDRESS` (por defecto `www.snake-multijugador.site` en [`docker-compose.prod.yml`](docker-compose.prod.yml)).
- **WebSockets:** prefijo público **`/ws`** → `reverse_proxy` al servicio `backend:2567` con `strip_prefix /ws`. El cliente ya usa `wss://<dominio>/ws` (véase [`frontend/src/scenes/OnlineGame.js`](frontend/src/scenes/modes/OnlineGame.js)).
- Referencia adicional: [`deploy/Caddyfile.example`](deploy/Caddyfile.example).

Caddy gestiona **Upgrade** y TLS para WebSockets. Un `nginx.conf` en el repo, si existe, sería solo alternativa documental.

## Docker Compose producción

Archivo: [`docker-compose.prod.yml`](docker-compose.prod.yml).

- **backend:** imagen multi-stage [`backend/Dockerfile`](backend/Dockerfile) (`target: production`): `npm run build` y arranque con `node build/backend/src/index.js` (salida real del compilador TypeScript del monorepo).
- **caddy:** monta `./Caddyfile`, `./frontend/dist` en `/srv/dist` y volúmenes de datos TLS.

Variables útiles:

- **`SITE_ADDRESS`** — dominio del bloque del sitio (coincide con Let’s Encrypt). Ejemplo: `SITE_ADDRESS=www.snake-multijugador.site docker compose -f docker-compose.prod.yml up -d --build`.

Flujo típico en el VPS:

```bash
chmod +x scripts/pull-git-and-restart-docker.sh   # una vez
git pull --ff-only
./scripts/pull-git-and-restart-docker.sh
```

Primero actualiza el repo con `git pull --ff-only`; despues el script construye el frontend en el host (`frontend/dist`) y ejecuta `docker compose -f docker-compose.prod.yml up -d --build --force-recreate` para que Caddy recargue cambios del `Caddyfile`.

### Credenciales Firebase

Firebase es opcional para arrancar el backend y crear partidas online normales. Si no hay credenciales, el deploy continua; ranked/leaderboard fallaran hasta configurar una de estas opciones:

- **`FIREBASE_SERVICE_ACCOUNT_JSON_B64`**: recomendado para GitHub Actions. El workflow lo pasa al VPS y Docker Compose lo inyecta al contenedor.
- **`FIREBASE_SERVICE_ACCOUNT_FILE`**: ruta a un JSON local en el VPS. Si existe, `scripts/pull-git-and-restart-docker.sh` crea un override temporal para montarlo en `/app/secrets/firebase-service-account.json`.

### Desarrollo local

[`docker-compose.yml`](docker-compose.yml) levanta **backend** + **frontend** (Vite) con el puerto **2567** publicado para pruebas desde el host. El **contexto de build del backend** es la raíz del repo (`context: .`, `dockerfile: backend/Dockerfile`, `target: development`).

## URL del cliente Colyseus (online)

| Entorno | Comportamiento por defecto |
|--------|----------------------------|
| **Desarrollo** (`vite`) | `ws://localhost:2567` — sin prefijo `/ws`. |
| **Producción** (build) | Mismo host que la página + **`/ws`** (o `VITE_WS_PATH`), alineado con Caddy. |

Overrides: `VITE_COLYSEUS_URL`, `VITE_SERVER_URL`, `VITE_WS_PATH` — véase [`frontend/.env.example`](frontend/.env.example).

## Escalado Colyseus

Varias instancias PM2 o varios procesos sin Redis/presence reparten salas de forma incoherente. Para escalar horizontalmente usa coordinación (Redis, Colyseus Cloud, etc.) o **una instancia** de sala por máquina/contenedor.

## Backend con PM2 (sin Docker)

[`backend/ecosystem.config.cjs`](backend/ecosystem.config.cjs) arranca `build/backend/src/index.js` con `NODE_ENV=production`.

```bash
cd /ruta/al/clon-del-repo/backend
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

Script alternativo en la raíz del repo: [`scripts/deploy.sh`](scripts/deploy.sh) (pull + build frontend/backend + reinicio PM2).

## GitHub Actions (opcional)

Workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) — por defecto ejecuta `scripts/deploy.sh` (PM2).

Si despliegas **solo con Docker**, cambia el paso remoto para usar `bash scripts/pull-git-and-restart-docker.sh` y asegúrate de que el usuario SSH tenga permiso para `docker compose`.

| Secret | Descripción |
|--------|-------------|
| `DEPLOY_HOST` | IP o hostname del VPS |
| `DEPLOY_USER` | Usuario SSH |
| `DEPLOY_SSH_KEY` | Clave privada |
| `DEPLOY_PATH` | Ruta absoluta al clon del repo en el servidor |
| `FIREBASE_SERVICE_ACCOUNT_JSON_B64` | Opcional; credenciales Firebase en base64 para ranked/leaderboard |
