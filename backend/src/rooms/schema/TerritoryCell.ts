import { Schema, type } from "@colyseus/schema";

export class TerritoryCell extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("string") ownerId: string = "";
  @type("number") ownerColor: number = 0;
}
