import type { FoodType } from './types.js';

export const GRID_COLS = 32;
export const GRID_ROWS = 24;
export const GRID_SIZE = 32;
export const TICK_MS = 150;
export const FOOD_COUNT = 10;
export const INITIAL_SNAKE_LENGTH = 3;
export const RESPAWN_DELAY_MS = 3000;
export const SAFE_MARGIN = 3;
export const WIN_SCORE = 10;
export const MAX_LIVES = 3;
export const INITIAL_PLAYER_SPEED = 2;

export const PLAYER_COLORS: number[] = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71];

export type GameDifficulty = 'easy' | 'normal' | 'hard';

export interface GameRuntimeConfig {
	gridCols: number;
	gridRows: number;
	gridSize: number;
	tickMs: number;
	foodCount: number;
	initialSnakeLength: number;
	respawnDelayMs: number;
	safeMargin: number;
	maxLives: number;
	obstaclesPerQuadrant: number;
	difficulty: GameDifficulty;
	territoryMode: boolean;
	/** 0 = el kiwi no expira; >0 = ms hasta reemplazarlo por otra fruta aleatoria. */
	poisonFoodTtlMs: number;
	/** Pesos de aparición por tipo de fruta (sustituyen los de FOOD_CONFIG). */
	foodWeightOverrides: Partial<Record<FoodType, number>>;
	/** Si es true, chocar con el borde mata; si no, el tablero se envuelve. */
	wallCollision: boolean;
	/** Intervalo base de movimiento (menor = más rápido). */
	initialPlayerSpeed: number;
}

type RuntimeConfigInput = Partial<GameRuntimeConfig> & {
	foodWeightOverrides?: Partial<Record<FoodType, number>>;
};

const DEFAULT_DIFFICULTY: GameDifficulty = 'normal';

const DIFFICULTY_PRESETS: Record<GameDifficulty, Pick<GameRuntimeConfig, 'tickMs' | 'foodCount' | 'obstaclesPerQuadrant'>> = {
	easy: {
		tickMs: 180,
		foodCount: 10,
		obstaclesPerQuadrant: 6,
	},
	normal: {
		tickMs: TICK_MS,
		foodCount: FOOD_COUNT,
		obstaclesPerQuadrant: 8,
	},
	hard: {
		tickMs: 110,
		foodCount: 5,
		obstaclesPerQuadrant: 10,
	},
};

function clampInt(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return min;
	return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeDifficulty(value?: string): GameDifficulty {
	if (value === 'easy' || value === 'normal' || value === 'hard') {
		return value;
	}
	return DEFAULT_DIFFICULTY;
}

const FOOD_TYPES: FoodType[] = ['apple', 'grape', 'speed', 'poison'];

function normalizeFoodWeightOverrides(
	input?: Partial<Record<FoodType, number>>,
): Partial<Record<FoodType, number>> {
	if (!input) return {};

	const overrides: Partial<Record<FoodType, number>> = {};
	for (const type of FOOD_TYPES) {
		const value = input[type];
		if (value === undefined || !Number.isFinite(value) || value <= 0) continue;
		overrides[type] = clampInt(value, 1, 1000);
	}
	return overrides;
}

export function resolveGameRuntimeConfig(input?: RuntimeConfigInput): GameRuntimeConfig {
	const difficulty = normalizeDifficulty(input?.difficulty);
	const preset = DIFFICULTY_PRESETS[difficulty];

	const gridCols = clampInt(input?.gridCols ?? GRID_COLS, 8, 128);
	const gridRows = clampInt(input?.gridRows ?? GRID_ROWS, 8, 128);

	return {
		gridCols,
		gridRows,
		gridSize: clampInt(input?.gridSize ?? GRID_SIZE, 8, 128),
		tickMs: clampInt(input?.tickMs ?? preset.tickMs, 40, 3000),
		foodCount: clampInt(input?.foodCount ?? preset.foodCount, 0, Math.max(0, gridCols * gridRows)),
		initialSnakeLength: clampInt(input?.initialSnakeLength ?? INITIAL_SNAKE_LENGTH, 2, 32),
		respawnDelayMs: clampInt(input?.respawnDelayMs ?? RESPAWN_DELAY_MS, 250, 30_000),
		safeMargin: clampInt(input?.safeMargin ?? SAFE_MARGIN, 0, Math.max(0, Math.min(gridCols, gridRows) - 1)),
		maxLives: clampInt(input?.maxLives ?? MAX_LIVES, 1, 99),
		obstaclesPerQuadrant: clampInt(input?.obstaclesPerQuadrant ?? preset.obstaclesPerQuadrant, 0, Math.max(gridCols, gridRows)),
		difficulty,
		territoryMode: input?.territoryMode === true,
		poisonFoodTtlMs: clampInt(input?.poisonFoodTtlMs ?? 0, 0, 300_000),
		foodWeightOverrides: normalizeFoodWeightOverrides(input?.foodWeightOverrides),
		wallCollision: input?.wallCollision === true,
		initialPlayerSpeed: clampInt(input?.initialPlayerSpeed ?? INITIAL_PLAYER_SPEED, 1, 8),
	};
}
