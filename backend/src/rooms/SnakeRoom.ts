import { Room, Client, CloseCode } from "colyseus";
import { ArraySchema } from "@colyseus/schema";
import { SnakeGameState, Player, Position } from "./schema/SnakeGameState.js";

const GRID_SIZE = 32;
const BOARD_WIDTH = 1024;
const BOARD_HEIGHT = 768;
const COLS = Math.floor(BOARD_WIDTH / GRID_SIZE);
const ROWS = Math.floor(BOARD_HEIGHT / GRID_SIZE);
const SNAKE_SPEED_MS = 150;
const INITIAL_SNAKE_LENGTH = 3;

export class SnakeRoom extends Room {
  maxClients = 2;
  state = new SnakeGameState();

  private gameInterval: ReturnType<typeof setInterval> | null = null;
  private playerOrder: string[] = [];

  messages = {
    direction: (client: Client, message: { dir: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.alive || !this.state.gameStarted) return;

      const dir = message.dir;
      const current = player.direction;

      // Prevent 180-degree turns
      if (
        (dir === "left" && current !== "right") ||
        (dir === "right" && current !== "left") ||
        (dir === "up" && current !== "down") ||
        (dir === "down" && current !== "up")
      ) {
        player.nextDirection = dir;
      }
    },

    ready: (client: Client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      player.ready = true;

      this.checkStartGame();
    }
  };

  onCreate(options: any) {
    // Room created, waiting for players
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined snake room!");

    const player = new Player();
    this.state.players.set(client.sessionId, player);
    this.playerOrder.push(client.sessionId);

    // Initialize snake based on player order
    const playerIndex = this.playerOrder.length - 1;
    this.initializeSnake(player, playerIndex);
  }

  onLeave(client: Client, code: CloseCode) {
    console.log(client.sessionId, "left snake room!", code);

    this.state.players.delete(client.sessionId);
    this.playerOrder = this.playerOrder.filter(id => id !== client.sessionId);

    if (this.state.gameStarted && !this.state.gameOver) {
      // If a player leaves during the game, the other player wins
      const remainingPlayer = this.playerOrder[0];
      if (remainingPlayer) {
        this.endGame(remainingPlayer);
      }
    }

    if (this.playerOrder.length === 0) {
      this.stopGameLoop();
    }
  }

  onDispose() {
    console.log("snake room", this.roomId, "disposing...");
    this.stopGameLoop();
  }

  private initializeSnake(player: Player, playerIndex: number) {
    // Player 0 starts on the left side, Player 1 on the right side
    const startX = playerIndex === 0 ? 5 : COLS - 6;
    const startY = Math.floor(ROWS / 2);
    const dir = playerIndex === 0 ? "right" : "left";

    player.direction = dir;
    player.nextDirection = dir;
    player.segments.clear();

    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
      const offsetX = playerIndex === 0 ? -i : i;
      player.segments.push(new Position(
        (startX + offsetX) * GRID_SIZE,
        startY * GRID_SIZE
      ));
    }
  }

  private checkStartGame() {
    if (this.state.gameStarted) return;
    if (this.playerOrder.length < 2) return;

    let allReady = true;
    this.state.players.forEach((player) => {
      if (!player.ready) allReady = false;
    });

    if (allReady) {
      this.startCountdown();
    }
  }

  private startCountdown() {
    this.state.countdown = 3;

    const countdownInterval = setInterval(() => {
      this.state.countdown--;
      if (this.state.countdown <= 0) {
        clearInterval(countdownInterval);
        this.startGame();
      }
    }, 1000);
  }

  private startGame() {
    this.state.gameStarted = true;
    this.state.gameOver = false;
    this.state.winner = "";

    this.spawnFood();
    this.startGameLoop();
  }

  private startGameLoop() {
    this.stopGameLoop();
    this.gameInterval = setInterval(() => {
      this.gameTick();
    }, SNAKE_SPEED_MS);
  }

  private stopGameLoop() {
    if (this.gameInterval) {
      clearInterval(this.gameInterval);
      this.gameInterval = null;
    }
  }

  private gameTick() {
    if (this.state.gameOver) return;

    // Move all alive players
    this.state.players.forEach((player, sessionId) => {
      if (!player.alive) return;
      this.movePlayer(player, sessionId);
    });
  }

  private movePlayer(player: Player, sessionId: string) {
    // Apply buffered direction
    player.direction = player.nextDirection;

    const head = player.segments[0];
    let newX = head.x;
    let newY = head.y;

    switch (player.direction) {
      case "left": newX -= GRID_SIZE; break;
      case "right": newX += GRID_SIZE; break;
      case "up": newY -= GRID_SIZE; break;
      case "down": newY += GRID_SIZE; break;
    }

    // Check wall collisions
    if (newX < 0 || newX >= BOARD_WIDTH || newY < 0 || newY >= BOARD_HEIGHT) {
      player.alive = false;
      this.checkGameEnd();
      return;
    }

    // Check self-collision
    for (let i = 0; i < player.segments.length; i++) {
      const seg = player.segments[i];
      if (newX === seg.x && newY === seg.y) {
        player.alive = false;
        this.checkGameEnd();
        return;
      }
    }

    // Check collision with other snakes
    this.state.players.forEach((otherPlayer, otherSessionId) => {
      if (otherSessionId === sessionId || !otherPlayer.alive) return;
      for (let i = 0; i < otherPlayer.segments.length; i++) {
        const seg = otherPlayer.segments[i];
        if (newX === seg.x && newY === seg.y) {
          player.alive = false;
          this.checkGameEnd();
          return;
        }
      }
    });

    if (!player.alive) return;

    // Check food collision
    const eating = newX === this.state.food.x && newY === this.state.food.y;

    // Add new head
    const newHead = new Position(newX, newY);
    const newSegments = new ArraySchema<Position>();
    newSegments.push(newHead);
    for (let i = 0; i < player.segments.length; i++) {
      newSegments.push(player.segments[i]);
    }

    if (!eating) {
      // Remove tail
      newSegments.pop();
    } else {
      player.score += 10;
      this.spawnFood();
    }

    // Replace segments array
    player.segments.clear();
    for (let i = 0; i < newSegments.length; i++) {
      player.segments.push(newSegments[i]);
    }
  }

  private spawnFood() {
    // Get all occupied positions
    const occupied = new Set<string>();
    this.state.players.forEach((player) => {
      for (let i = 0; i < player.segments.length; i++) {
        const seg = player.segments[i];
        occupied.add(`${seg.x},${seg.y}`);
      }
    });

    // Find a free position
    let x: number, y: number;
    let attempts = 0;
    do {
      x = Math.floor(Math.random() * COLS) * GRID_SIZE;
      y = Math.floor(Math.random() * ROWS) * GRID_SIZE;
      attempts++;
    } while (occupied.has(`${x},${y}`) && attempts < 100);

    this.state.food.x = x;
    this.state.food.y = y;
  }

  private checkGameEnd() {
    const alivePlayers: string[] = [];
    this.state.players.forEach((player, sessionId) => {
      if (player.alive) alivePlayers.push(sessionId);
    });

    if (alivePlayers.length <= 1) {
      const winner = alivePlayers.length === 1 ? alivePlayers[0] : "";
      this.endGame(winner);
    }
  }

  private endGame(winner: string) {
    this.state.gameOver = true;
    this.state.winner = winner;
    this.stopGameLoop();
  }
}
