import { Schema, type, ArraySchema, MapSchema } from "@colyseus/schema";

export class Position extends Schema {
  @type("number") x: number;
  @type("number") y: number;

  constructor(x: number = 0, y: number = 0) {
    super();
    this.x = x;
    this.y = y;
  }
}

export class Player extends Schema {
  @type([Position]) segments = new ArraySchema<Position>();
  @type("string") direction: string = "right";
  @type("number") score: number = 0;
  @type("boolean") alive: boolean = true;
  @type("boolean") ready: boolean = false;

  nextDirection: string = "right";
}

export class SnakeGameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type(Position) food: Position = new Position();
  @type("boolean") gameStarted: boolean = false;
  @type("boolean") gameOver: boolean = false;
  @type("string") winner: string = "";
  @type("number") countdown: number = 0;
}
