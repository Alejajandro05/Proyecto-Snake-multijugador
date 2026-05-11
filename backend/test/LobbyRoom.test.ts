import assert from "assert";
import { ColyseusTestServer, boot } from "@colyseus/testing";
import { matchMaker } from "@colyseus/core";

import appConfig from "../src/app.config.js";
import { LobbyRoomState } from "../src/rooms/schema/LobbyRoomState.js";
import { LobbyPlayer } from "../src/rooms/schema/LobbyPlayer.js";

import { onlineOptionCatalogs as onlineOptionCatalogsTs } from "../../shared/src/catalogs/onlineOptions.ts";
import { onlineOptionCatalogs } from "../../shared/src/catalogs/onlineOptions.js";

describe("shared online option catalogs", () => {
  it("exposes real snake and arena ids for online selection", () => {
    assert.ok(onlineOptionCatalogs.modes.length > 0);
    assert.ok(onlineOptionCatalogs.difficulties.length > 0);
    assert.ok(onlineOptionCatalogs.maps.length > 0);

    const skinIds = onlineOptionCatalogs.skins.map((skin) => skin.id);
    const mapIds = onlineOptionCatalogs.maps.map((map) => map.id);
    const difficultyIds = onlineOptionCatalogs.difficulties.map((difficulty) => difficulty.id);
    assert.ok(skinIds.includes("player1"));
    assert.ok(skinIds.includes("player2"));
    assert.ok(skinIds.includes("snake10"));
    assert.ok(onlineOptionCatalogs.modes.some((mode) => mode.id === "kingOfTheHill"));
    assert.deepStrictEqual(difficultyIds, ["easy", "normal", "hard"]);
    assert.ok(mapIds.includes("arena01"));
    assert.ok(mapIds.includes("arena06"));
  });

  it("keeps the TS and JS catalogs in sync and frozen", () => {
    assert.deepStrictEqual(onlineOptionCatalogsTs, onlineOptionCatalogs);

    assert.throws(() => {
      onlineOptionCatalogs.modes.push({ id: "mutated", label: "Mutated" });
    });

    assert.throws(() => {
      onlineOptionCatalogs.modes[0].label = "Mutated";
    });
  });
});

describe("LobbyRoomState", () => {
  it("defaults the lobby contract and keeps derived views in sync through the safe API", () => {
    const state = new LobbyRoomState();

    assert.equal(state.lobbyId, "");
    assert.equal(state.status, "waiting");
    assert.equal(state.visibility, "public");
    assert.equal(state.inviteCode, "");
    assert.equal(state.gameMode, "classic");
    assert.equal(state.difficulty, "normal");
    assert.equal(state.mapId, "arena01");
    assert.equal(state.maxPlayers, 2);
    assert.equal(state.host.sessionId, "");
    assert.equal(state.host.playerName, "");
    assert.equal(state.host.skinId, "");
    assert.equal(state.host.isHost, false);
    assert.equal(state.host.connected, false);
    assert.equal(state.guest.sessionId, "");
    assert.equal(state.guest.playerName, "");
    assert.equal(state.guest.skinId, "");
    assert.equal(state.guest.isHost, false);
    assert.equal(state.guest.connected, false);
    assert.equal(state.createdAt, undefined);

    const host = new LobbyPlayer();
    host.sessionId = "host-session";
    host.playerName = "Host";
    host.skinId = "player1";
    host.isHost = true;
    host.connected = true;

    const guest = new LobbyPlayer();
    guest.sessionId = "guest-session";
    guest.playerName = "Guest";
    guest.skinId = "player2";
    guest.connected = false;

    state.lobbyId = "lobby-123";
    state.upsertPlayer(host);
    state.upsertPlayer(guest);

    const initialSummary = state.buildPublicLobbySummary();

    assert.equal(state.host.sessionId, "host-session");
    assert.equal(state.host.playerName, "Host");
    assert.equal(state.host.skinId, "player1");
    assert.equal(state.host.isHost, true);
    assert.equal(state.host.connected, true);
    assert.equal(state.guest.sessionId, "guest-session");
    assert.equal(state.guest.playerName, "Guest");
    assert.equal(state.guest.skinId, "player2");
    assert.equal(state.guest.isHost, false);
    assert.equal(state.guest.connected, false);
    assert.equal(initialSummary.lobbyId, "lobby-123");
    assert.equal(initialSummary.hostName, "Host");
    assert.equal(initialSummary.gameMode, "classic");
    assert.equal(initialSummary.difficulty, "normal");
    assert.equal(initialSummary.mapId, "arena01");
    assert.equal(initialSummary.playerCount, 1);
    assert.equal(initialSummary.maxPlayers, 2);

    const canonicalHost = state.players.get("host-session");
    assert.ok(canonicalHost);
    canonicalHost!.playerName = "Host Updated";
    const refreshedSummary = state.buildPublicLobbySummary();
    assert.equal(state.host.playerName, "Host Updated");
    assert.equal(refreshedSummary.hostName, "Host Updated");

    host.playerName = "Host Updated";
    guest.connected = true;
    state.upsertPlayer(host);
    state.upsertPlayer(guest);

    const updatedSummary = state.buildPublicLobbySummary();

    assert.equal(state.host.playerName, "Host Updated");
    assert.equal(state.host.skinId, "player1");
    assert.equal(updatedSummary.hostName, "Host Updated");
    assert.equal(updatedSummary.playerCount, 2);

    const third = new LobbyPlayer();
    third.sessionId = "third-session";
    third.playerName = "Third";
    third.skinId = "player1";

    state.upsertPlayer(third);

    assert.equal(state.players.has("third-session"), false);
    assert.equal(state.host.sessionId, "host-session");
    assert.equal(state.guest.sessionId, "guest-session");
    assert.equal(state.buildPublicLobbySummary().playerCount, 2);

    state.removePlayer("host-session");

    assert.equal(state.host.sessionId, "guest-session");
    assert.equal(state.host.playerName, "Guest");
    assert.equal(state.host.skinId, "player2");
    assert.equal(state.host.isHost, true);
    assert.equal(state.host.connected, true);
    assert.equal(state.players.get("guest-session")?.isHost, true);
    assert.equal(state.guest.sessionId, "");
    assert.equal(state.guest.playerName, "");
    assert.equal(state.guest.skinId, "");
    assert.equal(state.guest.isHost, false);
    assert.equal(state.guest.connected, false);
    assert.equal(state.buildPublicLobbySummary().hostName, "Guest");
    assert.equal(state.buildPublicLobbySummary().playerCount, 1);

    canonicalHost!.playerName = "Should not leak";
    assert.equal(state.buildPublicLobbySummary().hostName, "Guest");
  });
});

