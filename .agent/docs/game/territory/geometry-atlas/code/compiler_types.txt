/**
 * territory/compiler/types.ts
 *
 * Canonical data contracts for the Territory Compiler pipeline.
 * These are the ONLY truth types used by render and transition layers.
 * Zero PIXI imports. Zero rendering logic. Zero side-effects.
 *
 * Pipeline: MetricState → FrontierGraph → TerritoryRegions → CanonicalTerritoryState
 */

// ---------------------------------------------------------------------------
// Stage 1: Metric Truth
// ---------------------------------------------------------------------------

/** Top-2 ownership evidence at a single star node. */
export interface NodeDistance {
    ownerIdx: number; // Index into MetricState.playerIds
    distance: number; // Graph-shortest-path distance (weighted hops)
}

export interface MetricTruthNode {
    best: NodeDistance | null;
    second: NodeDistance | null;
}

/** Output of metricStage. The sole source of ownership truth. */
export interface MetricState {
    top2ByStar: MetricTruthNode[]; // Indexed by star array index
    playerIds: string[]; // Ordered list of all player IDs
    starCount: number;
}

// ---------------------------------------------------------------------------
// Stage 2: Frontier Graph
// ---------------------------------------------------------------------------

/** A world-coordinate point where two owner territories meet. */
export interface FrontierNode {
    id: string;
    x: number;
    y: number;
    ownerA: number; // Index into MetricState.playerIds
    ownerB: number;
    pairId: string; // Deterministic: `${min(ownerA,ownerB)}:${max(ownerA,ownerB)}`
}

/** A directed edge between two frontier nodes. Owner-pair is stored once. */
export interface FrontierEdge {
    id: string;
    a: string; // FrontierNode.id
    b: string; // FrontierNode.id
    ownerA: number;
    ownerB: number;
    pairId: string;
}

/** The singular canonical frontier topology. */
export interface FrontierGraph {
    nodes: Map<string, FrontierNode>;
    edges: Map<string, FrontierEdge>;
    adjacency: Map<string, string[]>; // nodeId → adjacent nodeIds
}

// ---------------------------------------------------------------------------
// Stage 3: Territory Regions
// ---------------------------------------------------------------------------

/** A closed, owned territory region derived from frontier topology. */
export interface TerritoryRegion {
    id: string;
    ownerId: string;
    componentId: string; // Unique per disconnected same-owner holding
    loops: number[][]; // Each loop: [x1, y1, x2, y2, ...] CCW closed
}

// ---------------------------------------------------------------------------
// Stage 4: Geometry Fitting
// ---------------------------------------------------------------------------

export type GeometryFamily = 'straight' | 'segmented' | 'curved';

/** A fitted frontier path in a selected geometry family. */
export interface FittedFrontier {
    pairId: string;
    family: GeometryFamily;
    ownerA: number;
    ownerB: number;
    polylines: number[][]; // One or more simplified paths [x1,y1,x2,y2,...]
}

// ---------------------------------------------------------------------------
// Canonical Output
// ---------------------------------------------------------------------------

/** The single authoritative territory state for all rendering and transitions. */
export interface CanonicalTerritoryStateOk {
    kind: 'ok';
    metricTruth: MetricState;
    frontierGraph: FrontierGraph;
    fittedFrontiers: FittedFrontier[];
    regions: TerritoryRegion[];
    componentsByOwner: Map<string, string[]>; // ownerId → componentIds
    transitionActive: boolean;
}

/** Typed failure — never emit partial or fallback geometry. */
export interface CompileError {
    kind: 'error';
    stage: 'metric' | 'frontier' | 'region' | 'fitter' | 'transition';
    message: string;
    recoverable: boolean; // true = renderer may use cached state; false = hard failure
}

export type CanonicalTerritoryState = CanonicalTerritoryStateOk | CompileError;

// ---------------------------------------------------------------------------
// Transition Plan
// ---------------------------------------------------------------------------

export interface FrontierCorrespondence {
    prevEdgeId: string;
    nextEdgeId: string;
    pairId: string;
    prevControlPoints: number[][];
    nextControlPoints: number[][];
}

/** Static morph plan computed once per ownership change. No clock state. */
export interface TransitionPlan {
    startedAtMs: number;
    durationMs: number;
    prevState: CanonicalTerritoryStateOk;
    nextState: CanonicalTerritoryStateOk;
    frontierCorrespondences: FrontierCorrespondence[];
}

// ---------------------------------------------------------------------------
// Compiler Config
// ---------------------------------------------------------------------------

export interface MetricCompilerConfig {
    minStarRadius?: number; // MSR: negative seed offset in Dijkstra (pixels)
}

export interface FrontierCompilerConfig {
    minStarRadius?: number;
    worldBounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export interface RegionCompilerConfig {
    worldBounds: { minX: number; minY: number; maxX: number; maxY: number };
    disconnectGapThreshold?: number; // Min px gap for disconnected holdings
}

export interface FitterConfig {
    rdpTolerance?: number; // RDP simplification tolerance (px)
    angleQuantization?: number; // Degrees for segmented family
}

export interface CompilerConfig {
    metric?: MetricCompilerConfig;
    frontier?: FrontierCompilerConfig;
    region?: RegionCompilerConfig;
    fitter?: FitterConfig;
    family?: GeometryFamily;
    worldBounds: { minX: number; minY: number; maxX: number; maxY: number };
}
