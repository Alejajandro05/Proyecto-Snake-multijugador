# Snake Project Context

Este archivo resume el proyecto para tener contexto rapido al empezar una sesion nueva.
La idea es que sirva como mapa de referencia del codigo, la arquitectura y el flujo de ejecucion.

## Resumen

Proyecto de Snake multijugador con:

- Frontend en Phaser 3.
- Backend en Colyseus.
- Logica de juego compartida en `shared/src/domain`.
- Desarrollo local con Docker.
- Despliegue pensado para Docker + Caddy en produccion.

El juego tiene dos modos principales:

1. `LocalGame`: partida local 1vs1, sin servidor.
2. `OnlineGame`: partida online 1vs1 sincronizada con Colyseus.

## Estructura General

- `frontend/`: cliente Phaser, escenas, renderizado, assets y configuracion de Vite.
- `backend/`: servidor Colyseus, rooms, estado sincronizado y tests del backend.
- `shared/`: logica de dominio reutilizable entre cliente y servidor.
- `docs/`: documentacion del proyecto.
- `deploy/`: ejemplos y materiales de despliegue.
- `scripts/`: scripts de despliegue y reinicio.

La raiz contiene archivos de orquestacion:

- `docker-compose.yml`
- `docker-compose.prod.yml`
- `Caddyfile`
- `DEPLOY.md`
- `README.md`

## Stack

- Frontend: Phaser, Vite, JavaScript.
- Backend: TypeScript, Colyseus, Express.
- Shared domain: TypeScript con salidas `.js` en el mismo arbol.
- Contenedores: Docker y Docker Compose.
- Proxy/produccion: Caddy.

## Puntos de Entrada

- Frontend: `frontend/src/main.js`
- Backend: `backend/src/index.ts`
- Configuracion del servidor: `backend/src/app.config.ts`
- Logica pura del juego: `shared/src/domain/SnakeEngine.ts`

## Flujo De Ejecucion

### Frontend

El cliente arranca Phaser y registra escenas:

- `Boot`
- `Preloader`
- `MainMenu`
- `LocalGame`
- `OnlineGame`
- `Game`
- `GameOver`
- `Pause`

La escena `Preloader` carga audio, fondo, sprites de serpiente, mapa y frutas.
`MainMenu` crea una capa DOM sobre el canvas para arrancar modo local, modo online y ajustes de audio.

### Backend

El servidor usa Colyseus con dos rooms registradas:

- `snake_room`: room real del juego.
- `my_room`: room de plantilla / ejemplo.

El backend expone ademas:

- `/hi`
- `/api/hello`
- `/monitor`
- playground de Colyseus en desarrollo

### Shared Domain

La carpeta `shared/src/domain` contiene la logica que no depende de Phaser ni de Colyseus:

- `GameConfig.ts`: constantes y presets de dificultad.
- `types.ts`: tipos de estado del juego.
- `SnakeEngine.ts`: motor puro de simulacion.

Este motor lo usa:

- `LocalGame` directamente.
- `SnakeRoom` en el servidor para simular la partida autoritativa.

## Reglas Del Juego

Valores base actuales:

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

### Schema

- `SnakeRoomState`: estado global de la sala.
- `Player`: estado individual del jugador.
- `SnakeSegment`: segmento de la serpiente.
- `Food`: posicion de la comida.
- `Obstacle`: posicion de un obstaculo.

### `MyRoom`

`backend/src/rooms/MyRoom.ts` y `backend/test/MyRoom.test.ts` son material base de plantilla.
No forman parte del flujo real principal del juego, pero siguen presentes como referencia de Colyseus.

## Frontend Detallado

### Escenas

- `Boot`: carga inicial minima.
- `Preloader`: carga assets y audio.
- `MainMenu`: menu principal con botones y ajustes.
- `LocalGame`: modo local 1vs1 usando `SnakeEngine`.
- `OnlineGame`: modo online sincronizado con `snake_room`.
- `Game`: escena simple de prueba / legado.
- `GameOver`: overlay DOM de resultado final.
- `Pause`: overlay DOM de pausa en modo local.

### Renderer

`frontend/src/renderers/SnakeBoardRenderer.js` centraliza el dibujo del tablero.

Hace:

- Calculo responsive del tablero.
- Dibujo de fondo, marco y grid.
- Render de serpientes con pool de sprites.
- Render de comida y obstaculos.
- Fallback a rectangulos si faltan assets.

### Assets

`frontend/assets/` incluye:

- Audio del juego.
- Fondo principal y del menu.
- Sprites de serpientes por jugador.
- Mapa, baldosas y obstaculos.
- Sprites de frutas.

`frontend/src/config/assetManifest.js` define que se carga y que aun esta preparado como futuro.

## Configuracion Y Entorno

### Desarrollo local

- `docker compose up --build`
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:2567`

### Produccion

- `docker-compose.prod.yml` levanta backend + Caddy.
- Caddy sirve el frontend compilado desde `frontend/dist`.
- WebSocket publico por defecto en `/ws`.

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

- `SnakeEngine.test.ts`: cubre movimiento, giro, comida, colision, wrap, respawn y limpieza.
- `MyRoom.test.ts`: test basico de ejemplo de Colyseus.

## Notas Importantes

- La raiz no tiene `package.json`; cada subproyecto maneja sus dependencias.
- En `shared/src/domain` hay archivos `.ts` y `.js`; conviene mantenerlos alineados.
- El modo online usa `snake_room`, no `my_room`.
- El renderer del tablero esta preparado para funcionar incluso si faltan algunos assets.

## Si Hay Que Seguir Trabajando

Cuando haga falta tocar funcionalidad, los archivos mas probables a revisar primero son:

- `shared/src/domain/SnakeEngine.ts`
- `shared/src/domain/GameConfig.ts`
- `backend/src/rooms/SnakeRoom.ts`
- `frontend/src/scenes/LocalGame.js`
- `frontend/src/scenes/OnlineGame.js`
- `frontend/src/renderers/SnakeBoardRenderer.js`

