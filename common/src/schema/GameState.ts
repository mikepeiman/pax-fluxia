// ============================================================================
// Colyseus Schema Definitions for Pax Fluxia
// ============================================================================
// These types work in both browser and server environments.
// The browser uses them locally, the server uses them for network sync.

import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

// ============================================================================
// Player Schema
// ============================================================================

export class PlayerSchema extends Schema {
    @type("string") id: string = "";
    @type("string") name: string = "";
    @type("string") color: string = "";
    @type("boolean") isAI: boolean = false;
    @type("boolean") isEliminated: boolean = false;
    @type("number") starCount: number = 0;
    @type("number") totalShips: number = 0;
    @type("number") activeShips: number = 0;
    @type("number") damagedShips: number = 0;
    @type("number") production: number = 0;
    @type("boolean") isConnected: boolean = true;
    @type("string") sessionId: string = ""; // Colyseus session ID
}

// ============================================================================
// Star Schema
// ============================================================================

export class StarSchema extends Schema {
    @type("string") id: string = "";
    @type("number") x: number = 0;
    @type("number") y: number = 0;
    @type("number") radius: number = 30;
    @type("number") productionRate: number = 1;
    @type("number") activeShips: number = 0;
    @type("number") damagedShips: number = 0;
    @type("string") ownerId: string = "";
    @type("string") targetId: string = "";  // Empty string = no target
    @type("string") queuedOrderTargetId: string = "";
    @type("string") icon: string = "🌟";
    @type("string") starType: string = "grey";
    @type("number") activationRate: number = 0.8;
    @type("number") defensivePosture: number = 1.0;
    @type("number") defenseStrength: number = 1.0;
    @type("number") repairRate: number = 0.2;
    @type("number") transferRate: number = 1.0;
}

// ============================================================================
// Connection Schema
// ============================================================================

export class ConnectionSchema extends Schema {
    @type("string") sourceId: string = "";
    @type("string") targetId: string = "";
    @type("number") distance: number = 0;
}

// ============================================================================
// Territory Polygon (for Voronoi)
// ============================================================================

export class PointSchema extends Schema {
    @type("number") x: number = 0;
    @type("number") y: number = 0;
}

export class TerritorySchema extends Schema {
    @type("string") playerId: string = "";
    @type([PointSchema]) points = new ArraySchema<PointSchema>();
}

// ============================================================================
// Room State Schema (Root)
// ============================================================================

export class GameRoomState extends Schema {
    // Game phase
    @type("string") phase: "lobby" | "playing" | "ended" = "lobby";

    // Tick state
    @type("number") tick: number = 0;
    @type("number") tickProgress: number = 0;
    @type("boolean") isPaused: boolean = true;
    @type("number") speed: number = 1;

    // Players (map by session ID for easy lookup)
    @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();

    // Stars (map by star ID)
    @type({ map: StarSchema }) stars = new MapSchema<StarSchema>();

    // Connections (array for iteration)
    @type([ConnectionSchema]) connections = new ArraySchema<ConnectionSchema>();

    // Territories (optional, for visualization)
    @type({ map: TerritorySchema }) territories = new MapSchema<TerritorySchema>();

    // Room settings
    @type("number") maxPlayers: number = 4;
    @type("number") playerCount: number = 0;
    @type("string") hostSessionId: string = "";
    @type("string") winnerId: string = "";
}

// ============================================================================
// Re-export ArraySchema and MapSchema for consumers
// ============================================================================

export { MapSchema, ArraySchema };
