# Snake Project Context

Este archivo resume el estado actual del proyecto para tener contexto rapido al arrancar una sesion nueva.
La idea es que funcione como mapa de referencia del codigo, la arquitectura y los flujos principales.

## Resumen

Proyecto de Snake multijugador con:

- Frontend en Phaser 3.
- Backend en Colyseus.
- Logica de juego compartida en `shared/src/domain`.
- Desarrollo local con Docker.
- Despliegue pensado para Docker + Caddy en produccion.

El proyecto tiene varios modos y superficies de juego:

- `LocalGame`: partida local usando `SnakeEngine`.
- `OnlineGame`: partida online sincronizada con `snake_room`.
- `TimeAttackGame`: modo especial incluido en las escenas del frontend.
- `LobbyRoom`: flujo de salas/lobbies para organizar partidas online.

## Estructura General

- `frontend/`: cliente Phaser, escenas, renderizado, assets y configuracion de Vite.
- `backend/`: servidor Colyseus, rooms, estado sincronizado y tests del backend.
- `shared/`: logica de dominio reutilizable entre cliente y servidor.
- `docs/`: documentacion del proyecto.
- `deploy/`: materiales y ayudas de despliegue.
- `scripts/`: scripts de soporte.

La raiz contiene archivos de orquestacion y apoyo:

- `docker-compose.yml`
- `docker-compose.prod.yml`
- `Caddyfile`
- `DEPLOY.md`
- `README.md`
- `PROJECT_CONTEXT.md`

## Stack

- Frontend: Phaser, Vite, JavaScript.
- Backend: TypeScript, Colyseus, Express.
- Shared domain: TypeScript y JavaScript coexistiendo en el mismo arbol.
- Contenedores: Docker y Docker Compose.
- Proxy/produccion: Caddy.

## Puntos de Entrada

- Frontend: `frontend/src/main.js`
- Backend: `backend/src/index.ts`
- Configuracion del servidor: `backend/src/app.config.ts`
- Logica pura del juego: `shared/src/domain/SnakeEngine.ts`

## Flujo De Ejecucion

### Frontend

El cliente arranca Phaser y registra estas escenas:

- `Boot`
- `Preloader`
- `MainMenu`
- `OnlineMenu`
- `LocalGameSetup`
- `LocalGame`
- `OnlineGame`
- `Game`
- `TimeAttackGame`
- `GameOver`
- `Pause`

`Preloader` carga assets, audio y sprites.
`MainMenu` y `OnlineMenu` actuan como puntos de entrada al juego.
`LocalGameSetup` prepara la partida local antes de entrar a `LocalGame`.

### Backend

El servidor registra estas rooms de Colyseus:

- `snake_room`: room principal del juego.
- `my_room`: room de plantilla / ejemplo.
- `lobby_room`: room para lobby y organizacion de partidas.

El backend expone ademas estos endpoints HTTP:

- `/api/hello`
- `/api/lobbies`
- `/api/lobbies/resolve`

En produccion, Caddy debe reenviar `/api*` y `/ws*` al backend Colyseus.

### Shared Domain

La carpeta `shared/src/domain` contiene la logica que no depende de Phaser ni de Colyseus:

- `GameConfig.ts` y `GameConfig.js`: constantes y presets de dificultad.
- `types.ts` y `types.js`: tipos y estructuras del estado del juego.
- `SnakeEngine.ts` y `SnakeEngine.js`: motor puro de simulacion.

Este motor lo usa:

- `LocalGame` directamente en cliente.
- `SnakeRoom` en el servidor para simular la partida autoritativa.

## Reglas Del Juego

Valores base actuales del motor:

- Grid: `32 x 24`
- Tamano de celda: `32`
- Tick normal: `150 ms`
- Comida inicial: `10`
- Longitud inicial de serpiente: `3`
- Vidas maximas: `3`
- Puntuacion de victoria: `10`
- Margen de seguridad: `3`

Comportamiento principal del motor:

- Movimiento por casillas.
- Rechazo de giros de 180 grados.
- Wrap-around del tablero en el motor actual.
- Colision con si mismo, otros jugadores y obstaculos.
- Respawn tras morir si todavia quedan vidas.
- Generacion de comida y obstaculos evitando posiciones ocupadas.

## Backend Detallado

### `SnakeRoom`

`backend/src/rooms/SnakeRoom.ts` es la room principal.

Responsabilidades:

- Crear el estado sincronizado de Colyseus.
- Construir `SnakeEngine` con configuracion de runtime.
- Procesar mensajes `changeDirection`.
- Sincronizar jugadores, comida y obstaculos con el schema.
- Repartir colores y skins al unirse jugadores.

La room admite opciones de creacion como:

- `boardCols`
- `boardRows`
- `boardCellSize`
- `foodCount`
- `obstaclesPerQuadrant`
- `difficulty`
- `mapId`

### Lobby

