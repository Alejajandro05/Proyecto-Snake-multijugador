// frontend/src/config/assetManifest.js
import { fruitAssets, getAllMapImageAssets, getAllSnakeImageAssets } from './gameAssetRegistry.js';

export const ASSET_KEYS = Object.freeze({
    MENU_BACKGROUND: 'fondo_duelo',
    MAP_BOARD_BACKGROUND: 'map-board-background',
    MAP_BOARD_FRAME: 'map-board-frame',
    MAP_FLOOR_TILE: 'map-floor-tile',
    MAP_OBSTACLE_ROCK: 'map-obstacle-rock',
    MAP_DECOR_CORNER_LEAF: 'map-decor-corner-leaf',
    FOOD_FRUITS_SHEET: fruitAssets.spritesheet.key,
    SNAKE_P1_HEAD: 'snake-player1-head',
    SNAKE_P1_BODY: 'snake-player1-body',
    SNAKE_P1_TURN: 'snake-player1-turn',
    SNAKE_P1_TAIL: 'snake-player1-tail',
    SNAKE_P2_HEAD: 'snake-player2-head',
    SNAKE_P2_BODY: 'snake-player2-body',
    SNAKE_P2_TURN: 'snake-player2-turn',
    SNAKE_P2_TAIL: 'snake-player2-tail',
});

const CORE_IMAGE_ASSETS = [
    { key: ASSET_KEYS.MENU_BACKGROUND, path: 'fondo_duelo.png' },
];

const PLANNED_IMAGE_ASSETS = [
    ...getAllMapImageAssets().map((asset) => ({ ...asset, enabled: true })),
    ...getAllSnakeImageAssets().map((asset) => ({ ...asset, enabled: true })),
];

const SPRITESHEET_ASSETS = [
    {
        key: fruitAssets.spritesheet.key,
        path: fruitAssets.spritesheet.path,
        frameConfig: fruitAssets.spritesheet.frameConfig,
        enabled: true,
    },
];

export function getImageAssetsToPreload() {
    return [
        ...CORE_IMAGE_ASSETS,
        ...PLANNED_IMAGE_ASSETS.filter((asset) => asset.enabled),
    ];
}

export function getSpriteSheetAssetsToPreload() {
    return SPRITESHEET_ASSETS.filter((asset) => asset.enabled);
}
