/**
 * @file FrontierTopologyContracts.ts
 * Semantic frontier topology types — Phase 1 of the Frontier Topology Project.
 *
 * These types give frontier geometry IDENTITY: identified vertices, identified
 * sections (shared edges), and region loops defined as ordered section references.
 *
 * Key invariant: A FrontierSection exists EXACTLY ONCE. Two owners do NOT get
 * separate copies of the same shared border. Region loops reference sections
 * by ID; they do not own copied points.
 *
 * Layer: Contracts (consumed by Geometry, Transition, Presentation)
 * PIXI imports: NEVER
 */

// ── Frontier Vertex ─────────────────────────────────────────────────────────

/** Structural vertex kind in the frontier topology. */
export type FrontierVertexKind =
    | 'junction_3way'       // 3+ territory fills meet
    | 'world_intersection'  // frontier meets world boundary
    | 'world_corner'        // world boundary corner
    | 'lane_anchor'         // star lane anchor point
    | 'star_anchor';        // star position anchor

/**
 * A structural vertex in the frontier topology.
 * These are the "anchor points" — 3-way junctions, world-border intersections,
 * and world corners. NOT arbitrary render samples.
 */
export interface FrontierVertex {
    /** Stable identifier. Uses ptKey(x, y) from the compiler for compatibility. */
    id: string;
    /** What kind of structural vertex this is. */
    kind: FrontierVertexKind;
    /** World-space position. */
    point: [number, number];
    /** IDs of FrontierSections incident at this vertex. */
    incidentSectionIds: string[];
    /** Owner IDs that meet at this vertex (2 for world intersections, 3 for junctions). */
    ownerIds: string[];
    /** Optional semantic key for stable cross-frame matching (e.g. "corner:top-right"). */
    semanticKey?: string;
}

// ── Section Influence ───────────────────────────────────────────────────────

/** Star influence data for one side of a section. */
export interface SectionInfluence {
    ownerId: string;
    primaryStarId: string;
    /** 0–1, how much this star dominates this side. */
    primaryScore: number;
    secondaryStarId?: string;
    secondaryScore?: number;
}

// ── Frontier Section ────────────────────────────────────────────────────────

/** Section type — owner-to-owner border or owner-to-world border. */
export type FrontierSectionKind = 'owner_border' | 'world_border';

/**
 * One shared topological edge between two frontier vertices.
 * This is the PRIMARY geometry unit. Exists EXACTLY ONCE — two owners
 * do NOT get separate copies.
 */
export interface FrontierSection {
    /** Stable identifier derived from ownerPairKey + start/end vertex IDs. */
    id: string;
    /** Section type. */
    kind: FrontierSectionKind;
    /** Start vertex ID (defines canonical orientation). */
    startVertexId: string;
    /** End vertex ID. */
    endVertexId: string;
    /** Owner on the LEFT of the canonical direction (start → end). */
    leftOwnerId: string;
    /** Owner on the RIGHT, or 'world' for world borders. */
    rightOwnerId: string;
    /** Full smoothed point array from start vertex to end vertex.
     *  First point === FrontierVertex[startVertexId].point.
     *  Last point === FrontierVertex[endVertexId].point. */
    points: [number, number][];
    /** Total arc length of the section. */
    length: number;
    /** Canonical owner-pair key (sorted, e.g. "player_0|player_1"). */
    ownerPairKey: string;

    // ── Influence attribution ──
    /** Dominant star influence on the left side. */
    leftInfluence: SectionInfluence;
    /** Dominant star influence on the right side. */
    rightInfluence: SectionInfluence;
}

// ── Region Loop ─────────────────────────────────────────────────────────────

/** Reference to a section within a region loop. */
export interface SectionRef {
    /** ID of the FrontierSection. */
    sectionId: string;
    /** Whether this loop traverses the section in canonical or reversed direction. */
    direction: 'forward' | 'reverse';
}

/**
 * A closed territory boundary defined as ordered section references.
 * Fills are rebuilt from these references — NOT from independent polygon data.
 */
export interface RegionLoop {
    /** Stable identifier. */
    id: string;
    /** Owner of this region. */
    ownerId: string;
    /** Connected component ID (distinguishes disconnected islands of same owner). */
    componentId: string;
    /** Ordered section references forming the closed loop. */
    sectionRefs: SectionRef[];
    /** Signed area (positive = clockwise outer boundary, negative = hole). */
    signedArea: number;
}

// ── Frontier Topology (top-level) ───────────────────────────────────────────

/**
 * Complete semantic frontier state for one frame.
 * This is the output of the geometry layer and the input to the transition planner.
 */
export interface FrontierTopology {
    /** Deterministic version hash. */
    version: string;
    /** Ownership version this topology was computed from. */
    ownershipVersion: string;
    /** World bounds. */
    worldBounds: { width: number; height: number };

    /** All frontier vertices (junctions, world intersections, corners). */
    vertices: ReadonlyMap<string, FrontierVertex>;
    /** All frontier sections (shared edges between vertices). */
    sections: ReadonlyMap<string, FrontierSection>;
    /** All region loops (closed boundaries per owner). */
    loops: readonly RegionLoop[];

    // ── Indexes for fast lookup ──
    /** Sections by owner pair key. */
    sectionsByOwnerPair: ReadonlyMap<string, readonly string[]>;
    /** Sections incident to a given vertex. */
    sectionsByVertex: ReadonlyMap<string, readonly string[]>;
    /** Sections owned by (left or right) a given owner. */
    sectionsByOwner: ReadonlyMap<string, readonly string[]>;
}
