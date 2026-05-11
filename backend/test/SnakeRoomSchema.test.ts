import assert from "assert";

import { SnakeRoom } from "../src/rooms/SnakeRoom.js";
import { SnakeRoomState } from "../src/rooms/schema/SnakeRoomState.js";

describe("SnakeRoom schema sync", () => {
  it("preserves food type and score for online clients", () => {
    const room = new SnakeRoom();
    room.state = new SnakeRoomState();

    (room as any).syncFood([
      { x: 32, y: 64, type: "grape", score: 3 },
      { x: 96, y: 128, type: "poison", score: -2 },
    ]);

    assert.equal(room.state.food.length, 2);
    assert.equal((room.state.food[0] as any).type, "grape");
    assert.equal((room.state.food[0] as any).score, 3);
    assert.equal((room.state.food[1] as any).type, "poison");
    assert.equal((room.state.food[1] as any).score, -2);
  });

  it("syncs king of the hill bounds and win score for online clients", () => {
    const room = new SnakeRoom();
    room.state = new SnakeRoomState();
    room["gameMode"] = "kingOfTheHill";
    room["hillBounds"] = { col0: 2, col1: 8, row0: 3, row1: 7 };
    room["syncToSchema"]({ players: new Map(), food: [], obstacles: [], territory: [], territoryCounts: new Map() });

    assert.equal(room.state.gameMode, "kingOfTheHill");
    assert.equal(room.state.hillWinScore, 100);
    assert.equal(room.state.hillZoneCol0, 2);
    assert.equal(room.state.hillZoneCol1, 8);
    assert.equal(room.state.hillZoneRow0, 3);
    assert.equal(room.state.hillZoneRow1, 7);
  });

  it("syncs territory cells, territory counts and timer for online clients", () => {
    const room = new SnakeRoom();
    room.state = new SnakeRoomState();
    room["gameMode"] = "territory";
    room["remainingTimeMs"] = 42_000;

    room["syncToSchema"]({
      players: new Map(),
      food: [],
      obstacles: [],
      territory: [{ x: 32, y: 64, ownerId: "p1", ownerColor: 0xe74c3c }],
      territoryCounts: new Map([["p1", 1]]),
    });

    assert.equal(room.state.gameMode, "territory");
    assert.equal(room.state.remainingTimeMs, 42_000);
    assert.equal(room.state.territory.length, 1);
    assert.equal(room.state.territory[0].ownerId, "p1");
    assert.equal(room.state.territoryCounts.get("p1"), 1);
  });
});
