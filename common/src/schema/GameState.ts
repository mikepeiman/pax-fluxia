// ============================================================================
// Colyseus Schema Definitions for Pax Fluxia
// ============================================================================
// These types work in both browser and server environments.
// The browser uses them locally, the server uses them for network sync.
//
// Uses schema() function API — avoids decorator transpilation issues
// between tsx/esbuild and different tsconfig contexts.
// See: https://docs.colyseus.io/state/schema/

import { schema, type SchemaType, MapSchema, ArraySchema } from "@colyseus/schema";

// ============================================================================
// Player Schema
// ============================================================================

export const PlayerSchema = schema({
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
}, "PlayerSchema");
export type PlayerSchema = SchemaType<typeof PlayerSchema>;

// ============================================================================
// Star Schema
// ============================================================================

export const StarSchema = schema({
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
    // Integer-ship invariant: overflow accumulators
    productionOverflow: "number",
    repairOverflow: "number",
    // Combat state (for repair suppression: attacker vs defender)
    lastCombatTick: "number",
    lastAttackTick: "number",
}, "StarSchema");
export type StarSchema = SchemaType<typeof StarSchema>;

// ============================================================================
// Connection Schema
// ============================================================================

export const PointSchema = schema({
    x: "number",
    y: "number",
}, "PointSchema");
export type PointSchema = SchemaType<typeof PointSchema>;

export const ConnectionSchema = schema({
    sourceId: "string",
    targetId: "string",
    distance: "number",
    lanePathKind: "string",
    laneConstraintStatus: "string",
    laneWaypoints: { array: PointSchema },
}, "ConnectionSchema");
export type ConnectionSchema = SchemaType<typeof ConnectionSchema>;

// ============================================================================
// Territory Polygon (for Voronoi)
// ============================================================================

export const TerritorySchema = schema({
    playerId: "string",
    points: { array: PointSchema },
}, "TerritorySchema");
export type TerritorySchema = SchemaType<typeof TerritorySchema>;

// ============================================================================
// Room State Schema (Root)
// ============================================================================

export const GameRoomState = schema({
    // Game phase
    phase: "string",

    // Tick state
    tick: "number",
    tickProgress: "number",
    isPaused: "boolean",
    speed: "number",

    // Players (map by session ID for easy lookup)
    players: { map: PlayerSchema },

    // Stars (map by star ID)
    stars: { map: StarSchema },

    // Connections (array for iteration)
    connections: { array: ConnectionSchema },

    // Territories (optional, for visualization)
    territories: { map: TerritorySchema },

    // Room settings
    maxPlayers: "number",
    playerCount: "number",
    hostSessionId: "string",
    winnerId: "string",
}, "GameRoomState");
export type GameRoomState = SchemaType<typeof GameRoomState>;

// ============================================================================
// Re-export ArraySchema and MapSchema for consumers
// ============================================================================

export { MapSchema, ArraySchema };
