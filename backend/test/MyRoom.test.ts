import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";

// import your "app.config.ts" file here.
import appConfig from "../src/app.config.js";
import { MyRoomState } from "../src/rooms/schema/MyRoomState.js";
import { SnakeGameState } from "../src/rooms/schema/SnakeGameState.js";

describe("testing your Colyseus app", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  before(async () => colyseus = await boot(appConfig));
  after(async () => colyseus.shutdown());

  beforeEach(async () => await colyseus.cleanup());

  it("connecting into a room", async () => {
    // `room` is the server-side Room instance reference.
    const room = await colyseus.createRoom<MyRoomState>("my_room", {});

    // `client1` is the client-side `Room` instance reference (same as JavaScript SDK)
    const client1 = await colyseus.connectTo(room);

    // make your assertions
    assert.strictEqual(client1.sessionId, room.clients[0].sessionId);

    // wait for state sync
    await room.waitForNextPatch();

    assert.deepStrictEqual({ mySynchronizedProperty: "Hello world" }, client1.state.toJSON());
  });

  it("should allow a player to join snake_room", async () => {
    const room = await colyseus.createRoom<SnakeGameState>("snake_room", {});
    const client1 = await colyseus.connectTo(room);

    assert.strictEqual(client1.sessionId, room.clients[0].sessionId);
    await room.waitForNextPatch();

    const state = client1.state.toJSON();
    assert.ok(state.players);
    assert.ok(state.players[client1.sessionId]);
    assert.strictEqual(state.players[client1.sessionId].alive, true);
    assert.strictEqual(state.players[client1.sessionId].score, 0);
  });

  it("should initialize snake with 3 segments", async () => {
    const room = await colyseus.createRoom<SnakeGameState>("snake_room", {});
    const client1 = await colyseus.connectTo(room);
    await room.waitForNextPatch();

    const state = client1.state.toJSON();
    const player = state.players[client1.sessionId];
    assert.strictEqual(player.segments.length, 3);
  });

  it("should allow two players to join snake_room", async () => {
    const room = await colyseus.createRoom<SnakeGameState>("snake_room", {});
    const client1 = await colyseus.connectTo(room);
    const client2 = await colyseus.connectTo(room);

    await room.waitForNextPatch();

    const state = client1.state.toJSON();
    assert.ok(state.players[client1.sessionId]);
    assert.ok(state.players[client2.sessionId]);

    // Players should have different starting positions
    const p1 = state.players[client1.sessionId];
    const p2 = state.players[client2.sessionId];
    assert.notStrictEqual(p1.segments[0].x, p2.segments[0].x);
  });

  it("should start game when both players are ready", async () => {
    const room = await colyseus.createRoom<SnakeGameState>("snake_room", {});
    const client1 = await colyseus.connectTo(room);
    const client2 = await colyseus.connectTo(room);

    client1.send("ready");
    client2.send("ready");

    // Wait for countdown (3 seconds) + buffer
    await new Promise(resolve => setTimeout(resolve, 4500));
    await room.waitForNextPatch();

    const state = client1.state.toJSON();
    assert.strictEqual(state.gameStarted, true);
  });

  it("should not start game if only one player is ready", async () => {
    const room = await colyseus.createRoom<SnakeGameState>("snake_room", {});
    const client1 = await colyseus.connectTo(room);
    const client2 = await colyseus.connectTo(room);

    client1.send("ready");

    await new Promise(resolve => setTimeout(resolve, 500));
    await room.waitForNextPatch();

    const state = client1.state.toJSON();
    assert.strictEqual(state.gameStarted, false);
  });
});
