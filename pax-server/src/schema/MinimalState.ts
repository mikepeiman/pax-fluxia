// Minimal test schema - simplest possible schema for debugging
import { Schema, defineTypes, MapSchema } from "@colyseus/schema";

export class MinimalPlayerSchema extends Schema {
    id: string = "";
    name: string = "";
}
defineTypes(MinimalPlayerSchema, {
    id: "string",
    name: "string",
});

export class MinimalState extends Schema {
    status: string = "lobby";
    players = new MapSchema<MinimalPlayerSchema>();
}
defineTypes(MinimalState, {
    status: "string",
    players: { map: MinimalPlayerSchema },
});
