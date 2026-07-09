export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

export type SnakeSegmentState = Position;
export type ObstacleState = Position;

export type FoodType = "apple" | "grape" | "speed" | "poison";

type FoodEffect = (player: PlayerState) => void;

export type FoodConfigItem = {
  frame: number;
  score: number;
  weight: number;
  effect?: FoodEffect;
  hudEffect: string;
  hudDuration: number;
  hudHelp: string;
};

export type FoodState = {
  x: number;
  y: number;
  type: FoodType;
  score: number;
  spawnedAtTick?: number;
}

export interface TerritoryCellState extends Position {
  ownerId: string;
  ownerColor: number;
}

export interface PlayerState {
  id: string;
  skinId: string;
  color: number;
  direction: Direction;
  nextDirection: Direction;
  alive: boolean;
  lives: number;
  score: number;
  segments: SnakeSegmentState[];
  lastEatenFood: FoodConfigItem | null;
  speed: number;
  moveCounter: number;
  speedEffectRemaining: number;
}

export interface GameState {
  players: Map<string, PlayerState>;
  food: FoodState[];
  obstacles: ObstacleState[];
  territory: TerritoryCellState[];
  territoryCounts: Map<string, number>;
}

// ── CTF ──────────────────────────────────��───────────────────────────────────

export type TeamId = 'A' | 'B';

export interface CtfCell {
  col: number;
  row: number;
}

export interface CtfBaseBounds {
  col0: number;
  col1: number;
  row0: number;
  row1: number;
}

export interface CtfFlagState {
  teamId: TeamId;
  /** col/row of the flag home cell. */
  home: CtfCell;
  /** Current position. null when carried. */
  position: CtfCell | null;
  /** sessionId of the carrier, empty string when nobody carries it. */
  carrierId: string;
  /** true when position equals home and carrierId is empty. */
  isAtBase: boolean;
}

export interface CtfTeamState {
  teamId: TeamId;
  captures: number;
  /** sessionIds of team members */
  memberIds: string[];
}

export interface CtfGameState {
  flagA: CtfFlagState;
  flagB: CtfFlagState;
  teamA: CtfTeamState;
  teamB: CtfTeamState;
  /** 'waiting' | 'playing' | 'finished' */
  phase: string;
  winnerTeam: TeamId | '';
}
