import assert from "assert";

import { SnakeRoom } from "../src/rooms/SnakeRoom.js";
import { SnakeRoomState } from "../src/rooms/schema/SnakeRoomState.js";

describe("SnakeRoom player names", () => {
  it("stores the joined player name in the synchronized room state", () => {
    const room = new SnakeRoom();
    room.state = new SnakeRoomState();
    (room as any).engine = {
      addPlayer: () => ({
        skinId: "player1",
        color: 0xe74c3c,
        alive: true,
        lives: 3,
        score: 0,
        direction: "right",
        nextDirection: "right",
        segments: [],
      }),
    };

    room.onJoin({ sessionId: "player-a" } as any, {
      playerName: "Alice",
      skinId: "player1",
    });

    const joinedPlayer = room.state.players.get("player-a");
    assert.ok(joinedPlayer);
    assert.equal(joinedPlayer?.playerName, "Alice");
  });
});