describe("LobbyRoom", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;

  before(async () => {
    colyseus = await boot(appConfig);
  });

  after(async () => {
    await colyseus.shutdown();
  });

  beforeEach(async () => {
    await colyseus.cleanup();
  });

  it("creates a private lobby with a generated invite code", async () => {
    const room = await colyseus.createRoom<LobbyRoomState>("lobby_room", {
      visibility: "private",
      maxPlayers: 4,
    });

    assert.equal(room.state.visibility, "private");
    assert.equal(room.state.inviteCode.length > 0, true);
    assert.equal(room.state.status, "waiting");
    assert.equal(room.state.maxPlayers, 2);
    assert.equal(room.maxClients, 2);
    const privateListing = await matchMaker.query({ roomId: room.roomId });
    assert.equal(privateListing.length, 1);
    assert.equal(privateListing[0].private, true);
    assert.equal(privateListing[0].maxClients, 2);
  });

  it("hides a public lobby from listings when it is full", async () => {
    const room = await colyseus.createRoom<LobbyRoomState>("lobby_room", {
      visibility: "public",
    });

    const hostClient = await colyseus.connectTo(room);
    await room.waitForNextPatch();

    const guestClient = await colyseus.connectTo(room);
    await room.waitForNextPatch();

    assert.equal(room.state.status, "ready");
    assert.equal(room.state.visibility, "public");
    assert.equal(room.clients.length, 2);

    const hiddenListing = await matchMaker.query({ roomId: room.roomId, private: false, unlisted: false });
    assert.equal(hiddenListing.length, 0);

    await guestClient.leave();
    await room.waitForNextPatch();

    assert.equal(room.state.status, "waiting");
    const visibleListing = await matchMaker.query({ roomId: room.roomId, private: false, unlisted: false });
    assert.equal(visibleListing.length, 1);

    await hostClient.leave();
  });

  it("starts a snake match with the host-selected config", async () => {
    const room = await colyseus.createRoom<LobbyRoomState>("lobby_room", {
      visibility: "public",
      gameMode: "duel",
      difficulty: "hard",
      mapId: "arena02",
    });

    const hostClient = await colyseus.connectTo(room);
    await room.waitForNextPatch();

    hostClient.send("startMatch");

    await room.waitForNextPatch();

    assert.equal(room.state.matchRoomId.length > 0, true);
    assert.equal(room.state.status, "starting");

    const snakeListing = await matchMaker.query({ roomId: room.state.matchRoomId });
    assert.equal(snakeListing.length, 1);
    assert.equal(snakeListing[0].name, "snake_room");

    const snakeRoom = colyseus.getRoomById(room.state.matchRoomId);
    assert.equal(room.state.gameMode, "duel");
    assert.equal(room.state.difficulty, "hard");
    assert.equal(room.state.mapId, "arena02");
    assert.equal(snakeRoom.state.difficulty, "hard");
    assert.equal(snakeRoom.state.tickMs, 110);
    assert.equal(snakeRoom.state.mapId, "arena02");
    assert.equal(snakeRoom.metadata?.gameMode, "duel");
    assert.equal(snakeRoom.metadata?.lobbyId, room.roomId);

    await hostClient.leave();
  });

  it("starts a king of the hill match with hill metadata in the snake room", async () => {
    const room = await colyseus.createRoom<LobbyRoomState>("lobby_room", {
      visibility: "public",
      gameMode: "kingOfTheHill",
      difficulty: "normal",
      mapId: "arena03",
    });

    const hostClient = await colyseus.connectTo(room);
    await room.waitForNextPatch();

    hostClient.send("startMatch");

    await room.waitForNextPatch();

    const snakeRoom = colyseus.getRoomById(room.state.matchRoomId);
    assert.equal(room.state.gameMode, "kingOfTheHill");
    assert.equal(snakeRoom.state.gameMode, "kingOfTheHill");
    assert.equal(snakeRoom.state.hillWinScore, 100);
    assert.equal(snakeRoom.metadata?.gameMode, "kingOfTheHill");
    assert.equal(snakeRoom.state.hillZoneCol1 >= snakeRoom.state.hillZoneCol0, true);
    assert.equal(snakeRoom.state.hillZoneRow1 >= snakeRoom.state.hillZoneRow0, true);

    await hostClient.leave();
  });
});
