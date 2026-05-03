import type { Direction, GameState, PlayerState, FoodState, SnakeSegmentState, ObstacleState, Position, FoodType, FoodConfigItem, TerritoryCellState } from './types.js';
import {
  type GameRuntimeConfig,
  PLAYER_COLORS,
  resolveGameRuntimeConfig,
  WIN_SCORE,
} from './GameConfig.js';
import { EventEmitter } from "./EventEmitter.js"

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export interface AddPlayerOptions {
  color?: number;
  startCol?: number;
  startRow?: number;
  skinId?: string;
}

export const FOOD_CONFIG: Record<string, FoodConfigItem> = {
  apple: {
    frame: 0,
    score: 1,
    weight: 60,
    hudEffect: "+1",
    hudDuration: 2000,
    hudHelp: "🍎 = +1"
  },

  grape: {
    frame: 1,
    score: 3,
    weight: 20,
    hudEffect: "+3",
    hudDuration: 2000,
    hudHelp: "🍇 = +3"
  },

  speed: {
    frame: 4,
    score: 0,
    weight: 10,
    effect: (player) => {
      player.speed = 1;
      player.speedEffectRemaining = Math.max(player.speedEffectRemaining, 50);
    },
    hudEffect: "speed boost",
    hudDuration: 5000,
    hudHelp: "🍓 = speed boost 5s"
  },

  poison: {
    frame: 4,
    score: -2,
    weight: 10,
    effect: (player) => {
      player.speed = 3;
      player.speedEffectRemaining = Math.max(player.speedEffectRemaining, 50);
    },
    hudEffect: "-2, speed reduce",
    hudDuration: 5000,
    hudHelp: "🥝 = -2, reduce speed 5s"
  }
};

/**
 * Pure game engine – no Phaser, no Colyseus dependencies.
 * All game logic (movement, collision detection, food spawning, respawn) lives here.
 */
export class SnakeEngine {
  private readonly config: GameRuntimeConfig;
  private players = new Map<string, PlayerState>();
  private inputQueues = new Map<string, Direction[]>();
  private food: FoodState[] = [];
  private obstacles: ObstacleState[] = [];
  private territory = new Map<string, TerritoryCellState>();
  private territoryCounts = new Map<string, number>();
  private respawnQueue = new Map<string, number>(); // playerId → respawn tick
  private tickCount = 0;
  private readonly respawnTicks: number;

  private speedDurationMs = 5000;
  private ticksTicksDurationMs;

  private events = new EventEmitter();

  constructor(config?: Partial<GameRuntimeConfig>);
  constructor(initialFood?: number, config?: Partial<GameRuntimeConfig>);
  constructor(initialFoodOrConfig?: number | Partial<GameRuntimeConfig>, configOverrides?: Partial<GameRuntimeConfig>) {
    const configInput = typeof initialFoodOrConfig === 'number'
      ? { ...configOverrides, foodCount: initialFoodOrConfig }
      : initialFoodOrConfig;

    this.config = resolveGameRuntimeConfig(configInput);
    this.respawnTicks = Math.max(1, Math.round(this.config.respawnDelayMs / this.config.tickMs));

    this.ticksTicksDurationMs = Math.ceil(this.speedDurationMs / this.config.tickMs);

    this.generateObstacles(); 
    
    for (let i = 0; i < this.config.foodCount; i++) {
      this.food.push(this.randomFood());
    }
  }

  getConfig(): GameRuntimeConfig {
    return { ...this.config };
  }

  addPlayer(id: string, options?: AddPlayerOptions): PlayerState {
    const colorIndex = this.players.size;
    const color = options?.color ?? PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
    const skinId = options?.skinId?.trim() || `skin-${colorIndex + 1}`;
    const startCol = options?.startCol ?? (colorIndex * 6 + 5) % this.config.gridCols;
    const startRow = options?.startRow ?? Math.floor(this.config.gridRows / 2);

    const segments: SnakeSegmentState[] = [];
    for (let i = 0; i < this.config.initialSnakeLength; i++) {
      segments.push({ x: (startCol - i) * this.config.gridSize, y: startRow * this.config.gridSize });
    }

    const player: PlayerState = {
      id,
      skinId,
      color,
      direction: 'right',
      nextDirection: 'right',
      alive: true,
      lives: this.config.maxLives,
      score: 0,
      segments,
      lastEatenFood: null,
      speed: 1,
      moveCounter: 0,
      speedEffectRemaining: 0
    };

    this.players.set(id, player);
    this.inputQueues.set(id, []);
    return player;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
    this.inputQueues.delete(id);
    this.respawnQueue.delete(id);
  }

