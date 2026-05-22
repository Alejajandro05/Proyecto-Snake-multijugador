import { PLAYER_COLORS } from '@shared/GameConfig';
import { onlineBoardSizes, onlineFoodCounts } from '../../../shared/src/catalogs/onlineOptions.js';
import { DEFAULT_MAP_ID, DEFAULT_SNAKE_SKIN_ID, getMapAsset, getSnakeAsset } from '../config/gameAssetRegistry.js';
import { normalizeLocalGameMode } from '../scenes/localModeHelpers.js';

const STORAGE_KEY = 'localGameSettings.v1';

const DEFAULT_BOARD_SIZE = onlineBoardSizes[1] ?? onlineBoardSizes[0];
const DEFAULT_FOOD_COUNT = onlineFoodCounts[1] ?? onlineFoodCounts[0];

const DEFAULTS = {
    gameMode: 'normal', // normal | infinite | timeAttack | chaos | kingOfTheHill | territory
    difficulty: 'normal', // easy | normal | hard
    mapId: DEFAULT_MAP_ID,
    boardSizeId: DEFAULT_BOARD_SIZE.id,
    boardCols: DEFAULT_BOARD_SIZE.cols,
    boardRows: DEFAULT_BOARD_SIZE.rows,
    foodCountId: DEFAULT_FOOD_COUNT.id,
    foodCount: DEFAULT_FOOD_COUNT.value,
    players: {
        p1: { name: 'Jugador 1', color: PLAYER_COLORS?.[0] ?? 0xe74c3c, skinId: DEFAULT_SNAKE_SKIN_ID },
        p2: { name: 'Jugador 2', color: PLAYER_COLORS?.[1] ?? 0x3498db, skinId: 'player2' },
    },
};

function normalizeGameMode(value) {
    return normalizeLocalGameMode(value);
}

function normalizeDifficulty(value) {
    return value === 'easy' || value === 'normal' || value === 'hard' ? value : DEFAULTS.difficulty;
}

function safeName(value, fallback) {
    const s = String(value ?? '').trim();
    if (!s) return fallback;
    return s.slice(0, 16);
}

function safeColorHex(value, fallbackHex) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
    const s = String(value ?? '').trim();
    if (s.startsWith('0x')) {
        const parsed = Number(s);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallbackHex;
}

function findBoardSizeOption(input) {
    const id = String(input?.boardSizeId ?? input?.boardSizeId ?? input?.boardSize ?? '').trim();
    if (id) {
        const match = onlineBoardSizes.find((option) => option.id === id);
        if (match) return match;
    }

    const cols = Number(input?.boardCols ?? input?.cols);
    const rows = Number(input?.boardRows ?? input?.rows);
    if (Number.isFinite(cols) && Number.isFinite(rows)) {
        const match = onlineBoardSizes.find((option) => option.cols === cols && option.rows === rows);
        if (match) return match;
        return { id: `${cols}x${rows}`, cols, rows };
    }

    return DEFAULT_BOARD_SIZE;
}

function findFoodCountOption(input) {
    const id = String(input?.foodCountId ?? input?.foodCountId ?? '').trim();
    if (id) {
        const match = onlineFoodCounts.find((option) => option.id === id);
        if (match) return match;
    }

    const value = Number(input?.foodCount);
    if (Number.isFinite(value)) {
        const match = onlineFoodCounts.find((option) => option.value === value);
        if (match) return match;
        return { id: `${value}`, value };
    }

    return DEFAULT_FOOD_COUNT;
}

export function getDefaultLocalGameSettings() {
    // Copy defensivo para evitar mutaciones accidentales
    return JSON.parse(JSON.stringify(DEFAULTS));
}

export function loadLocalGameSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return getDefaultLocalGameSettings();
        const parsed = JSON.parse(raw);
        return normalizeLocalGameSettings(parsed);
    } catch {
        return getDefaultLocalGameSettings();
    }
}

export function saveLocalGameSettings(settings) {
    const normalized = normalizeLocalGameSettings(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
}

export function normalizeLocalGameSettings(input) {
    const base = getDefaultLocalGameSettings();
    const gameMode = normalizeGameMode(input?.gameMode ?? base.gameMode);
    const difficulty = normalizeDifficulty(input?.difficulty ?? base.difficulty);
    const mapId = getMapAsset(input?.mapId ?? base.mapId).id;
    const boardSizeOption = findBoardSizeOption(input ?? base);
    const foodCountOption = findFoodCountOption(input ?? base);

    const p1 = input?.players?.p1 ?? input?.p1 ?? {};
    const p2 = input?.players?.p2 ?? input?.p2 ?? {};

    return {
        gameMode,
        difficulty,
        mapId,
        boardSizeId: boardSizeOption.id,
        boardCols: Number.isFinite(Number(input?.boardCols ?? boardSizeOption.cols)) ? Number(input?.boardCols ?? boardSizeOption.cols) : boardSizeOption.cols,
        boardRows: Number.isFinite(Number(input?.boardRows ?? boardSizeOption.rows)) ? Number(input?.boardRows ?? boardSizeOption.rows) : boardSizeOption.rows,
        foodCountId: foodCountOption.id,
        foodCount: Number.isFinite(Number(input?.foodCount ?? foodCountOption.value)) ? Number(input?.foodCount ?? foodCountOption.value) : foodCountOption.value,
        players: {
            p1: {
                name: safeName(p1?.name, base.players.p1.name),
                color: safeColorHex(p1?.color, base.players.p1.color),
                skinId: getSnakeAsset(p1?.skinId ?? base.players.p1.skinId).id,
            },
            p2: {
                name: safeName(p2?.name, base.players.p2.name),
                color: safeColorHex(p2?.color, base.players.p2.color),
                skinId: getSnakeAsset(p2?.skinId ?? base.players.p2.skinId).id,
            },
        },
    };
}

export function colorNumberToCssHex(colorNumber) {
    const n = Number(colorNumber);
    const safe = Number.isFinite(n) ? (n >>> 0) : 0xffffff;
    return `#${(safe & 0xffffff).toString(16).padStart(6, '0')}`;
}

