// Minimal test schema - simplest possible schema for debugging
import { schema, type SchemaType } from "@colyseus/schema";

export const MinimalPlayerSchema = schema({
    id: "string",
    name: "string",
}, "MinimalPlayerSchema");
export type MinimalPlayerSchema = SchemaType<typeof MinimalPlayerSchema>;

export const MinimalState = schema({
    status: "string",
    players: { map: MinimalPlayerSchema },
}, "MinimalState");
export type MinimalState = SchemaType<typeof MinimalState>;