  setNextDirection(playerId: string, direction: Direction): void {
    const player = this.players.get(playerId);
    if (!player || !player.alive) return;

    const queue = this.inputQueues.get(playerId) ?? [];
    const lastPlannedDirection = queue[queue.length - 1] ?? player.nextDirection ?? player.direction;

    if (direction === lastPlannedDirection || OPPOSITE[lastPlannedDirection] === direction) {
      return;
    }

    if (queue.length >= 3) {
      return;
    }

    queue.push(direction);
    this.inputQueues.set(playerId, queue);
    player.nextDirection = queue[0] ?? player.direction;
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
      if (!player.alive) continue;

      // Reducir duración de velocidad
      if (player.speedEffectRemaining > 0) {
        player.speedEffectRemaining--;

        if (player.speedEffectRemaining <= 0) {
        player.speed = 1;
        }
      }

      player.moveCounter++;

      if (player.moveCounter >= player.speed) {
        this.movePlayer(player);
        player.moveCounter = 0;
      }
    }

    return this.getState();
  }

  getState(): GameState {
    return {
      players: new Map(this.players),
      food: [...this.food],
      obstacles: [...this.obstacles],
      territory: Array.from(this.territory.values(), (cell) => ({ ...cell })),
      territoryCounts: new Map(this.territoryCounts),
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private movePlayer(player: PlayerState): void {
    player.direction = this.consumePlannedDirection(player);

    const head = player.segments[0];
    let newX = head.x;
    let newY = head.y;

    switch (player.direction) {
      case 'left':  newX -= this.config.gridSize; break;
      case 'right': newX += this.config.gridSize; break;
      case 'up':    newY -= this.config.gridSize; break;
      case 'down':  newY += this.config.gridSize; break;
    }

    // Wrap around walls (toroidal board)
    if (newX < 0)                        newX = (this.config.gridCols - 1) * this.config.gridSize;
    else if (newX >= this.config.gridCols * this.config.gridSize) newX = 0;
    if (newY < 0)                        newY = (this.config.gridRows - 1) * this.config.gridSize;
    else if (newY >= this.config.gridRows * this.config.gridSize) newY = 0;

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
      for (let i = 0; i < other.segments.length; i++) {
        const seg = other.segments[i];
        if (seg.x === newX && seg.y === newY) {
          if (i === 0) {
            // Head-to-head collision: larger snake survives
            if (player.segments.length > other.segments.length) {
              this.killPlayer(other);
            } else if (player.segments.length < other.segments.length) {
              this.killPlayer(player);
              return;
            } else {
              // Same size, both die
              this.killPlayer(player);
              this.killPlayer(other);
              return;
            }
          } else {
            // Hit body, die
            this.killPlayer(player);
            return;
          }
        }
      }
    }
    
    const hitObstacle  = this.obstacles.some(o => o.x === newX && o.y === newY);
    if (hitObstacle) {
        this.killPlayer(player);
        return;
    }

    if (!player.alive) return;

    this.claimTerritory(player, newX, newY);

    // Food collision
    let shouldGrow = false;
    const foodIdx = this.food.findIndex(f => f.x === newX && f.y === newY);
    if (foodIdx !== -1) {
      const eatenFood = this.food[foodIdx];

      this.food.splice(foodIdx, 1);
      this.food.push(this.randomFood());

      const config = FOOD_CONFIG[eatenFood.type ?? 'apple'] ?? FOOD_CONFIG.apple;
      player.lastEatenFood = config;

      this.events.emit("playerEatFood", {
        playerId: player.id,
        food: config
      });

      let temp_score = player.score + config.score;

      if(temp_score < 0) player.score = 0;
      else if(temp_score > WIN_SCORE) player.score = WIN_SCORE;
      else player.score = temp_score;

      config.effect?.(player);

      shouldGrow = config.score > 0;
    }

    // Move snake: prepend new head, remove tail if not eating
    player.segments.unshift({ x: newX, y: newY });
    if (!shouldGrow) {
      player.segments.pop();
    }
  }

  private killPlayer(player: PlayerState): void {
    player.alive = false;
    player.lives -= 1;
    this.inputQueues.set(player.id, []);
    player.nextDirection = player.direction;
    if(player.lives > 0){
      this.respawnQueue.set(player.id, this.tickCount + this.respawnTicks);
    }
  }

  private doRespawn(id: string): void {
    const player = this.players.get(id);
    if (!player) return;

    const margin = this.config.initialSnakeLength + 1;
    
    let col: number;
    let row: number;
    let attempts = 0;

    do {
      col = Math.floor(Math.random() * (this.config.gridCols - margin * 2) + margin);
      row = Math.floor(Math.random() * (this.config.gridRows - margin * 2) + margin);
      attempts++;
    } while (!this.isAreaSafeForSnake(col, row, this.config.safeMargin) && attempts < 50);

    player.segments = [];
    for (let i = 0; i < this.config.initialSnakeLength; i++) {
      player.segments.push({ x: (col - i) * this.config.gridSize, y: row * this.config.gridSize });
    }
    player.direction = 'right';
    player.nextDirection = 'right';
    this.inputQueues.set(id, []);
    player.speed = 1;
    player.moveCounter = 0;
    player.speedEffectRemaining = 0;
    player.alive = true;
  }

  private consumePlannedDirection(player: PlayerState): Direction {
    const queue = this.inputQueues.get(player.id);
    if (!queue || queue.length === 0) {
      player.nextDirection = player.direction;
      return player.direction;
    }

    const nextDirection = queue.shift()!;
    player.nextDirection = queue[0] ?? nextDirection;
    return nextDirection;
  }

  private claimTerritory(player: PlayerState, x: number, y: number): void {
    if (!this.config.territoryMode) return;

    const key = `${x},${y}`;
    const previous = this.territory.get(key);
    if (previous?.ownerId === player.id) return;

    if (previous?.ownerId) {
      this.territoryCounts.set(previous.ownerId, Math.max(0, (this.territoryCounts.get(previous.ownerId) ?? 0) - 1));
    }

    this.territory.set(key, {
      x,
      y,
      ownerId: player.id,
      ownerColor: player.color,
    });
    this.territoryCounts.set(player.id, (this.territoryCounts.get(player.id) ?? 0) + 1);
  }

  private getSnakesPosition(): Position[] {
    let playerSegments: SnakeSegmentState[] = [];
    this.players.forEach(p => p.segments.forEach(s => playerSegments.push(s)));
    return playerSegments;
  }

  private randomFood(): FoodState {
    let playerSegments: Position[] = this.getSnakesPosition();
    let food: FoodState;

    const type = this.getRandomFoodType();

    do{
      food = {
        x: Math.floor(Math.random() * this.config.gridCols) * this.config.gridSize,
        y: Math.floor(Math.random() * this.config.gridRows) * this.config.gridSize,
        type: type,
        score: FOOD_CONFIG[type].score
      };
    }
    while (this.isCellOccupied(food.x, food.y));
    return food;
  }

  private getRandomFoodType(): FoodType {
    const entries = Object.entries(FOOD_CONFIG) as [FoodType, typeof FOOD_CONFIG[FoodType]][];

    const totalWeight = entries.reduce((sum, [, cfg]) => sum + cfg.weight, 0);
    let r = Math.random() * totalWeight;

    for (const [type, cfg] of entries) {
      r -= cfg.weight;
      if (r < 0) return type;
    }

    return entries[0][0];
  }


  private randomObstacleInQuadrant(quadrant: 'TL' | 'TR' | 'BL' | 'BR'): ObstacleState {
    const midCol = Math.floor(this.config.gridCols / 2);
    const midRow = Math.floor(this.config.gridRows / 2);

    // por defecto TL
    let colMin = 0, colMax = midCol - 1;
    let rowMin = 0, rowMax = midRow - 1;

    switch (quadrant) {
      case 'TR':
        colMin = midCol; colMax = this.config.gridCols - 1;
        break;
      case 'BL':
        rowMin = midRow; rowMax = this.config.gridRows - 1;
        break;
      case 'BR':
        colMin = midCol; colMax = this.config.gridCols - 1;
        rowMin = midRow; rowMax = this.config.gridRows - 1;
        break;
    }

    let playerSegments = this.getSnakesPosition();
    let pos: ObstacleState;
    do{
      pos = {
        x: Math.floor(Math.random() * (colMax - colMin + 1) + colMin) * this.config.gridSize,
        y: Math.floor(Math.random() * (rowMax - rowMin + 1) + rowMin) * this.config.gridSize
      };
    }while (playerSegments.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  private generateObstacles(): void {
    const quadrants: ('TL'|'TR'|'BL'|'BR')[] = ['TL','TR','BL','BR'];

    quadrants.forEach(q => {
      for (let i = 0; i < this.config.obstaclesPerQuadrant; i++) {
        const obs = this.randomObstacleInQuadrant(q);
        this.obstacles.push(obs);
      }
    });
  }

  /** Re-roll obstacle positions (e.g. chaos mode). Snakes are avoided; food is not moved. */
  regenerateObstacles(): void {
    this.obstacles.length = 0;
    this.generateObstacles();
  }

  private isSafeSpawn(col: number, row: number): boolean {
    return this.obstacles.every(ob => {
      const obCol = ob.x / this.config.gridSize;
      const obRow = ob.y / this.config.gridSize;
      return Math.abs(obCol - col) > this.config.safeMargin || Math.abs(obRow - row) > this.config.safeMargin;
    });
  }

  private isCellOccupied(x: number, y: number): boolean {
    // snakes
    if (this.getSnakesPosition().some(s => s.x == x && s.y == y)) return true;

    // food
    if (this.food.some(f => f.x === x && f.y === y)) return true;

    // obstacles
    if (this.obstacles.some(o => o.x === x && o.y === y)) return true;

    return false;
  }

  private isAreaSafeForSnake(col: number, row: number, margin: number): boolean {
    const startCol = col - margin;
    const endCol = col + margin;
    const startRow = row - margin;
    const endRow = row + margin;

    for (let c = startCol; c <= endCol; c++) {
      for (let r = startRow; r <= endRow; r++) {
        const x = c * this.config.gridSize;
        const y = r * this.config.gridSize;

        if (this.isCellOccupied(x, y)) return false;
      }
    }

    return true;
  }

}

