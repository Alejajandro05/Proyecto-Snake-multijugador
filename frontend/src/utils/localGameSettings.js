import { PLAYER_COLORS } from '@shared/GameConfig';

const STORAGE_KEY = 'localGameSettings.v1';

const DEFAULTS = {
    gameMode: 'classic', // classic | timeAttack | chaos
    difficulty: 'normal', // easy | normal | hard
    players: {
        p1: { name: 'Jugador 1', color: PLAYER_COLORS?.[0] ?? 0xe74c3c, skinId: 'p1' },
        p2: { name: 'Jugador 2', color: PLAYER_COLORS?.[1] ?? 0x3498db, skinId: 'p2' },
    },
};

function normalizeGameMode(value) {
    return value === 'classic' || value === 'timeAttack' || value === 'chaos' ? value : DEFAULTS.gameMode;
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

    const p1 = input?.players?.p1 ?? input?.p1 ?? {};
    const p2 = input?.players?.p2 ?? input?.p2 ?? {};

    return {
        gameMode,
        difficulty,
        players: {
            p1: {
                name: safeName(p1?.name, base.players.p1.name),
                color: safeColorHex(p1?.color, base.players.p1.color),
                skinId: String(p1?.skinId ?? base.players.p1.skinId),
            },
            p2: {
                name: safeName(p2?.name, base.players.p2.name),
                color: safeColorHex(p2?.color, base.players.p2.color),
                skinId: String(p2?.skinId ?? base.players.p2.skinId),
            },
        },
    };
}

export function colorNumberToCssHex(colorNumber) {
    const n = Number(colorNumber);
    const safe = Number.isFinite(n) ? (n >>> 0) : 0xffffff;
    return `#${(safe & 0xffffff).toString(16).padStart(6, '0')}`;
}

