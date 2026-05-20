import { PLAYER_COLORS } from '@shared/GameConfig';
import { DEFAULT_MAP_ID, DEFAULT_SNAKE_SKIN_ID, getMapAsset, getSnakeAsset, snakeAssets } from '../config/gameAssetRegistry.js';

const STORAGE_KEY = 'soloGameSettings.v1';

const DEFAULTS = {
    playerName: 'Jugador',
    mapId: DEFAULT_MAP_ID,
    skinId: DEFAULT_SNAKE_SKIN_ID,
    color: PLAYER_COLORS?.[0] ?? 0xe74c3c,
};

function safeName(value, fallback) {
    const s = String(value ?? '').trim();
    if (!s) return fallback;
    return s.slice(0, 16);
}

export function getDefaultSoloGameSettings() {
    return JSON.parse(JSON.stringify(DEFAULTS));
}

export function normalizeSoloGameSettings(input) {
    const base = getDefaultSoloGameSettings();
    const skinId = getSnakeAsset(input?.skinId ?? base.skinId).id;
    const skinIndex = Math.max(0, snakeAssets.findIndex((skin) => skin.id === skinId));
    const colorFromSkin = PLAYER_COLORS[skinIndex % (PLAYER_COLORS.length || 1)] ?? base.color;

    return {
        playerName: safeName(input?.playerName, base.playerName),
        mapId: getMapAsset(input?.mapId ?? base.mapId).id,
        skinId,
        color: Number.isFinite(Number(input?.color)) ? Number(input.color) : colorFromSkin,
    };
}

export function loadSoloGameSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return getDefaultSoloGameSettings();
        return normalizeSoloGameSettings(JSON.parse(raw));
    } catch {
        return getDefaultSoloGameSettings();
    }
}

export function saveSoloGameSettings(settings) {
    const normalized = normalizeSoloGameSettings(settings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
}
