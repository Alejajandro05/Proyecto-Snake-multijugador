export const ASSET_KEYS = Object.freeze({
    MENU_BACKGROUND: 'fondo_duelo',
    MAP_BOARD_BACKGROUND: 'map-board-background',
    MAP_BOARD_FRAME: 'map-board-frame',
    MAP_FLOOR_TILE: 'map-floor-tile',
    MAP_OBSTACLE_ROCK: 'map-obstacle-rock',
    MAP_DECOR_CORNER_LEAF: 'map-decor-corner-leaf',
    // ── nuevo ──
    MAP_FOOD_APPLE: 'map-food-apple',
    // ───────────
    SNAKE_P1_HEAD: 'snake-p1-head',
    SNAKE_P1_BODY: 'snake-p1-body',
    SNAKE_P1_TURN: 'snake-p1-turn',
    SNAKE_P1_TAIL: 'snake-p1-tail',
    SNAKE_P2_HEAD: 'snake-p2-head',
    SNAKE_P2_BODY: 'snake-p2-body',
    SNAKE_P2_TURN: 'snake-p2-turn',
    SNAKE_P2_TAIL: 'snake-p2-tail',
});

const CORE_IMAGE_ASSETS = [
    { key: ASSET_KEYS.MENU_BACKGROUND, path: 'fondo_duelo.png' },
];

const PLANNED_IMAGE_ASSETS = [
    { key: ASSET_KEYS.MAP_BOARD_BACKGROUND,  path: 'map/backgrounds/board_background.png', enabled: false },
    { key: ASSET_KEYS.MAP_BOARD_FRAME,       path: 'map/borders/board_frame.png',           enabled: true  },
    { key: ASSET_KEYS.MAP_FLOOR_TILE,        path: 'map/tiles/floor_tile.png',              enabled: true  },
    { key: ASSET_KEYS.MAP_OBSTACLE_ROCK,     path: 'map/obstacles/obstacle_rock.png',       enabled: true  },
    { key: ASSET_KEYS.MAP_DECOR_CORNER_LEAF, path: 'map/decor/corner_leaf.png',             enabled: false },
    // ── nuevo ──
    { key: ASSET_KEYS.MAP_FOOD_APPLE,        path: 'map/food/apple.png',                    enabled: true  },
    // ───────────
    { key: ASSET_KEYS.SNAKE_P1_HEAD,  path: 'snakes/player1/head.png', enabled: true },
    { key: ASSET_KEYS.SNAKE_P1_BODY,  path: 'snakes/player1/body.png', enabled: true },
    { key: ASSET_KEYS.SNAKE_P1_TURN,  path: 'snakes/player1/turn.png', enabled: true },
    { key: ASSET_KEYS.SNAKE_P1_TAIL,  path: 'snakes/player1/tail.png', enabled: true },
    { key: ASSET_KEYS.SNAKE_P2_HEAD,  path: 'snakes/player2/head.png', enabled: true },
    { key: ASSET_KEYS.SNAKE_P2_BODY,  path: 'snakes/player2/body.png', enabled: true },
    { key: ASSET_KEYS.SNAKE_P2_TURN,  path: 'snakes/player2/turn.png', enabled: true },
    { key: ASSET_KEYS.SNAKE_P2_TAIL,  path: 'snakes/player2/tail.png', enabled: true },
];

export function getImageAssetsToPreload() {
    return [
        ...CORE_IMAGE_ASSETS,
        ...PLANNED_IMAGE_ASSETS.filter((asset) => asset.enabled),
    ];
}