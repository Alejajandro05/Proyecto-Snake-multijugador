import { Schema, type, ArraySchema } from "@colyseus/schema";
import { SnakeSegment } from "./SnakeSegment.js";

export class Player extends Schema {
  @type("string")  sessionId: string = "";
  @type("number")  color: number = 0x00ff00;
  @type("string")  direction: string = "right";
  @type("string")  nextDirection: string = "right";
  @type("boolean") alive: boolean = true;
  @type("number")  score: number = 0;
  @type([SnakeSegment]) segments = new ArraySchema<SnakeSegment>();
}
