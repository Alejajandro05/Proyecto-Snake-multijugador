import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { Player } from "./Player.js";
import { Food } from "./Food.js";
import { Obstacle } from "./Obstacle.js";

export class SnakeRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Food])          food    = new ArraySchema<Food>();
  @type([Obstacle])      obstacles = new ArraySchema<Obstacle>();
  @type("boolean")       started: boolean = false;
}
