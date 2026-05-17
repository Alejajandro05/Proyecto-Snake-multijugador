import assert from "assert";
import { SnakeEngine } from "../../shared/src/domain/SnakeEngine.js";
import { GRID_SIZE, TICK_MS, RESPAWN_DELAY_MS, GRID_COLS } from "../../shared/src/domain/GameConfig.js";

function createEngine(): SnakeEngine {
  return new SnakeEngine({ foodCount: 0, obstaclesPerQuadrant: 0 });
}

function createTerritoryEngine(): SnakeEngine {
  return new SnakeEngine({ foodCount: 0, obstaclesPerQuadrant: 0, territoryMode: true });
}

function advanceMovement(engine: SnakeEngine, playerId = "p1"): void {
  const player = engine.getState().players.get(playerId);
  assert.ok(player, `expected player ${playerId} to exist`);

  for (let i = 0; i < player.speed; i++) {
    engine.tick();
  }
}

describe("SnakeEngine – domain logic", () => {
  it("adds a player with 3 segments pointing right", () => {
    const engine = createEngine();
    const p = engine.addPlayer("p1");

    assert.strictEqual(p.id, "p1");
    assert.strictEqual(p.alive, true);
    assert.strictEqual(p.score, 0);
    assert.strictEqual(p.direction, "right");
    assert.strictEqual(p.segments.length, 3);
    // Head is always to the right of the second segment
    assert.strictEqual(p.segments[0].x - p.segments[1].x, GRID_SIZE);
  });

  it("moves the snake head one grid cell in the current direction", () => {
    const engine = createEngine();
    engine.addPlayer("p1");

    const before = engine.getState().players.get("p1")!.segments[0].x;
    advanceMovement(engine);
    const after  = engine.getState().players.get("p1")!.segments[0].x;

    assert.strictEqual(after - before, GRID_SIZE);
  });

  it("respects setNextDirection and rejects 180-degree reversal", () => {
    const engine = createEngine();
    engine.addPlayer("p1");

    // Valid: up (perpendicular to current 'right')
    engine.setNextDirection("p1", "up");
    advanceMovement(engine);
    assert.strictEqual(engine.getState().players.get("p1")!.direction, "up");

    // Invalid: down is opposite of current 'up'
    engine.setNextDirection("p1", "down");
    advanceMovement(engine);
    assert.strictEqual(engine.getState().players.get("p1")!.direction, "up");
  });

  it("buffers rapid turn sequences across consecutive ticks", () => {
    const engine = createEngine();
    engine.addPlayer("p1");

    engine.setNextDirection("p1", "up");
    engine.setNextDirection("p1", "left");

    advanceMovement(engine);
    assert.strictEqual(engine.getState().players.get("p1")!.direction, "up");

    advanceMovement(engine);
    assert.strictEqual(engine.getState().players.get("p1")!.direction, "left");
  });

  it("increments score and grows snake when eating food", () => {
    const engine = createEngine();
    engine.addPlayer("p1");

    // Manually place food directly in front of the head
    const state = engine.getState();
    const head  = state.players.get("p1")!.segments[0];
    // @ts-ignore – access private for testing
    engine["food"] = [{ x: head.x + GRID_SIZE, y: head.y }];

    const lenBefore = engine.getState().players.get("p1")!.segments.length;
    advanceMovement(engine);
    const playerAfter = engine.getState().players.get("p1")!;

    assert.strictEqual(playerAfter.score, 1);
    assert.strictEqual(playerAfter.segments.length, lenBefore + 1);
  });

  it("does not reset a high score back to the classic win cap when eating food", () => {
    const engine = createEngine();
    engine.addPlayer("p1");

    // @ts-ignore - deterministic domain setup
    const player = engine["players"].get("p1")!;
    player.score = 70;

    const head = player.segments[0];
    // @ts-ignore - deterministic domain setup
    engine["food"] = [{ x: head.x + GRID_SIZE, y: head.y, type: "apple", score: 1 }];

    advanceMovement(engine);

    assert.strictEqual(engine.getState().players.get("p1")!.score, 71);
  });

  it("does not spawn replacement food on obstacles", () => {
    const engine = createEngine();
    // @ts-ignore - controlled obstacle placement for deterministic domain test
    engine["obstacles"] = [{ x: 0, y: 0 }];

    const originalRandom = Math.random;
    const randomValues = [0, 0, 0.5, 0.5];
    Math.random = () => randomValues.shift() ?? 0.5;

    try {
      // @ts-ignore - exercise private helper through the public engine instance
      const food = engine["randomFood"]();
      assert.notDeepStrictEqual(food, { x: 0, y: 0 });
    } finally {
      Math.random = originalRandom;
    }
  });

  it("kills a player on self collision and schedules respawn", () => {
    const engine = createEngine();
    engine.addPlayer("p1");

    // Grow the snake long enough for self collision
    // @ts-ignore
    const player = engine["players"].get("p1")!;
    // Force head to wrap into its own body by placing body segments around the head
    player.segments = [
      { x: 2 * GRID_SIZE, y: 2 * GRID_SIZE },
      { x: 2 * GRID_SIZE, y: 1 * GRID_SIZE },
      { x: 3 * GRID_SIZE, y: 1 * GRID_SIZE },
      { x: 3 * GRID_SIZE, y: 2 * GRID_SIZE },
      { x: 3 * GRID_SIZE, y: 3 * GRID_SIZE },
    ];
    // Head is at (2,2), moving right will land on (3,2) which is body[3]
    player.direction     = "right";
    player.nextDirection = "right";

    advanceMovement(engine);
    assert.strictEqual(engine.getState().players.get("p1")!.alive, false);
  });

  it("wraps the snake around the board edges (toroidal)", () => {
    const engine = createEngine();
    engine.addPlayer("p1");

    // @ts-ignore
    const player = engine["players"].get("p1")!;
    // Place head at the right edge
    const rightEdge = (GRID_COLS - 1) * GRID_SIZE;
    player.segments[0].x = rightEdge;
    player.direction     = "right";
    player.nextDirection = "right";

    advanceMovement(engine);
    assert.strictEqual(engine.getState().players.get("p1")!.segments[0].x, 0);
  });

  it("respawns the player after RESPAWN_DELAY_MS", () => {
    const engine = createEngine();
    engine.addPlayer("p1");

    // @ts-ignore – force the player dead
    engine["players"].get("p1")!.alive = false;
    const respawnTicks = Math.round(RESPAWN_DELAY_MS / TICK_MS);
    // @ts-ignore
    engine["respawnQueue"].set("p1", engine["tickCount"] + respawnTicks);

    // Advance ticks until respawn
    for (let i = 0; i < respawnTicks; i++) engine.tick();

    assert.strictEqual(engine.getState().players.get("p1")!.alive, true);
  });

  it("removePlayer cleans up state and respawn queue", () => {
    const engine = createEngine();
    engine.addPlayer("p1");
    engine.removePlayer("p1");

    assert.strictEqual(engine.getState().players.size, 0);
  });

  it("claims the new head cell for the moving player in territory mode", () => {
    const engine = createTerritoryEngine();
    engine.addPlayer("p1");

    advanceMovement(engine);

    const state = engine.getState();
    const head = state.players.get("p1")!.segments[0];
    const claimedCell = state.territory.find((cell) => cell.x === head.x && cell.y === head.y);

    assert.ok(claimedCell);
    assert.strictEqual(claimedCell!.ownerId, "p1");
    assert.strictEqual(state.territoryCounts.get("p1"), 1);
  });

  it("replaces the rival ownership when a player conquers an occupied territory cell", () => {
    const engine = createTerritoryEngine();
    const p1 = engine.addPlayer("p1");

    // @ts-ignore - direct deterministic setup for domain behavior
    p1.segments = [
      { x: 5 * GRID_SIZE, y: 4 * GRID_SIZE },
    ];
    p1.direction = "right";
    p1.nextDirection = "right";

    advanceMovement(engine);
    engine.setNextDirection("p1", "up");

    const p2 = engine.addPlayer("p2");

    // @ts-ignore - direct deterministic setup for domain behavior
    p2.segments = [
      { x: 6 * GRID_SIZE, y: 5 * GRID_SIZE },
    ];
    p2.direction = "up";
    p2.nextDirection = "up";
    advanceMovement(engine, "p2");

    const state = engine.getState();
    const targetX = 6 * GRID_SIZE;
    const targetY = 4 * GRID_SIZE;
    const claimedCell = state.territory.find((cell) => cell.x === targetX && cell.y === targetY);

    assert.ok(claimedCell);
    assert.strictEqual(claimedCell!.ownerId, "p2");
    assert.strictEqual(state.territoryCounts.get("p1"), 1);
    assert.strictEqual(state.territoryCounts.get("p2"), 1);
  });
});
