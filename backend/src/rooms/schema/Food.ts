import { Schema, type } from "@colyseus/schema";

export class Food extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
}
