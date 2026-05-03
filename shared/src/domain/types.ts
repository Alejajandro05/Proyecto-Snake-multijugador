export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

export type SnakeSegmentState = Position;
// export type FoodState = Position;
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

  // velocidad
  speed: number;
  moveCounter: number;
  speedEffectRemaining: number;
}

export interface GameState {
  players: Map<string, PlayerState>;
  food: FoodState[];
  obstacles: ObstacleState[];
}
