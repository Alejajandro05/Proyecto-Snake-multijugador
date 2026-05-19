import { Schema, type, MapSchema } from "@colyseus/schema";
import { LobbyPlayer } from "./LobbyPlayer.js";
import { PublicLobbySummary } from "./PublicLobbySummary.js";

export class LobbyRoomState extends Schema {
  @type("string") lobbyId: string = "";
  @type("string") status: string = "waiting";
  @type("string") visibility: string = "public";
  @type("string") inviteCode: string = "";
  @type("string") gameMode: string = "normal";
  @type("string") difficulty: string = "normal";
  @type("string") mapId: string = "arena01";
  @type("number") boardCols: number = 32;
  @type("number") boardRows: number = 24;
  @type("number") foodCount: number = 10;
  @type("string") matchRoomId: string = "";
  @type("number") maxPlayers: number = 2;
  @type(LobbyPlayer) host = new LobbyPlayer();
  @type(LobbyPlayer) guest = new LobbyPlayer();
  @type("number") createdAt?: number;
  @type({ map: LobbyPlayer }) players = new MapSchema<LobbyPlayer>();

  buildPublicLobbySummary(): PublicLobbySummary {
    this.syncDerivedViews();
    return this.derivePublicLobbySummary(Array.from(this.players.values()));
  }

  syncDerivedViews(): PublicLobbySummary {
    const players = Array.from(this.players.values());
    const hostPlayer = this.pickHostPlayer(players);
    const guestPlayer = this.pickGuestPlayer(players, hostPlayer);

    this.reconcileHostAuthority(players, hostPlayer);
    this.host = this.toLobbyPlayerSnapshot(hostPlayer);
    this.guest = this.toLobbyPlayerSnapshot(guestPlayer);

    return this.derivePublicLobbySummary(players);
  }

  upsertPlayer(player: LobbyPlayer): PublicLobbySummary {
    if (!this.players.has(player.sessionId) && this.players.size >= this.maxPlayers) {
      return this.buildPublicLobbySummary();
    }

    this.players.set(player.sessionId, player);
    return this.syncDerivedViews();
  }

  removePlayer(sessionId: string): PublicLobbySummary {
    this.players.delete(sessionId);
    return this.syncDerivedViews();
  }

  private pickHostPlayer(players: LobbyPlayer[]): LobbyPlayer | undefined {
    return players.find((player) => player.isHost) ?? players[0];
  }

  private pickGuestPlayer(
    players: LobbyPlayer[],
    hostPlayer?: LobbyPlayer
  ): LobbyPlayer | undefined {
    return players.find((player) => player !== hostPlayer) ?? undefined;
  }

  private reconcileHostAuthority(players: LobbyPlayer[], hostPlayer?: LobbyPlayer) {
    for (const player of players) {
      player.isHost = player === hostPlayer;
    }
  }

  private toLobbyPlayerSnapshot(player?: LobbyPlayer): LobbyPlayer {
    const snapshot = new LobbyPlayer();

    if (!player) {
      return snapshot;
    }

    snapshot.sessionId = player.sessionId;
    snapshot.playerName = player.playerName;
    snapshot.skinId = player.skinId;
    snapshot.isHost = player.isHost;
    snapshot.connected = player.connected;
    return snapshot;
  }

  private derivePublicLobbySummary(players: LobbyPlayer[]): PublicLobbySummary {
    const summary = new PublicLobbySummary();
    const hostPlayer = this.pickHostPlayer(players);

    summary.lobbyId = this.lobbyId;
    summary.hostName = hostPlayer?.playerName ?? "";
    summary.gameMode = this.gameMode;
    summary.difficulty = this.difficulty;
    summary.mapId = this.mapId;
    summary.playerCount = players.filter((player) => player.connected).length;
    summary.maxPlayers = this.maxPlayers;

    return summary;
  }
}
