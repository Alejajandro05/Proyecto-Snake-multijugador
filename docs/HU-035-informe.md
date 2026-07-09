# HU-035 — Modo Capture The Flag 2v2 (Online y Local)

> **Rama:** `hu-035-modo-ctf-online-2vs2`  
> **Fecha:** 09/07/2026  
> **Commits de la HU:** [7048c99](https://github.com/Alejajandro05/Proyecto-Snake-multijugador/commit/7048c99e81d7f59d86eb8ebdb348c358bc3533e4) · [91c6914](https://github.com/Alejajandro05/Proyecto-Snake-multijugador/commit/91c69149ab714d576a175e8ae88be319eb021f48) · [bab26c7](https://github.com/Alejajandro05/Proyecto-Snake-multijugador/commit/bab26c73f7401ced27e8b7fbab0d8deb41460c7a) · [b87c468](https://github.com/Alejajandro05/Proyecto-Snake-multijugador/commit/b87c4689656b3110022bba2c6106c4e66f383dc1) · [14c00f8](https://github.com/Alejajandro05/Proyecto-Snake-multijugador/commit/14c00f8cb0a8765fa8c7c9e3d7bcec557a9b4de2) · [246b5b0](https://github.com/Alejajandro05/Proyecto-Snake-multijugador/commit/246b5b038f381b998e1e0d9a81da5f5697bdbc26)

---

## 1. Descripción general

Implementación completa del modo **Capture The Flag (CTF) en formato 2 vs 2**, disponible tanto en modo **online multijugador** (a través de Colyseus) como en modo **local en el mismo teclado**. Cada equipo tiene su propia bandera en su base. El objetivo es robar la bandera rival y llevarla a la base propia, siempre que la bandera del equipo siga en casa. Gana el primer equipo en lograr **3 capturas**, o quien más capturas tenga al agotar el tiempo de **3 minutos**.

---

## 2. Arquitectura de la solución

```
shared/
  src/
    CtfEngine.ts            ← Lógica pura CTF (flags, equipos, capturas, colisiones)
    CtfTypes.ts             ← Interfaces y tipos compartidos (CtfFlag, CtfTeam, CtfGameState…)
    GameConfig.ts           ← Constantes CTF_CAPTURE_LIMIT, CTF_MATCH_SECONDS
    catalogs/
      onlineOptions.ts/.js  ← Modo 'captureTheFlag' añadido al catálogo de modos online

backend/
  src/
    rooms/
      CtfOnlineRoom.ts      ← Sala Colyseus 2v2 (4 jugadores, 2 equipos)
    app.config.ts           ← Registro de ctf_room en Colyseus

frontend/
  src/
    main.js                 ← Import y registro de OnlineCtfGame + CaptureTheFlagGame2v2
    scenes/
      OnlineMenu.js         ← handleLobbyState detecta 'captureTheFlag' → OnlineCtfGame
      LocalGameSetup.js     ← Carrusel: modos CTF 1v1 y CTF 2v2 + panel extra J3/J4
      captureTheFlagRules.js← Helpers 1v1 + nuevos helpers 2v2 (equipos, flags por equipo)
      localModeHelpers.js   ← 'ctf2v2' en normalize y resolveLocalSceneKey
      modes/
        OnlineCtfGame.js    ← Escena Phaser online CTF 2v2
        CaptureTheFlagGame2v2.js ← Escena Phaser local CTF 2v2
```

---

## 3. Componentes implementados

### 3.1 Shared — Lógica pura CTF

#### `CtfEngine.ts`
Motor sin dependencias de Phaser ni Colyseus. Expone métodos puros:
- `tick()` — avanza el estado del juego un frame
- `handleFlagInteractions()` — evalúa recogida, devolución y captura de banderas
- `dropFlagsOfPlayer()` — suelta la bandera si el portador muere
- `getWinner()` — devuelve el equipo ganador por capturas o por tiempo

#### `CtfTypes.ts`
Interfaces principales: `CtfFlag`, `CtfTeam`, `CtfPlayer`, `CtfGameState`.

#### `onlineOptions.ts` / `onlineOptions.js`
Añadida la entrada al catálogo de modos para que el menú online la muestre:
```js
{ id: "captureTheFlag", label: "Captura la Bandera (2v2)" }
```

---

### 3.2 Backend — Sala Colyseus `CtfOnlineRoom`

Fichero: `backend/src/rooms/CtfOnlineRoom.ts`

| Característica | Detalle |
|---|---|
| Capacidad | 4 jugadores (maxClients: 4) |
| Equipos | teamA (slots 0-1) · teamB (slots 2-3) |
| Asignación automática | Al conectarse, el jugador se asigna al equipo con menos miembros |
| Estado sincronizado | Posiciones de serpientes, estado de banderas, marcador, tiempo restante |
| Tick rate | Configurable vía `GameConfig.TICK_MS` |
| Fin de partida | 3 capturas **o** tiempo agotado → broadcast `game_over` |
| Reconexión | Ventana de 30 s para reconexión sin perder el slot de equipo |

Registrado en `app.config.ts`:
```ts
ctf_room: defineRoom(CtfOnlineRoom)
```

---

### 3.3 Frontend Online — `OnlineCtfGame.js`

Escena Phaser que actúa como cliente de `CtfOnlineRoom`:
- Conecta a la sala usando el `matchRoomId` recibido del lobby
- Renderiza tablero, bases de equipo (rectángulos semitransparentes rojo/azul) y banderas (icono de bandera triangular)
- HUD: marcador por equipo, reloj central con estado del evento ("lleva bandera", "bandera caída"…)
- Transición a `GameOver` al recibir `game_over` del servidor

**Integración en `OnlineMenu.handleLobbyState`:**
```js
const gameMode = state.gameMode ?? 'normal';
if (gameMode === 'captureTheFlag') {
  this.scene.start('OnlineCtfGame', { matchRoomId, lobbyRoomId, skinId, playerName, mapId });
} else {
  this.scene.start('OnlineGame', { ... });
}
```

---

### 3.4 Frontend Local — `CaptureTheFlagGame2v2.js`

Escena Phaser completamente local para **4 jugadores en el mismo teclado**.

#### Controles

| Jugador | Equipo | Teclas |
|---|---|---|
| J1 | 🔴 Rojo | `W` `A` `S` `D` |
| J2 | 🔴 Rojo | `T` `F` `G` `H` |
| J3 | 🔵 Azul | `I` `J` `K` `L` |
| J4 | 🔵 Azul | `↑` `←` `↓` `→` |

#### Spawns y bases
- **Equipo Rojo:** lado izquierdo del tablero (columnas 1–7)
- **Equipo Azul:** lado derecho del tablero (columnas N-8 – N-2)
- Cada jugador tiene spawn propio dentro de su base (J1/J3 arriba, J2/J4 abajo)

#### Mecánicas
- Muere al chocar con la pared → respawn inmediato en su posición de spawn (vidas infinitas)
- Al morir portando la bandera: la suelta en la celda donde muere
- Solo puntúa si la **propia bandera está en casa**
- HUD central muestra reloj + marcador de equipos (🔴 N — 🔵 N) + mensajes de evento

#### Fin de partida
```
Condición primaria : primer equipo en 3 capturas → victoria instantánea
Condición secundaria: 3 min agotados → gana quien más capturas tenga
Desempate : "Empate" (se refleja en GameOver)
```

---

### 3.5 Reglas compartidas — `captureTheFlagRules.js`

Nuevos exports para 2v2, manteniendo los originales 1v1:

```js
// Nuevos
export const CTF_2V2_PLAYER_IDS  // ['p1','p2','p3','p4']
export const CTF_2V2_TEAMS       // { teamA: ['p1','p2'], teamB: ['p3','p4'] }
export function getCtf2v2TeamOf(playerId)             // → 'teamA' | 'teamB'
export function getCtf2v2EnemyTeam(teamId)            // → 'teamA' | 'teamB'
export function getCtf2v2WinnerByCaptureLimit(scores, limit) // → 'teamA' | 'teamB' | null
```

---

### 3.6 Menú de configuración local — `LocalGameSetup.js`

- Añadido modo **"CTF 2v2"** al carrusel de selección de modo (entre CTF 1v1 y Contra IA)
- **Panel extra** `#extra-players-panel` para J3 y J4 (selector de perfil, nombre, skin): solo visible cuando se selecciona `ctf2v2`
- Label de controles de J2 cambia dinámicamente: `FLECHAS` en 1v1 → `TFGH` en 2v2
- Banner informativo con la distribución de controles por equipo

---

## 4. Flujo completo por modo

### Online
```
Host crea sala → selecciona "Captura la Bandera (2v2)" en el desplegable
       ↓
LobbyRoom espera 4 jugadores → todos listos → host pulsa INICIAR
       ↓
LobbyRoom crea CtfOnlineRoom y emite matchRoomId + gameMode='captureTheFlag'
       ↓
OnlineMenu.handleLobbyState detecta captureTheFlag → scene.start('OnlineCtfGame')
       ↓
OnlineCtfGame conecta a CtfOnlineRoom y sincroniza estado en tiempo real
       ↓
Primer equipo en 3 capturas (o tiempo) → broadcast game_over → GameOver
```

### Local
```
Jugadores entran a Configuración Local → abren carrusel de modos
       ↓
Seleccionan "CTF 2v2" → aparece panel de J3 y J4
       ↓
Configuran nombres y skins de los 4 jugadores → Crear Partida
       ↓
LocalGameSetup llama resolveLocalSceneKey('ctf2v2') → 'CaptureTheFlagGame2v2'
       ↓
Cuenta atrás → partida 4 jugadores mismo teclado
       ↓
3 capturas o 3 min → GameOver con rematch disponible
```

---

## 5. Archivos modificados / creados

| Archivo | Operación | Descripción |
|---|---|---|
| `shared/src/CtfEngine.ts` | ✅ Creado | Motor puro CTF sin dependencias |
| `shared/src/CtfTypes.ts` | ✅ Creado | Interfaces y tipos CTF |
| `shared/src/GameConfig.ts` | ✏️ Modificado | Constantes `CTF_CAPTURE_LIMIT`, `CTF_MATCH_SECONDS` |
| `shared/src/catalogs/onlineOptions.ts` | ✏️ Modificado | Entrada `captureTheFlag` en `onlineModes` |
| `shared/src/catalogs/onlineOptions.js` | ✏️ Modificado | Ídem para el bundle JS |
| `backend/src/rooms/CtfOnlineRoom.ts` | ✅ Creado | Sala Colyseus 2v2 |
| `backend/src/app.config.ts` | ✏️ Modificado | Registro `ctf_room` |
| `frontend/src/scenes/modes/OnlineCtfGame.js` | ✅ Creado | Escena Phaser online CTF |
| `frontend/src/scenes/modes/CaptureTheFlagGame2v2.js` | ✅ Creado | Escena Phaser local CTF 2v2 |
| `frontend/src/scenes/OnlineMenu.js` | ✏️ Modificado | Routing `captureTheFlag → OnlineCtfGame` |
| `frontend/src/scenes/captureTheFlagRules.js` | ✏️ Modificado | Helpers 2v2 añadidos |
| `frontend/src/scenes/localModeHelpers.js` | ✏️ Modificado | `ctf2v2` en normalize + resolve |
| `frontend/src/scenes/LocalGameSetup.js` | ✏️ Modificado | Modo CTF 2v2 en carrusel + panel J3/J4 |
| `frontend/src/main.js` | ✏️ Modificado | Import + registro `CaptureTheFlagGame2v2` |

---

## 6. Criterios de aceptación cubiertos

- [x] El modo CTF 2v2 aparece como opción en el menú **online** (crear sala)
- [x] El modo CTF 2v2 aparece como opción en el menú **local** (configuración local)
- [x] 4 jugadores pueden jugar en el mismo teclado con controles diferenciados
- [x] Dos equipos (Rojo / Azul) con banderas y bases en lados opuestos del tablero
- [x] La bandera propia debe estar en casa para poder puntuar
- [x] Al morir portando la bandera, esta se suelta en el mapa
- [x] Partida termina por capturas (3) o por tiempo (3 min)
- [x] HUD muestra marcador de equipos y reloj en tiempo real
- [x] Pantalla de GameOver con rematch disponible
- [x] Integración sin romper los modos existentes (1v1 CTF, resto de modos locales y online)
