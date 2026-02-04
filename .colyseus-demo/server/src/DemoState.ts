// State schema for the demo
import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
    @type("string") name: string = "";
    @type("string") sessionId: string = "";
}

export class DemoState extends Schema {
    @type("string") phase: string = "lobby";
    @type("number") playerCount: number = 0;
    @type({ map: Player }) players = new MapSchema<Player>();
}
