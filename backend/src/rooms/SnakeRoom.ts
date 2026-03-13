import { Room, Client, CloseCode } from "colyseus";
import { SnakeRoomState } from "./schema/SnakeRoomState.js";
import { Player } from "./schema/Player.js";
import { SnakeSegment } from "./schema/SnakeSegment.js";
import { Food } from "./schema/Food.js";

const GRID_COLS   = 32;   // 1024 / 32
const GRID_ROWS   = 24;   // 768  / 32
const GRID_SIZE   = 32;
const TICK_MS     = 150;
const FOOD_COUNT  = 3;

const PLAYER_COLORS = [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71];

const OPPOSITE: Record<string, string> = {
  up: "down", down: "up", left: "right", right: "left",
};

function randomCell(): { x: number; y: number } {
  return {
    x: Math.floor(Math.random() * GRID_COLS) * GRID_SIZE,
    y: Math.floor(Math.random() * GRID_ROWS) * GRID_SIZE,
  };
}

export class SnakeRoom extends Room<SnakeRoomState> {
  maxClients = 4;

  onCreate(_options: any) {
    this.setState(new SnakeRoomState());

    // Spawn initial food
    for (let i = 0; i < FOOD_COUNT; i++) {
      this.spawnFood();
    }

    // Handle direction changes from clients
    this.onMessage("changeDirection", (client, direction: string) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.alive) return;
      if (OPPOSITE[player.direction] !== direction) {
        player.nextDirection = direction;
      }
    });

    // Game loop
    this.setSimulationInterval(() => this.gameLoop(), TICK_MS);
  }

  onJoin(client: Client, _options: any) {
    const colorIndex = this.state.players.size % PLAYER_COLORS.length;
    const player = new Player();
    player.sessionId = client.sessionId;
    player.color     = PLAYER_COLORS[colorIndex];
    player.alive     = true;
    player.score     = 0;
    player.direction     = "right";
    player.nextDirection = "right";

    // Spawn snake in a safe starting position spread across the grid
    const startX = (colorIndex * 6 + 5) % GRID_COLS;
    const startY = Math.floor(GRID_ROWS / 2);
    for (let i = 0; i < 3; i++) {
      const seg = new SnakeSegment();
      seg.x = (startX - i) * GRID_SIZE;
      seg.y = startY * GRID_SIZE;
      player.segments.push(seg);
    }

    this.state.players.set(client.sessionId, player);
    console.log(client.sessionId, "joined. Players:", this.state.players.size);
  }

  onLeave(client: Client, _code: CloseCode) {
    this.state.players.delete(client.sessionId);
    console.log(client.sessionId, "left. Players:", this.state.players.size);
  }

  onDispose() {
    console.log("SnakeRoom", this.roomId, "disposing...");
  }

  // ─── Game Loop ────────────────────────────────────────────────────────────

  private gameLoop() {
    this.state.players.forEach((player) => {
      if (!player.alive) return;
      this.movePlayer(player);
    });
  }

  private movePlayer(player: Player) {
    player.direction = player.nextDirection;

    const head = player.segments[0];
    let newX = head.x;
    let newY = head.y;

    switch (player.direction) {
      case "left":  newX -= GRID_SIZE; break;
      case "right": newX += GRID_SIZE; break;
      case "up":    newY -= GRID_SIZE; break;
      case "down":  newY += GRID_SIZE; break;
    }

    // Wall collision → wrap around
    if (newX < 0)                  newX = (GRID_COLS - 1) * GRID_SIZE;
    else if (newX >= GRID_COLS * GRID_SIZE) newX = 0;
    if (newY < 0)                  newY = (GRID_ROWS - 1) * GRID_SIZE;
    else if (newY >= GRID_ROWS * GRID_SIZE) newY = 0;

    // Self collision
    for (const seg of player.segments) {
      if (seg.x === newX && seg.y === newY) {
        this.killPlayer(player);
        return;
      }
    }

    // Collision with other snakes
    this.state.players.forEach((other) => {
      if (other.sessionId === player.sessionId || !other.alive) return;
      for (const seg of other.segments) {
        if (seg.x === newX && seg.y === newY) {
          this.killPlayer(player);
          return;
        }
      }
    });
    if (!player.alive) return;

    // Check food
    let ate = false;
    for (let i = 0; i < this.state.food.length; i++) {
      const f = this.state.food[i];
      if (f.x === newX && f.y === newY) {
        this.state.food.splice(i, 1);
        this.spawnFood();
        player.score += 1;
        ate = true;
        break;
      }
    }

    // Move: prepend new head
    const newHead = new SnakeSegment();
    newHead.x = newX;
    newHead.y = newY;
    player.segments.unshift(newHead);

    // Remove tail if not eating
    if (!ate) {
      player.segments.pop();
    }
  }

  private killPlayer(player: Player) {
    player.alive = false;
    // Respawn after 3 seconds
    this.clock.setTimeout(() => {
      if (!this.state.players.has(player.sessionId)) return;
      player.segments.splice(0, player.segments.length);
      const startX = Math.floor(Math.random() * (GRID_COLS - 4) + 2);
      const startY = Math.floor(Math.random() * (GRID_ROWS - 4) + 2);
      for (let i = 0; i < 3; i++) {
        const seg = new SnakeSegment();
        seg.x = (startX - i) * GRID_SIZE;
        seg.y = startY * GRID_SIZE;
        player.segments.push(seg);
      }
      player.direction     = "right";
      player.nextDirection = "right";
      player.alive         = true;
    }, 3000);
  }

  private spawnFood() {
    const cell = randomCell();
    const food = new Food();
    food.x = cell.x;
    food.y = cell.y;
    this.state.food.push(food);
  }
}
