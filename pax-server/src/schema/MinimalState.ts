// Minimal test schema - simplest possible schema for debugging
import { Schema, type, MapSchema } from "@colyseus/schema";

export class MinimalPlayerSchema extends Schema {
    @type("string") id: string = "";
    @type("string") name: string = "";
}

export class MinimalState extends Schema {
    @type("string") status: string = "lobby";
    @type({ map: MinimalPlayerSchema }) players = new MapSchema<MinimalPlayerSchema>();
}
