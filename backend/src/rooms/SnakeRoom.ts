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
  playerName?: string;
}

interface HillBounds {
  col0: number;
  col1: number;
  row0: number;
  row1: number;
}

const HILL_WIN_SCORE = 100;
const HILL_POINTS_PER_TICK = 1;
const HILL_ZONE_SHIFT_MS = 6000;

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

function toPlayerName(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, 24) : fallback;
}

function toOptionId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, 32) : undefined;
}

function toGameMode(value: unknown): string {
  const optionId = toOptionId(value);
  if (optionId === "duel" || optionId === "kingOfTheHill") {
    return optionId;
  }
  return "classic";
}

function getHillZoneDimensions(gridCols: number, gridRows: number) {
  let zoneW = Math.max(5, Math.floor(gridCols * 0.32));
  let zoneH = Math.max(4, Math.floor(gridRows * 0.28));
  zoneW = Math.min(zoneW, gridCols);
  zoneH = Math.min(zoneH, gridRows);
  return { zoneW, zoneH };
}

function randomHillCellBounds(gridCols: number, gridRows: number, zoneW: number, zoneH: number, previous?: HillBounds | null): HillBounds {
  const maxCol0 = gridCols - zoneW;
  const maxRow0 = gridRows - zoneH;

  if (maxCol0 < 0 || maxRow0 < 0) {
    const cx = Math.floor(gridCols / 2);
    const cy = Math.floor(gridRows / 2);
    let col0 = Math.max(0, cx - Math.floor(zoneW / 2));
    let row0 = Math.max(0, cy - Math.floor(zoneH / 2));
    col0 = Math.min(col0, Math.max(0, gridCols - zoneW));
    row0 = Math.min(row0, Math.max(0, gridRows - zoneH));
    return { col0, col1: col0 + zoneW - 1, row0, row1: row0 + zoneH - 1 };
  }

  let col0 = 0;
  let row0 = 0;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    col0 = Math.floor(Math.random() * (maxCol0 + 1));
    row0 = Math.floor(Math.random() * (maxRow0 + 1));
    if (!previous || col0 !== previous.col0 || row0 !== previous.row0) {
      break;
    }
  }

  return { col0, col1: col0 + zoneW - 1, row0, row1: row0 + zoneH - 1 };
}

function headCell(head: { x: number; y: number }, gridSize: number) {
  return {
    col: Math.round(head.x / gridSize),
    row: Math.round(head.y / gridSize),
  };
}

function isHeadInHill(
  player: GameState["players"] extends Map<string, infer T> ? T : never,
  gridSize: number,
  bounds?: HillBounds | null,
) {
  if (!player?.alive || !player.segments?.length || !bounds) return false;
  const { col, row } = headCell(player.segments[0], gridSize);
  return col >= bounds.col0 && col <= bounds.col1 && row >= bounds.row0 && row <= bounds.row1;
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
  private gameMode = "classic";
  private hillBounds: HillBounds | null = null;
  private hillZoneW = 0;
  private hillZoneH = 0;
  private hillElapsedMs = 0;

  onCreate(options?: SnakeRoomCreateOptions) {
    this.state = new SnakeRoomState();
    const runtimeConfig = getRoomRuntimeConfig(options);
    this.engine = new SnakeEngine(runtimeConfig);
    this.tickMs = runtimeConfig.tickMs;
    this.gameMode = toGameMode(options?.gameMode);
    this.metadata = {
      lobbyId: toOptionId(options?.lobbyId) ?? "",
      gameMode: this.gameMode,
      mapId: toMapId(options?.mapId),
    };

    this.state.boardCols = runtimeConfig.gridCols;
    this.state.boardRows = runtimeConfig.gridRows;
    this.state.boardCellSize = runtimeConfig.gridSize;
    this.state.tickMs = runtimeConfig.tickMs;
    this.state.foodCount = runtimeConfig.foodCount;
    this.state.obstaclesPerQuadrant = runtimeConfig.obstaclesPerQuadrant;
    this.state.difficulty = runtimeConfig.difficulty;
    this.state.gameMode = this.gameMode;
    this.state.mapId = toMapId(options?.mapId);
    this.state.hillWinScore = this.gameMode === "kingOfTheHill" ? HILL_WIN_SCORE : 0;

    if (this.gameMode === "kingOfTheHill") {
      this.initializeHillState(runtimeConfig.gridCols, runtimeConfig.gridRows);
    }

    this.onMessage("changeDirection", (client, direction: string) => {
      this.engine.setNextDirection(client.sessionId, direction as any);
    });

    this.setSimulationInterval(() => {
      const state = this.engine.tick();
      this.applyModeRules(state);
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
    player.playerName = toPlayerName(options?.playerName, `Jugador ${colorIndex + 1}`);
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

  private initializeHillState(gridCols: number, gridRows: number) {
    const { zoneW, zoneH } = getHillZoneDimensions(gridCols, gridRows);
    this.hillZoneW = zoneW;
    this.hillZoneH = zoneH;
    this.hillBounds = randomHillCellBounds(gridCols, gridRows, zoneW, zoneH);
    this.hillElapsedMs = 0;
    this.syncHillStateToSchema();
  }

  private rollNewHillZone() {
    const runtimeConfig = this.engine.getConfig();
    this.hillBounds = randomHillCellBounds(
      runtimeConfig.gridCols,
      runtimeConfig.gridRows,
      this.hillZoneW,
      this.hillZoneH,
      this.hillBounds,
    );
  }

  private applyModeRules(gameState: GameState) {
    if (this.gameMode !== "kingOfTheHill") {
      return;
    }

    const gridSize = this.engine.getConfig().gridSize;
    gameState.players.forEach((playerState) => {
      if (isHeadInHill(playerState, gridSize, this.hillBounds)) {
        playerState.score += HILL_POINTS_PER_TICK;
      }
    });

    this.hillElapsedMs += this.tickMs;
    if (this.hillElapsedMs >= HILL_ZONE_SHIFT_MS) {
      this.rollNewHillZone();
      this.hillElapsedMs %= HILL_ZONE_SHIFT_MS;
    }
  }

  private syncHillStateToSchema() {
    this.state.hillWinScore = this.gameMode === "kingOfTheHill" ? HILL_WIN_SCORE : 0;
    this.state.hillZoneCol0 = this.hillBounds?.col0 ?? 0;
    this.state.hillZoneCol1 = this.hillBounds?.col1 ?? 0;
    this.state.hillZoneRow0 = this.hillBounds?.row0 ?? 0;
    this.state.hillZoneRow1 = this.hillBounds?.row1 ?? 0;
  }

  // ─── Schema sync ──────────────────────────────────────────────────────────

  private syncToSchema(gameState: GameState): void {
    this.state.gameMode = this.gameMode;
    this.syncHillStateToSchema();

    gameState.players.forEach((playerState, id) => {
      const player = this.state.players.get(id);
      if (!player) return;

      player.direction = playerState.direction;
      player.nextDirection = playerState.nextDirection;
      player.alive = playerState.alive;
      player.lives = playerState.lives;
      player.score = playerState.score;
      player.playerName = toPlayerName(player.playerName, `Jugador ${this.state.players.size}`);
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
