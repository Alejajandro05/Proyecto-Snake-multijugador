export const DEFAULT_SNAKE_SKIN_ID = 'player1';
export const DEFAULT_MAP_ID = 'arena01';

const snakePart = (key, path) => Object.freeze({ key, path });

function createSnakeAsset(id, label, basePath, files, aliases = [], options = {}) {
  return Object.freeze({
    id,
    label,
    aliases: Object.freeze(aliases),
    tailConnectionDirection: options.tailConnectionDirection ?? 'right',
    preview: snakePart(`snake-${id}-preview`, `${basePath}/${files.head}`),
    parts: Object.freeze({
      head: snakePart(`snake-${id}-head`, `${basePath}/${files.head}`),
      body: snakePart(`snake-${id}-body`, `${basePath}/${files.body}`),
      tail: snakePart(`snake-${id}-tail`, `${basePath}/${files.tail}`),
      turn: snakePart(`snake-${id}-turn`, `${basePath}/${files.turn}`),
    }),
  });
}

export const snakeAssets = Object.freeze([
  createSnakeAsset('player1', 'Player 1', 'snakes/player1', {
    head: 'head.png',
    body: 'body.png',
    tail: 'tail.png',
    turn: 'turn.png',
  }, ['p1', 'skin-1', 'snake000'], { tailConnectionDirection: 'left' }),
  createSnakeAsset('player2', 'Player 2', 'snakes/player2', {
    head: 'head.png',
    body: 'body.png',
    tail: 'tail.png',
    turn: 'turn.png',
  }, ['p2', 'skin-2', 'snake001'], { tailConnectionDirection: 'left' }),
  createSnakeAsset('snake3', 'Snake 3', 'snakesSets/snake3', {
    turn: 'snake032.png',
    body: 'snake033.png',
    head: 'snake034.png',
    tail: 'snake047.png',
  }, ['snake003']),
  createSnakeAsset('snake4', 'Snake 4', 'snakesSets/snake4', {
    turn: 'snake048.png',
    body: 'snake049.png',
    head: 'snake050.png',
    tail: 'snake063.png',
  }, ['snake004']),
  createSnakeAsset('snake5', 'Snake 5', 'snakesSets/snake5', {
    turn: 'snake064.png',
    body: 'snake065.png',
    head: 'snake066.png',
    tail: 'snake079.png',
  }, ['snake005']),
  createSnakeAsset('snake6', 'Snake 6', 'snakesSets/snake6', {
    turn: 'snake080.png',
    body: 'snake081.png',
    head: 'snake082.png',
    tail: 'snake095.png',
  }, ['snake006']),
  createSnakeAsset('snake7', 'Snake 7', 'snakesSets/snake7', {
    turn: 'snake176.png',
    body: 'snake177.png',
    head: 'snake178.png',
    tail: 'snake191.png',
  }, ['snake007']),
  createSnakeAsset('snake8', 'Snake 8', 'snakesSets/snake8', {
    turn: 'snake208.png',
    body: 'snake209.png',
    head: 'snake210.png',
    tail: 'snake223.png',
  }, ['snake008']),
  createSnakeAsset('snake9', 'Snake 9', 'snakesSets/snake9', {
    body: 'snake376.png',
    head: 'snake378.png',
    tail: 'snake380.png',
    turn: 'snake382.png',
  }, ['snake009']),
  createSnakeAsset('snake10', 'Snake 10', 'snakesSets/snake10', {
    body: 'snake336.png',
    head: 'snake338.png',
    turn: 'snake340.png',
    tail: 'snake342.png',
  }, ['snake010']),
]);

function createMapAsset(id, label, floorPath, theme, aliases = []) {
  return Object.freeze({
    id,
    label,
    aliases: Object.freeze(aliases),
    floor: Object.freeze({ key: `map-${id}-floor`, path: floorPath }),
    obstacle: Object.freeze({
      key: theme.obstacleKey ?? 'map-obstacle-rock',
      path: theme.obstaclePath ?? 'map/obstacles/obstacle_rock.png',
    }),
    theme: Object.freeze({
      backgroundColor: theme.backgroundColor,
      boardColor: theme.boardColor,
      borderColor: theme.borderColor,
      gridColor: theme.gridColor,
    }),
  });
}

export const mapAssets = Object.freeze([
  createMapAsset('arena01', 'Arena 01', 'map/arena01/tile005.png', {
    backgroundColor: 0x07111f,
    boardColor: 0x0f172a,
    borderColor: 0x22d3ee,
    gridColor: 0xffffff,
  }, ['classic']),
  createMapAsset('arena02', 'Arena 02', 'map/arena02/tile021.png', {
    backgroundColor: 0x1b1208,
    boardColor: 0x2a180c,
    borderColor: 0xf97316,
    gridColor: 0xffedd5,
    obstacleKey: 'map-obstacle-rock-2',
    obstaclePath: 'map/obstacles/obstacle_rock_2.png',
  }, ['canyon']),
  createMapAsset('arena03', 'Arena 03', 'map/arena03/tile037.png', {
    backgroundColor: 0x071a10,
    boardColor: 0x102317,
    borderColor: 0x22c55e,
    gridColor: 0xdcfce7,
  }),
  createMapAsset('arena04', 'Arena 04', 'map/arena04/tile053.png', {
    backgroundColor: 0x111827,
    boardColor: 0x1f2937,
    borderColor: 0xa78bfa,
    gridColor: 0xede9fe,
  }),
  createMapAsset('arena05', 'Arena 05', 'map/arena05/tile069.png', {
    backgroundColor: 0x172033,
    boardColor: 0x1e293b,
    borderColor: 0x38bdf8,
    gridColor: 0xe0f2fe,
  }),
  createMapAsset('arena06', 'Arena 06', 'map/arena06/tile085.png', {
    backgroundColor: 0x1c1510,
    boardColor: 0x292018,
    borderColor: 0xfacc15,
    gridColor: 0xfef9c3,
    obstacleKey: 'map-obstacle-rock-2',
    obstaclePath: 'map/obstacles/obstacle_rock_2.png',
  }),
]);

export const fruitAssets = Object.freeze({
  spritesheet: Object.freeze({
    key: 'food-fruits-sheet',
    path: 'Fruits/Fruits/Fruits_Spritesheet.png',
    frameConfig: Object.freeze({ frameWidth: 32, frameHeight: 32 }),
  }),
});

function resolveByIdOrAlias(collection, value, fallbackId) {
  const normalized = String(value ?? '').trim();
  return (
    collection.find((asset) => asset.id === normalized || asset.aliases?.includes(normalized))
    ?? collection.find((asset) => asset.id === fallbackId)
    ?? collection[0]
  );
}

export function getSnakeAsset(skinId) {
  return resolveByIdOrAlias(snakeAssets, skinId, DEFAULT_SNAKE_SKIN_ID);
}

export function getMapAsset(mapId) {
  return resolveByIdOrAlias(mapAssets, mapId, DEFAULT_MAP_ID);
}

export function getAllSnakeImageAssets() {
  return snakeAssets.flatMap((asset) => Object.values(asset.parts));
}

export function getAllMapImageAssets() {
  const byKey = new Map();
  mapAssets.forEach((asset) => {
    byKey.set(asset.floor.key, asset.floor);
    byKey.set(asset.obstacle.key, asset.obstacle);
  });
  return Array.from(byKey.values());
}
