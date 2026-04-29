import { Schema, type } from "@colyseus/schema";

export class LobbyPlayer extends Schema {
  @type("string") sessionId: string = "";
  @type("string") playerName: string = "";
  @type("string") skinId: string = "";
  @type("boolean") isHost: boolean = false;
  @type("boolean") connected: boolean = false;
}
