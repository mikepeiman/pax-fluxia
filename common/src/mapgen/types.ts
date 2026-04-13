// ============================================================================
// Map Generation — Shared Types
// ============================================================================

/**
 * A 2D position on the map (output of placement algorithms).
 * No game logic — just coordinates.
 */
export interface MapPosition {
    x: number;
    y: number;
}

/**
 * Lane resolution class for motion and corridor sampling (not the same as `MapLaneMode`).
 * `straight` = chord polyline (two endpoints only). `curved` = Bézier samples or kinked polyline.
 */
export type LanePathKind = 'straight' | 'angular' | 'curved';
export type LaneAdjustmentStyle = 'angular' | 'curved';

/**
 * A connection between two map nodes.
 * Uses string IDs so both client (Star class) and server (StarSchema) can map to their own types.
 */
export interface MapConnection {
    sourceId: string;
    targetId: string;
    distance: number;
    /** Centerline polyline (star centers); used by preview, territory CX, and travel. */
    laneWaypoints?: Array<[number, number]>;
    /** Set by mapgen / lane solver; consumers avoid re-deriving from waypoint count alone. */
    lanePathKind?: LanePathKind;
}

/**
 * Minimal node shape required by the connection generator.
 * Both client Star and server StarSchema satisfy this.
 */
export interface Connectable {
    id: string;
    x: number;
    y: number;
}

/**
 * Configuration for map generation.
 * Gathered from GAME_CONFIG (client) or RoomOptions (server).
 */
export interface MapGenConfig {
    /** Canvas/map width in pixels */
    width: number;
    /** Canvas/map height in pixels */
    height: number;
    /** Number of player IDs (determines total stars) */
    playerCount: number;
    /** Stars allocated per player */
    starsPerPlayer: number;
    /** Extra neutral stars to generate on top of player stars */
    extraNeutralStars?: number;
    /** Spacing multiplier (1.0 = physics minimum) */
    spacingMultiplier?: number;
    /** Hex grid cell radius (default 60) */
    hexRadius?: number;
    /** Minimum connections per star (default 1) */
    minLinksPerStar?: number;
    /** Maximum connections per star (default 6) */
    maxLinksPerStar?: number;
    /** 0 = natural bbox after placement; 1 = scale/translate to fill padded play area (uniform, Delaunay-safe) */
    boardFit?: number;
    /**
     * Client territory MSR (px); **not** used for lane pass-through or lane geometry — see `mapgenLaneMarginPx`.
     * Still passed through mapgen config for server/client parity with `GAME_CONFIG`.
     */
    mapgenStarMarginPx?: number;
    /**
     * Minimum distance (px) from a Delaunay chord / sampled lane centerline to any non-endpoint star.
     * Single knob for lane topology + curved solver (independent of territory MSR).
     * Default **75** ≈ prior defaults 45 MSR + 30 “buffer”.
     */
    mapgenLaneMarginPx?: number;
    /**
     * `straight` = chord only. `curved` = straight when valid, else curve/detour
     * (lane-margin clearance vs other stars; avoid crossing other lane centerlines).
     */
    mapLaneMode?: 'straight' | 'curved';
    /** How non-straight accepted lanes are represented once remapping is enabled. */
    mapgenLaneAdjustedPathStyle?: LaneAdjustmentStyle;
    /**
     * 0..1 remap-vs-prune bias for lanes whose straight chord violates `mapgenLaneMarginPx`.
     *
     * Hierarchy:
     * 1. Full traversal connectivity is the winning constraint.
     * 2. If a chord satisfies `mapgenLaneMarginPx`, keep it straight.
     * 3. If a chord violates `mapgenLaneMarginPx`:
     *    - low values bias toward pruning that lane and replacing connectivity elsewhere
     *    - high values bias toward trying adjusted paths that satisfy the same clearance
     * 4. Min/max link targets are weakest and may be exceeded or under-filled to preserve the above.
     */
    mapgenLaneCurveVsPruneBias?: number;
}

/**
 * Output of generateMap(): pure data with no framework bindings.
 * Consumer (client or server) converts to Star/StarSchema instances.
 */
export interface MapGenResult {
    positions: MapPosition[];
    connections: MapConnection[];
    /** Final hex radius used (may differ from config after adaptive sizing) */
    hexRadius: number;
    /** Map dimensions used */
    width: number;
    height: number;
    /** Padding used during generation (for debug grid alignment) */
    paddingX: number;
    paddingY: number;
}
