import { Room, Client } from "colyseus";
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
  mapId?: string;
  gameMode?: unknown;
  lobbyId?: unknown;
}

interface SnakeRoomJoinOptions {
  skinId?: string;
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

function toMapId(value: unknown): string {
  if (typeof value !== "string") return "arena01";
  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, 32) : "arena01";
}

function toSkinId(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, 32) : fallback;
}

function toOptionId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, 32) : undefined;
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

export class SnakeRoom extends Room<{ state: SnakeRoomState }> {
  maxClients = 4;
  private engine!: SnakeEngine;
  private tickMs = TICK_MS;

  onCreate(options?: SnakeRoomCreateOptions) {
    this.state = new SnakeRoomState();
    const runtimeConfig = getRoomRuntimeConfig(options);
    this.engine = new SnakeEngine(runtimeConfig);
    this.tickMs = runtimeConfig.tickMs;
    this.metadata = {
      lobbyId: toOptionId(options?.lobbyId) ?? "",
      gameMode: toOptionId(options?.gameMode) ?? "classic",
      mapId: toMapId(options?.mapId),
    };

    this.state.boardCols = runtimeConfig.gridCols;
    this.state.boardRows = runtimeConfig.gridRows;
    this.state.boardCellSize = runtimeConfig.gridSize;
    this.state.tickMs = runtimeConfig.tickMs;
    this.state.foodCount = runtimeConfig.foodCount;
    this.state.obstaclesPerQuadrant = runtimeConfig.obstaclesPerQuadrant;
    this.state.difficulty = runtimeConfig.difficulty;
    this.state.mapId = toMapId(options?.mapId);

    this.onMessage("changeDirection", (client, direction: string) => {
      this.engine.setNextDirection(client.sessionId, direction as any);
    });

    this.setSimulationInterval(() => {
      const state = this.engine.tick();
      this.syncToSchema(state);
    }, this.tickMs);
  }

  onJoin(client: Client, options?: SnakeRoomJoinOptions) {
    const colorIndex = this.state.players.size % PLAYER_COLORS.length;
    const fallbackSkinId = `skin-${colorIndex + 1}`;
    const playerState = this.engine.addPlayer(client.sessionId, {
      color: PLAYER_COLORS[colorIndex],
      skinId: toSkinId(options?.skinId, fallbackSkinId),
    });

    const player = new Player();
    player.sessionId = client.sessionId;
    player.skinId = playerState.skinId;
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

  onLeave(client: Client, _code: number) {
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
      player.skinId = playerState.skinId;

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

  private syncFood(food: { x: number; y: number; type?: string; score?: number }[]): void {
    while (this.state.food.length < food.length) {
      this.state.food.push(new Food());
    }
    while (this.state.food.length > food.length) {
      this.state.food.pop();
    }
    for (let i = 0; i < food.length; i++) {
      this.state.food[i].x = food[i].x;
      this.state.food[i].y = food[i].y;
      this.state.food[i].type = food[i].type ?? "apple";
      this.state.food[i].score = food[i].score ?? 0;
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
