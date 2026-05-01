# Snake Backend

Servidor Colyseus del proyecto Snake Clash. Expone las salas online, el lobby y los endpoints HTTP que usa el frontend Phaser.

## Uso

```bash
npm install
npm start
```

El servidor escucha por defecto en `http://localhost:2567`.

## Scripts

- `npm start`: arranca el backend en modo desarrollo con `tsx watch src/index.ts`.
- `npm run build`: limpia y compila TypeScript con `tsc`.
- `npm test`: ejecuta la suite Mocha con `tsx`.
- `npm run loadtest`: ejecuta el cliente de carga de Colyseus.

## Estructura

- `src/index.ts`: punto de entrada del servidor.
- `src/app.config.ts`: registro de rooms, monitor y rutas HTTP.
- `src/rooms/SnakeRoom.ts`: partida Snake online autoritativa.
- `src/rooms/LobbyRoom.ts`: lobbies publicos, codigos de invitacion y resolucion de partidas.
- `src/rooms/MyRoom.ts`: room de ejemplo heredada de la plantilla.
- `src/rooms/schema/`: schemas sincronizados por Colyseus.
- `test/`: pruebas de rooms y motor compartido.

## Rooms

- `snake_room`: room principal de juego.
- `lobby_room`: flujo de lobby y emparejamiento.
- `my_room`: room legacy de ejemplo, no forma parte del flujo principal.

## Shared Domain

La logica de simulacion vive en `../shared/src/domain`. El TypeScript es la fuente canonica y los `.js` junto a los `.ts` son artefactos runtime generados para los imports ESM actuales.

Cuando cambies `shared/src/domain/*.ts`, ejecuta:

```bash
npm run build:runtime --prefix ../shared
```

## Verificacion

```bash
npm test
npm run build
```
