import { randomBytes } from "crypto";
import { Client, Room } from "colyseus";
import { matchMaker } from "@colyseus/core";

import { onlineOptionCatalogs } from "../../../shared/src/catalogs/onlineOptions.js";
import { LobbyPlayer } from "./schema/LobbyPlayer.js";
import { LobbyRoomState } from "./schema/LobbyRoomState.js";

const DEFAULT_SKIN_ID = onlineOptionCatalogs.skins[0]?.id ?? "player1";
const DEFAULT_GUEST_SKIN_ID = onlineOptionCatalogs.skins[1]?.id ?? DEFAULT_SKIN_ID;

interface LobbyRoomCreateOptions {
  visibility?: unknown;
  gameMode?: unknown;
  difficulty?: unknown;
  mapId?: unknown;
  maxPlayers?: unknown;
  playerName?: unknown;
  skinId?: unknown;
}

interface LobbyRoomStartMatchOptions {
  gameMode?: unknown;
  difficulty?: unknown;
  mapId?: unknown;
}

interface LobbyRoomJoinOptions {
  playerName?: unknown;
  skinId?: unknown;
}

interface LobbyRegistryEntry {
  lobbyId: string;
  visibility: "public" | "private";
  inviteCode: string;
  status: string;
  gameMode: string;
  difficulty: string;
  mapId: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
}

function toOptionId(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, 32) : undefined;
}

function resolveCatalogOption(value: unknown, allowedIds: readonly string[], fallback: string): string {
  const optionId = toOptionId(value);
  return optionId && allowedIds.includes(optionId) ? optionId : fallback;
}

function toVisibility(value: unknown): "public" | "private" {
  return value === "private" ? "private" : "public";
}

function generateInviteCode(): string {
  return randomBytes(3).toString("hex").toUpperCase();
}

function toPlayerName(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized.slice(0, 24) : fallback;
}

function toSkinId(value: unknown, fallback: string) {
  const optionId = toOptionId(value);
  const allowedSkinIds = onlineOptionCatalogs.skins.map((skin) => skin.id);
  return optionId && allowedSkinIds.includes(optionId) ? optionId : fallback;
}

export class LobbyRoom extends Room<{ state: LobbyRoomState }> {
  private static registry = new Map<string, LobbyRegistryEntry>();
  maxClients = 2;

  static listPublicLobbies() {
    return Array.from(LobbyRoom.registry.values())
      .filter((entry) => entry.visibility === "public" && entry.status === "waiting" && entry.playerCount < entry.maxPlayers)
      .sort((a, b) => a.hostName.localeCompare(b.hostName));
  }

  static resolveInviteCode(code: string) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return null;

    const match = Array.from(LobbyRoom.registry.values()).find((entry) => (
      entry.visibility === "private"
      && entry.inviteCode === normalized
      && entry.status !== "starting"
      && entry.playerCount < entry.maxPlayers
    ));

