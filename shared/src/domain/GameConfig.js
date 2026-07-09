// Runtime JS mirror — generated from GameConfig.ts. Do not edit by hand.
export const GRID_COLS = 32;
export const GRID_ROWS = 24;
export const GRID_SIZE = 32;
export const TICK_MS = 90;
const EASY_TICK_MS = TICK_MS + 20;
const HARD_TICK_MS = TICK_MS - 15;
export const FOOD_COUNT = 10;
export const INITIAL_SNAKE_LENGTH = 3;
export const RESPAWN_DELAY_MS = 3000;
export const SAFE_MARGIN = 3;
export const WIN_SCORE = 10;
export const MAX_LIVES = 3;
export const INITIAL_PLAYER_SPEED = 2;
export const PLAYER_COLORS = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71];

// CTF
export const CTF_MAX_PLAYERS = 4;
export const CTF_CAPTURES_TO_WIN = 3;
export const CTF_TEAM_A_COLOR = 0x3399ff;
export const CTF_TEAM_B_COLOR = 0xff4444;
export const CTF_FLAG_BASE_MARGIN = 3;
export const CTF_BASE_HALF_HEIGHT = 3;

const DEFAULT_DIFFICULTY = 'normal';
const DIFFICULTY_PRESETS = {
  easy:   { tickMs: EASY_TICK_MS, foodCount: 10, obstaclesPerQuadrant: 6 },
  normal: { tickMs: TICK_MS,      foodCount: FOOD_COUNT, obstaclesPerQuadrant: 8 },
  hard:   { tickMs: HARD_TICK_MS, foodCount: 5,  obstaclesPerQuadrant: 10 },
};

function clampInt(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeDifficulty(value) {
  if (value === 'easy' || value === 'normal' || value === 'hard') return value;
  return DEFAULT_DIFFICULTY;
}

const FOOD_TYPES = ['apple', 'grape', 'speed', 'poison'];

function normalizeFoodWeightOverrides(input) {
  if (!input) return {};
  const overrides = {};
  for (const type of FOOD_TYPES) {
    const value = input[type];
    if (value === undefined || !Number.isFinite(value) || value <= 0) continue;
    overrides[type] = clampInt(value, 1, 1000);
  }
  return overrides;
}

export function resolveGameRuntimeConfig(input) {
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
