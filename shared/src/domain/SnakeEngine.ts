import type { Direction, GameState, PlayerState, FoodState, SnakeSegmentState, ObstacleState } from './types.js';
import {
  GRID_COLS,
  GRID_ROWS,
  GRID_SIZE,
  FOOD_COUNT,
  INITIAL_SNAKE_LENGTH,
  PLAYER_COLORS,
  RESPAWN_DELAY_MS,
  TICK_MS,
} from './GameConfig.js';

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

const RESPAWN_TICKS = Math.round(RESPAWN_DELAY_MS / TICK_MS);

export interface AddPlayerOptions {
  color?: number;
  startCol?: number;
  startRow?: number;
}

/**
 * Pure game engine – no Phaser, no Colyseus dependencies.
 * All game logic (movement, collision detection, food spawning, respawn) lives here.
 */
export class SnakeEngine {
  private players = new Map<string, PlayerState>();
  private food: FoodState[] = [];
  private obstacles: ObstacleState[] = [];
  private respawnQueue = new Map<string, number>(); // playerId → respawn tick
  private tickCount = 0;

  constructor(initialFood = FOOD_COUNT) {
    for (let i = 0; i < initialFood; i++) {
      this.food.push(this.randomFood());
    }
    this.generateObstacles();
  }

  addPlayer(id: string, options?: AddPlayerOptions): PlayerState {
    const colorIndex = this.players.size;
    const color = options?.color ?? PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
    const startCol = options?.startCol ?? (colorIndex * 6 + 5) % GRID_COLS;
    const startRow = options?.startRow ?? Math.floor(GRID_ROWS / 2);

    const segments: SnakeSegmentState[] = [];
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
      segments.push({ x: (startCol - i) * GRID_SIZE, y: startRow * GRID_SIZE });
    }

    const player: PlayerState = {
      id,
      color,
      direction: 'right',
      nextDirection: 'right',
      alive: true,
      score: 0,
      segments,
    };

    this.players.set(id, player);
    return player;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
    this.respawnQueue.delete(id);
  }

  setNextDirection(playerId: string, direction: Direction): void {
    const player = this.players.get(playerId);
    if (!player || !player.alive) return;
    if (OPPOSITE[player.direction] !== direction) {
      player.nextDirection = direction;
    }
  }

  /** Advance the simulation by one step and return the resulting game state. */
  tick(): GameState {
    this.tickCount++;

    this.respawnQueue.forEach((respawnAt, id) => {
      if (this.tickCount >= respawnAt) {
        this.respawnQueue.delete(id);
        this.doRespawn(id);
      }
    });

    for (const player of this.players.values()) {
      if (player.alive) {
        this.movePlayer(player);
      }
    }

    return this.getState();
  }

  getState(): GameState {
    return {
      players: new Map(this.players),
      food: [...this.food],
      obstacles: [...this.obstacles],
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private movePlayer(player: PlayerState): void {
    player.direction = player.nextDirection;

    const head = player.segments[0];
    let newX = head.x;
    let newY = head.y;

    switch (player.direction) {
      case 'left':  newX -= GRID_SIZE; break;
      case 'right': newX += GRID_SIZE; break;
      case 'up':    newY -= GRID_SIZE; break;
      case 'down':  newY += GRID_SIZE; break;
    }

    // Wrap around walls (toroidal board)
    if (newX < 0)                        newX = (GRID_COLS - 1) * GRID_SIZE;
    else if (newX >= GRID_COLS * GRID_SIZE) newX = 0;
    if (newY < 0)                        newY = (GRID_ROWS - 1) * GRID_SIZE;
    else if (newY >= GRID_ROWS * GRID_SIZE) newY = 0;

    // Self collision
    for (const seg of player.segments) {
      if (seg.x === newX && seg.y === newY) {
        this.killPlayer(player);
        return;
      }
    }

    // Collision with other players
    for (const other of this.players.values()) {
      if (other.id === player.id || !other.alive) continue;
      for (const seg of other.segments) {
        if (seg.x === newX && seg.y === newY) {
          this.killPlayer(player);
          return;
        }
      }
    }
    
    const hitObstacle  = this.obstacles.some(o => o.x === newX && o.y === newY);
    if (hitObstacle) {
        this.killPlayer(player);
        return;
    }

    if (!player.alive) return;

    // Food collision
    let ate = false;
    const foodIdx = this.food.findIndex(f => f.x === newX && f.y === newY);
    if (foodIdx !== -1) {
      this.food.splice(foodIdx, 1);
      this.food.push(this.randomFood());
      player.score += 1;
      ate = true;
    }

    // Move snake: prepend new head, remove tail if not eating
    player.segments.unshift({ x: newX, y: newY });
    if (!ate) {
      player.segments.pop();
    }
  }

  private killPlayer(player: PlayerState): void {
    player.alive = false;
    this.respawnQueue.set(player.id, this.tickCount + RESPAWN_TICKS);
  }

  private doRespawn(id: string): void {
    const player = this.players.get(id);
    if (!player) return;

    const margin = INITIAL_SNAKE_LENGTH + 1;
    const col = Math.floor(Math.random() * (GRID_COLS - margin * 2) + margin);
    const row = Math.floor(Math.random() * (GRID_ROWS - margin * 2) + margin);

    player.segments = [];
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
      player.segments.push({ x: (col - i) * GRID_SIZE, y: row * GRID_SIZE });
    }
    player.direction = 'right';
    player.nextDirection = 'right';
    player.alive = true;
  }

  private randomFood(): FoodState {
    return {
      x: Math.floor(Math.random() * GRID_COLS) * GRID_SIZE,
      y: Math.floor(Math.random() * GRID_ROWS) * GRID_SIZE,
    };
  }

  private randomObstacleInQuadrant(quadrant: 'TL' | 'TR' | 'BL' | 'BR'): ObstacleState {
    const midCol = GRID_COLS / 2;
    const midRow = GRID_ROWS / 2;

    let colMin = 0, colMax = midCol - 1;
    let rowMin = 0, rowMax = midRow - 1;

    switch (quadrant) {
        case 'TR':
            colMin = midCol; colMax = GRID_COLS - 1;
            break;
        case 'BL':
            rowMin = midRow; rowMax = GRID_ROWS - 1;
            break;
        case 'BR':
            colMin = midCol; colMax = GRID_COLS - 1;
            rowMin = midRow; rowMax = GRID_ROWS - 1;
            break;
    }

    return {
        x: Math.floor(Math.random() * (colMax - colMin + 1) + colMin) * GRID_SIZE,
        y: Math.floor(Math.random() * (rowMax - rowMin + 1) + rowMin) * GRID_SIZE
    };
  }

  private generateObstacles(): void {
    const quadrants: ('TL'|'TR'|'BL'|'BR')[] = ['TL','TR','BL','BR'];

    quadrants.forEach(q => {
        for (let i = 0; i < 2; i++) {
            const obs = this.randomObstacleInQuadrant(q);
            this.obstacles.push(obs);
        }
    });
  }

}

