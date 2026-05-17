import { Schema, type } from "@colyseus/schema";

export class PublicLobbySummary extends Schema {
  @type("string") lobbyId: string = "";
  @type("string") hostName: string = "";
  @type("string") gameMode: string = "normal";
  @type("string") difficulty: string = "normal";
  @type("string") mapId: string = "arena01";
  @type("number") playerCount: number = 0;
  @type("number") maxPlayers: number = 2;
}