    return match ? { lobbyId: match.lobbyId } : null;
  }

  async onCreate(options?: LobbyRoomCreateOptions) {
    this.state = new LobbyRoomState();
    this.state.lobbyId = this.roomId;
    this.state.createdAt = Date.now();
    this.state.visibility = toVisibility(options?.visibility);
    this.state.gameMode = resolveCatalogOption(
      options?.gameMode,
      onlineOptionCatalogs.modes.map((mode) => mode.id),
      this.state.gameMode
    );
    this.state.difficulty = resolveCatalogOption(
      options?.difficulty,
      onlineOptionCatalogs.difficulties.map((difficulty) => difficulty.id),
      this.state.difficulty
    );
    this.state.mapId = resolveCatalogOption(
      options?.mapId,
      onlineOptionCatalogs.maps.map((map) => map.id),
      this.state.mapId
    );
    this.state.maxPlayers = 2;
    this.maxClients = 2;

    if (this.state.visibility === "private") {
      this.state.inviteCode = generateInviteCode();
    }
    await this.syncMatchmakingState();

    this.onMessage("startMatch", async (client, payload?: LobbyRoomStartMatchOptions) => {
      if (client.sessionId !== this.state.host.sessionId) {
        return;
      }

      if (this.state.matchRoomId.length > 0) {
        return;
      }

      const snakeRoom = await matchMaker.createRoom("snake_room", {
        lobbyId: this.state.lobbyId,
        gameMode: resolveCatalogOption(
          payload?.gameMode ?? this.state.gameMode,
          onlineOptionCatalogs.modes.map((mode) => mode.id),
          this.state.gameMode
        ),
        difficulty: resolveCatalogOption(
          payload?.difficulty ?? this.state.difficulty,
          onlineOptionCatalogs.difficulties.map((difficulty) => difficulty.id),
          this.state.difficulty
        ),
        mapId: resolveCatalogOption(
          payload?.mapId ?? this.state.mapId,
          onlineOptionCatalogs.maps.map((map) => map.id),
          this.state.mapId
        ),
      });

      this.state.matchRoomId = snakeRoom.roomId;
      this.state.status = "starting";
      await this.syncMatchmakingState();
    });
  }

  async onJoin(client: Client, options?: LobbyRoomJoinOptions) {
    const player = this.state.players.get(client.sessionId) ?? this.createPlayer(client.sessionId, options);
    player.playerName = toPlayerName(options?.playerName, player.playerName || `Jugador ${this.state.players.size}`);
    player.skinId = toSkinId(options?.skinId, player.skinId || DEFAULT_SKIN_ID);
    player.connected = true;
    this.state.upsertPlayer(player);
    await this.refreshLobbyState();
  }

  async onLeave(client: Client) {
    this.state.removePlayer(client.sessionId);
    if (this.state.players.size === 0) {
      this.state.status = "waiting";
      await this.syncMatchmakingState();
      return;
    }

    await this.refreshLobbyState();
  }

  private createPlayer(sessionId: string, options?: LobbyRoomJoinOptions) {
    const player = new LobbyPlayer();
    player.sessionId = sessionId;
    player.playerName = toPlayerName(options?.playerName, `Jugador ${this.state.players.size + 1}`);
    player.skinId = toSkinId(options?.skinId, this.state.players.size === 0 ? DEFAULT_SKIN_ID : DEFAULT_GUEST_SKIN_ID);
    player.connected = true;
    return player;
  }

  private async refreshLobbyState() {
    const playerCount = this.state.players.size;

    this.state.status = playerCount >= this.state.maxPlayers ? "ready" : "waiting";
    await this.syncMatchmakingState();
  }

  private async syncMatchmakingState() {
    const isHidden = this.state.visibility === "private" || this.state.players.size >= this.state.maxPlayers || this.state.status === "starting";

    await this.setMatchmaking({
      private: isHidden,
      unlisted: isHidden,
      metadata: {
        visibility: this.state.visibility,
        inviteCode: this.state.inviteCode,
        status: this.state.status,
        gameMode: this.state.gameMode,
        difficulty: this.state.difficulty,
        mapId: this.state.mapId,
        hostName: this.state.host.playerName,
        playerCount: this.state.players.size,
        maxPlayers: this.state.maxPlayers,
      },
    });

    this.syncRegistry();
  }

  private syncRegistry() {
    LobbyRoom.registry.set(this.roomId, {
      lobbyId: this.roomId,
      visibility: this.state.visibility as "public" | "private",
      inviteCode: this.state.inviteCode,
      status: this.state.status,
      gameMode: this.state.gameMode,
      difficulty: this.state.difficulty,
      mapId: this.state.mapId,
      hostName: this.state.host.playerName,
      playerCount: this.state.players.size,
      maxPlayers: this.state.maxPlayers,
    });
  }

  async onDispose() {
    LobbyRoom.registry.delete(this.roomId);
  }

  async resetAfterMatch() {
    this.state.matchRoomId = "";
    await this.refreshLobbyState();
  }
}
