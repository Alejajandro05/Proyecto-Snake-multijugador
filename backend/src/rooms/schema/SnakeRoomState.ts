import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";
import { Player } from "./Player.js";
import { Food } from "./Food.js";
import { Obstacle } from "./Obstacle.js";

export class SnakeRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type([Food])          food    = new ArraySchema<Food>();
  @type([Obstacle])      obstacles = new ArraySchema<Obstacle>();
  @type("number")       boardCols: number = 0;
  @type("number")       boardRows: number = 0;
  @type("number")       boardCellSize: number = 0;
  @type("number")       tickMs: number = 0;
  @type("number")       foodCount: number = 0;
  @type("number")       obstaclesPerQuadrant: number = 0;
  @type("string")       difficulty: string = "normal";
  @type("string")       gameMode: string = "classic";
  @type("string")       mapId: string = "arena01";
  @type("number")       hillZoneCol0: number = 0;
  @type("number")       hillZoneCol1: number = 0;
  @type("number")       hillZoneRow0: number = 0;
  @type("number")       hillZoneRow1: number = 0;
  @type("number")       hillWinScore: number = 0;
  @type("boolean")       started: boolean = false;
}
