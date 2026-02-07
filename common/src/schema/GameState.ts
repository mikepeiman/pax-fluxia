// ============================================================================
// Colyseus Schema Definitions for Pax Fluxia
// ============================================================================
// These types work in both browser and server environments.
// The browser uses them locally, the server uses them for network sync.
//
// NOTE: Uses defineTypes() instead of @type decorators to avoid
// decorator transpilation issues between tsx/esbuild and Colyseus.

import { Schema, defineTypes, MapSchema, ArraySchema } from "@colyseus/schema";

// ============================================================================
// Player Schema
// ============================================================================

export class PlayerSchema extends Schema {
    id: string = "";
    name: string = "";
    color: string = "";
    isAI: boolean = false;
    isEliminated: boolean = false;
    starCount: number = 0;
    totalShips: number = 0;
    activeShips: number = 0;
    damagedShips: number = 0;
    production: number = 0;
    isConnected: boolean = true;
    sessionId: string = "";
}
defineTypes(PlayerSchema, {
    id: "string",
    name: "string",
    color: "string",
    isAI: "boolean",
    isEliminated: "boolean",
    starCount: "number",
    totalShips: "number",
    activeShips: "number",
    damagedShips: "number",
    production: "number",
    isConnected: "boolean",
    sessionId: "string",
});

// ============================================================================
// Star Schema
// ============================================================================

export class StarSchema extends Schema {
    id: string = "";
    x: number = 0;
    y: number = 0;
    radius: number = 30;
    productionRate: number = 1;
    activeShips: number = 0;
    damagedShips: number = 0;
    ownerId: string = "";
    targetId: string = "";
    queuedOrderTargetId: string = "";
    icon: string = "🌟";
    starType: string = "grey";
    activationRate: number = 0.8;
    defensivePosture: number = 1.0;
    defenseStrength: number = 1.0;
    repairRate: number = 0.2;
    transferRate: number = 1.0;
}
defineTypes(StarSchema, {
    id: "string",
    x: "number",
    y: "number",
    radius: "number",
    productionRate: "number",
    activeShips: "number",
    damagedShips: "number",
    ownerId: "string",
    targetId: "string",
    queuedOrderTargetId: "string",
    icon: "string",
    starType: "string",
    activationRate: "number",
    defensivePosture: "number",
    defenseStrength: "number",
    repairRate: "number",
    transferRate: "number",
});

// ============================================================================
// Connection Schema
// ============================================================================

export class ConnectionSchema extends Schema {
    sourceId: string = "";
    targetId: string = "";
    distance: number = 0;
}
defineTypes(ConnectionSchema, {
    sourceId: "string",
    targetId: "string",
    distance: "number",
});

// ============================================================================
// Territory Polygon (for Voronoi)
// ============================================================================

export class PointSchema extends Schema {
    x: number = 0;
    y: number = 0;
}
defineTypes(PointSchema, {
    x: "number",
    y: "number",
});

export class TerritorySchema extends Schema {
    playerId: string = "";
    points = new ArraySchema<PointSchema>();
}
defineTypes(TerritorySchema, {
    playerId: "string",
    points: [PointSchema],
});

// ============================================================================
// Room State Schema (Root)
// ============================================================================

export class GameRoomState extends Schema {
    // Game phase
    phase: "lobby" | "playing" | "ended" = "lobby";

    // Tick state
    tick: number = 0;
    tickProgress: number = 0;
    isPaused: boolean = true;
    speed: number = 1;

    // Players (map by session ID for easy lookup)
    players = new MapSchema<PlayerSchema>();

    // Stars (map by star ID)
    stars = new MapSchema<StarSchema>();

    // Connections (array for iteration)
    connections = new ArraySchema<ConnectionSchema>();

    // Territories (optional, for visualization)
    territories = new MapSchema<TerritorySchema>();

    // Room settings
    maxPlayers: number = 4;
    playerCount: number = 0;
    hostSessionId: string = "";
    winnerId: string = "";
}
defineTypes(GameRoomState, {
    phase: "string",
    tick: "number",
    tickProgress: "number",
    isPaused: "boolean",
    speed: "number",
    players: { map: PlayerSchema },
    stars: { map: StarSchema },
    connections: [ConnectionSchema],
    territories: { map: TerritorySchema },
    maxPlayers: "number",
    playerCount: "number",
    hostSessionId: "string",
    winnerId: "string",
});

// ============================================================================
// Re-export ArraySchema and MapSchema for consumers
// ============================================================================

export { MapSchema, ArraySchema };

