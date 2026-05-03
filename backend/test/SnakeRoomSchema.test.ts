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
});
