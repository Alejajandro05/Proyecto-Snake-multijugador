import { Room, Client, CloseCode } from "colyseus";
import { SnakeRoomState } from "./schema/SnakeRoomState.js";
import { Player } from "./schema/Player.js";
import { SnakeSegment } from "./schema/SnakeSegment.js";
import { Food } from "./schema/Food.js";
import { Obstacle } from "./schema/Obstacle.js";
import { SnakeEngine } from "../../../shared/src/domain/SnakeEngine.js";
import type { GameState } from "../../../shared/src/domain/types.js";
import { PLAYER_COLORS, TICK_MS, type GameDifficulty, resolveGameRuntimeConfig } from "../../../shared/src/domain/GameConfig.js";

interface SnakeRoomCreateOptions {
  boardCols?: number;
  boardRows?: number;
  boardCellSize?: number;
  foodCount?: number;
  obstaclesPerQuadrant?: number;
  difficulty?: GameDifficulty;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toDifficulty(value: unknown): GameDifficulty | undefined {
  if (value === "easy" || value === "normal" || value === "hard") {
    return value;
  }
  return undefined;
}

function getRoomRuntimeConfig(options?: SnakeRoomCreateOptions) {
  return resolveGameRuntimeConfig({
    gridCols: toFiniteNumber(options?.boardCols),
    gridRows: toFiniteNumber(options?.boardRows),
    gridSize: toFiniteNumber(options?.boardCellSize),
    foodCount: toFiniteNumber(options?.foodCount),
    obstaclesPerQuadrant: toFiniteNumber(options?.obstaclesPerQuadrant),
    difficulty: toDifficulty(options?.difficulty),
  });
}

export class SnakeRoom extends Room<SnakeRoomState> {
  maxClients = 4;
  private engine!: SnakeEngine;
  private tickMs = TICK_MS;

  onCreate(options?: SnakeRoomCreateOptions) {
    this.setState(new SnakeRoomState());
    const runtimeConfig = getRoomRuntimeConfig(options);
    this.engine = new SnakeEngine(runtimeConfig);
    this.tickMs = runtimeConfig.tickMs;

    this.onMessage("changeDirection", (client, direction: string) => {
      this.engine.setNextDirection(client.sessionId, direction as any);
    });

    this.setSimulationInterval(() => {
      const state = this.engine.tick();
      this.syncToSchema(state);
    }, this.tickMs);
  }

  onJoin(client: Client, _options: any) {
    const colorIndex = this.state.players.size % PLAYER_COLORS.length;
    const playerState = this.engine.addPlayer(client.sessionId, {
      color: PLAYER_COLORS[colorIndex],
    });

    const player = new Player();
    player.sessionId = client.sessionId;
    player.color = playerState.color;
    player.alive = playerState.alive;
    player.lives = playerState.lives;
    player.score = playerState.score;
    player.direction = playerState.direction;
    player.nextDirection = playerState.nextDirection;

    for (const seg of playerState.segments) {
      const s = new SnakeSegment();
      s.x = seg.x;
      s.y = seg.y;
      player.segments.push(s);
    }

    this.state.players.set(client.sessionId, player);
    console.log(client.sessionId, "joined. Players:", this.state.players.size);
  }

  onLeave(client: Client, _code: CloseCode) {
    this.engine.removePlayer(client.sessionId);
    this.state.players.delete(client.sessionId);
    console.log(client.sessionId, "left. Players:", this.state.players.size);
  }

  onDispose() {
    console.log("SnakeRoom", this.roomId, "disposing...");
  }

  // ─── Schema sync ──────────────────────────────────────────────────────────

  private syncToSchema(gameState: GameState): void {
    gameState.players.forEach((playerState, id) => {
      const player = this.state.players.get(id);
      if (!player) return;

      player.direction = playerState.direction;
      player.nextDirection = playerState.nextDirection;
      player.alive = playerState.alive;
      player.lives = playerState.lives;
      player.score = playerState.score;

      this.syncSegments(player, playerState.segments);
    });

    this.syncFood(gameState.food);
    this.syncObstacles(gameState.obstacles);
  }

  private syncSegments(player: Player, segments: { x: number; y: number }[]): void {
    while (player.segments.length < segments.length) {
      player.segments.push(new SnakeSegment());
    }
    while (player.segments.length > segments.length) {
      player.segments.pop();
    }
    for (let i = 0; i < segments.length; i++) {
      player.segments[i].x = segments[i].x;
      player.segments[i].y = segments[i].y;
    }
  }

  private syncFood(food: { x: number; y: number }[]): void {
    while (this.state.food.length < food.length) {
      this.state.food.push(new Food());
    }
    while (this.state.food.length > food.length) {
      this.state.food.pop();
    }
    for (let i = 0; i < food.length; i++) {
      this.state.food[i].x = food[i].x;
      this.state.food[i].y = food[i].y;
    }
  }

  private syncObstacles(obstacles: { x: number; y: number }[]): void {
    while (this.state.obstacles.length < obstacles.length) {
      this.state.obstacles.push(new Obstacle());
    }
    while (this.state.obstacles.length > obstacles.length) {
      this.state.obstacles.pop();
    }
    for (let i = 0; i < obstacles.length; i++) {
      this.state.obstacles[i].x = obstacles[i].x;
      this.state.obstacles[i].y = obstacles[i].y;
    }
  }
}
