export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
  x: number;
  y: number;
}

export type SnakeSegmentState = Position;
export type FoodState = Position;
export type ObstacleState = Position;

export interface PlayerState {
  id: string;
  color: number;
  direction: Direction;
  nextDirection: Direction;
  alive: boolean;
  lives: number;
  score: number;
  segments: SnakeSegmentState[];
}

export interface GameState {
  players: Map<string, PlayerState>;
  food: FoodState[];
  obstacles: ObstacleState[];
}