`backend/src/rooms/LobbyRoom.ts` y sus schemas asociados gestionan lobbies publicos y resolucion de codigos de invitacion.

Schemas relevantes:

- `LobbyRoomState`
- `LobbyPlayer`
- `PublicLobbySummary`

### Schema

Schemas principales del juego:

- `SnakeRoomState`: estado global de la sala.
- `Player`: estado individual del jugador.
- `SnakeSegment`: segmento de la serpiente.
- `Food`: posicion de la comida.
- `Obstacle`: posicion de un obstaculo.

### `MyRoom`

`backend/src/rooms/MyRoom.ts` y `backend/test/MyRoom.test.ts` siguen como material base de plantilla.
No forman parte del flujo principal del juego, pero siguen presentes como referencia de Colyseus.

## Frontend Detallado

### Escenas

- `Boot`: carga inicial minima.
- `Preloader`: carga assets y audio.
- `MainMenu`: menu principal.
- `OnlineMenu`: menu para flujo online y lobby.
- `LocalGameSetup`: configuracion previa al modo local.
- `LocalGame`: modo local 1vs1 usando `SnakeEngine`.
- `OnlineGame`: modo online sincronizado con `snake_room`.
- `Game`: escena simple de prueba / legado.
- `TimeAttackGame`: modo especial de tiempo.
- `GameOver`: overlay o escena de resultado final.
- `Pause`: overlay o escena de pausa.

### Renderer

`frontend/src/renderers/SnakeBoardRenderer.js` centraliza el dibujo del tablero.

Hace:

- Calculo responsive del tablero.
- Dibujo de fondo, marco y grid.
- Render de serpientes con pool de sprites.
- Render de comida y obstaculos.
- Fallback a rectangulos si faltan assets.

### Configuracion de juego y red

Archivos utiles:

- `frontend/src/config/assetManifest.js`: lista de assets cargables.
- `frontend/src/net/lobbyClient.js`: cliente para lobby y resolucion de salas.
- `frontend/src/utils/localGameSettings.js`: ajustes del modo local.
- `frontend/src/utils/onlineStorage.js`: persistencia local de opciones online.

### Assets

`frontend/assets/` incluye:

- Audio del juego.
- Fondo principal y del menu.
- Sprites de serpientes por jugador.
- Mapa, baldosas y obstaculos.
- Sprites de frutas.

Nota de despliegue: con `vite build`, los archivos de `publicDir: 'assets'` se copian al raiz de `frontend/dist`, asi que `time_attack.jpg` se sirve como `/time_attack.jpg` en produccion.

## Configuracion Y Entorno

### Desarrollo local

- `docker compose up --build`
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:2567`

### Produccion

- `docker-compose.prod.yml` levanta backend + Caddy.
- Caddy sirve el frontend compilado desde `frontend/dist`.
- WebSocket publico por defecto en `/ws`.
- El proxy HTTP para el frontend online usa `/api/lobbies` y `/api/lobbies/resolve` contra el backend.
- El flujo correcto de despliegue en el VPS es `scripts/pull-git-and-restart-docker.sh`, no `scripts/deploy.sh`.

### Variables relevantes del frontend

- `VITE_COLYSEUS_URL`
- `VITE_SERVER_URL`
- `VITE_WS_PATH`

## Scripts Importantes

En `backend/package.json`:

- `npm start`
- `npm run build`
- `npm test`
- `npm run loadtest`

En `frontend/package.json`:

- `npm run dev`
- `npm run build`
- `npm run preview`

## Tests

Hay tests en `backend/test/`:

- `SnakeEngine.test.ts`: movimiento, giro, comida, colision, wrap, respawn y limpieza.
- `MyRoom.test.ts`: test basico de ejemplo de Colyseus.

## Notas Importantes

- La raiz no tiene `package.json`; cada subproyecto maneja sus dependencias.
- En `shared/src/domain` hay archivos `.ts` y `.js`; conviene mantenerlos alineados.
- El modo online principal usa `snake_room`; `lobby_room` soporta el flujo de lobby.
- El frontend mezcla escenas de juego, menu y configuracion en una sola app Phaser.
- El renderer del tablero esta preparado para funcionar incluso si faltan algunos assets.

## Si Hay Que Seguir Trabajando

Cuando haga falta tocar funcionalidad, los archivos mas probables a revisar primero son:

- `shared/src/domain/SnakeEngine.ts`
- `shared/src/domain/GameConfig.ts`
- `backend/src/rooms/SnakeRoom.ts`
- `backend/src/rooms/LobbyRoom.ts`
- `backend/src/app.config.ts`
- `frontend/src/scenes/modes/LocalGame.js`
- `frontend/src/scenes/modes/OnlineGame.js`
- `frontend/src/scenes/OnlineMenu.js`
- `frontend/src/scenes/LocalGameSetup.js`
- `frontend/src/renderers/SnakeBoardRenderer.js`
- `Caddyfile`
- `scripts/pull-git-and-restart-docker.sh`
