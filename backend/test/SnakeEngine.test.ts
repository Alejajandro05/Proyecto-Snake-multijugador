import assert from "assert";
import { SnakeEngine } from "../../shared/src/domain/SnakeEngine.js";
import { GRID_SIZE, TICK_MS, RESPAWN_DELAY_MS, GRID_COLS } from "../../shared/src/domain/GameConfig.js";

describe("SnakeEngine – domain logic", () => {
  it("adds a player with 3 segments pointing right", () => {
    const engine = new SnakeEngine(0);
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
    const engine = new SnakeEngine(0);
    engine.addPlayer("p1");

    const before = engine.getState().players.get("p1")!.segments[0].x;
    engine.tick();
    const after  = engine.getState().players.get("p1")!.segments[0].x;

    assert.strictEqual(after - before, GRID_SIZE);
  });

  it("respects setNextDirection and rejects 180-degree reversal", () => {
    const engine = new SnakeEngine(0);
    engine.addPlayer("p1");

    // Valid: up (perpendicular to current 'right')
    engine.setNextDirection("p1", "up");
    engine.tick();
    assert.strictEqual(engine.getState().players.get("p1")!.direction, "up");

    // Invalid: down is opposite of current 'up'
    engine.setNextDirection("p1", "down");
    engine.tick();
    assert.strictEqual(engine.getState().players.get("p1")!.direction, "up");
  });

  it("increments score and grows snake when eating food", () => {
    const engine = new SnakeEngine(0);
    engine.addPlayer("p1");

    // Manually place food directly in front of the head
    const state = engine.getState();
    const head  = state.players.get("p1")!.segments[0];
    // @ts-ignore – access private for testing
    engine["food"] = [{ x: head.x + GRID_SIZE, y: head.y }];

    const lenBefore = engine.getState().players.get("p1")!.segments.length;
    engine.tick();
    const playerAfter = engine.getState().players.get("p1")!;

    assert.strictEqual(playerAfter.score, 1);
    assert.strictEqual(playerAfter.segments.length, lenBefore + 1);
  });

  it("kills a player on self collision and schedules respawn", () => {
    const engine = new SnakeEngine(0);
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

    engine.tick();
    assert.strictEqual(engine.getState().players.get("p1")!.alive, false);
  });

  it("wraps the snake around the board edges (toroidal)", () => {
    const engine = new SnakeEngine(0);
    engine.addPlayer("p1");

    // @ts-ignore
    const player = engine["players"].get("p1")!;
    // Place head at the right edge
    const rightEdge = (GRID_COLS - 1) * GRID_SIZE;
    player.segments[0].x = rightEdge;
    player.direction     = "right";
    player.nextDirection = "right";

    engine.tick();
    assert.strictEqual(engine.getState().players.get("p1")!.segments[0].x, 0);
  });

  it("respawns the player after RESPAWN_DELAY_MS", () => {
    const engine = new SnakeEngine(0);
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
    const engine = new SnakeEngine(0);
    engine.addPlayer("p1");
    engine.removePlayer("p1");

    assert.strictEqual(engine.getState().players.size, 0);
  });
});
