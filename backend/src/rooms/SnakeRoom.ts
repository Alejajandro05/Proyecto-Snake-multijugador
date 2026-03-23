import { Room, Client, CloseCode } from "colyseus";
import { SnakeRoomState } from "./schema/SnakeRoomState.js";
import { Player } from "./schema/Player.js";
import { SnakeSegment } from "./schema/SnakeSegment.js";
import { Food } from "./schema/Food.js";
import { SnakeEngine } from "../../../shared/src/domain/SnakeEngine.js";
import type { GameState } from "../../../shared/src/domain/types.js";
import { TICK_MS, PLAYER_COLORS } from "../../../shared/src/domain/GameConfig.js";

export class SnakeRoom extends Room<SnakeRoomState> {
  maxClients = 4;
  private engine!: SnakeEngine;

  onCreate(_options: any) {
    this.setState(new SnakeRoomState());
    this.engine = new SnakeEngine();

    this.onMessage("changeDirection", (client, direction: string) => {
      this.engine.setNextDirection(client.sessionId, direction as any);
    });

    this.setSimulationInterval(() => {
      const state = this.engine.tick();
      this.syncToSchema(state);
    }, TICK_MS);
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
      player.score = playerState.score;

      this.syncSegments(player, playerState.segments);
    });

    this.syncFood(gameState.food);
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
}
