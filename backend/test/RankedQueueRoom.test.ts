import assert from "assert";

import { RankedQueueRoom } from "../src/rooms/RankedQueueRoom.js";

describe("RankedQueueRoom", () => {
  it("queues the validated ranked skin selected by the player", () => {
    const room = new RankedQueueRoom();

    room.onJoin({ sessionId: "ranked-player" } as any, { skinId: "snake7" }, {
      uid: "firebase-user",
      playerName: "Ranked Player",
      winCount: 3,
    });

    const ticket = (room as any).queue[0];
    assert.equal(ticket.skinId, "snake7");
  });

  it("falls back to the default skin when the ranked skin is not allowed", () => {
    const room = new RankedQueueRoom();

    room.onJoin({ sessionId: "ranked-player" } as any, { skinId: "unknown-skin" }, {
      uid: "firebase-user",
      playerName: "Ranked Player",
      winCount: 3,
    });

    const ticket = (room as any).queue[0];
    assert.equal(ticket.skinId, "player1");
  });
});
