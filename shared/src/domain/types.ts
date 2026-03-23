export type Direction = 'up' | 'down' | 'left' | 'right';

export interface SnakeSegmentState {
  x: number;
  y: number;
}

export interface PlayerState {
  id: string;
  color: number;
  direction: Direction;
  nextDirection: Direction;
  alive: boolean;
  score: number;
  segments: SnakeSegmentState[];
}

export interface FoodState {
  x: number;
  y: number;
}

export interface GameState {
  players: Map<string, PlayerState>;
  food: FoodState[];
}
