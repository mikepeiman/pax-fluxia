// ---------------------------------------------------------------------------
// Canonical Frontier Map Types
// ---------------------------------------------------------------------------
// These types encode the structural metadata that the chain-walk currently
// discards when collapsing results into flat point arrays.
//
// Layer: Geometry (compiler output)
// Consumed by: Transition (diffing), Presentation (rendering)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Decisive Vertices
// ---------------------------------------------------------------------------

/**
 * Identity-bearing decisive vertex.
 *
 * A decisive vertex is a topologically stable anchor where frontier edges
 * meet. These survive ownership changes on adjacent territories and serve
 * as splice/anchor points for transition animation.
 *
 * The `id` is a ptKey string (e.g. "123.46,567.89") — stable across
 * geometry rebuilds for the same star configuration.
 */
export interface FrontierMapVertex {
    /** Stable identity: ptKey(x, y) */
    id: string;
    x: number;
    y: number;
    /** Number of canonical edges meeting at this vertex */
    degree: number;
    /** Classification of this vertex */
    kind: FrontierMapVertexKind;
}

/**
 * Decisive vertex classification.
 *
 * - `junction-3way`: point where 3+ territory cells meet (3-way frontier junction)
 * - `frontier-mapedge`: point where a frontier polyline meets a world-boundary edge
 * - `loop-closure`: vertex where a chain walk closes back to its start
 * - `endpoint`: polyline endpoint that doesn't match the above (degenerate)
 */
export type FrontierMapVertexKind =
    | 'junction-3way'
    | 'frontier-mapedge'
    | 'loop-closure'
    | 'endpoint';

// ---------------------------------------------------------------------------
// Canonical Edges
// ---------------------------------------------------------------------------

/**
 * One directed boundary edge between two canonical vertices.
 *
 * An edge represents a single frontier segment — the portion of a smoothed
 * SharedPolyline between two decisive vertices. The curvePoints are the
 * exact same smoothed points used by the border renderer and stitched
 * into fill polygons by the chain walk.
 *
 * Owner semantics: when traversing from startVertex to endVertex,
 * leftOwnerId is the territory being filled (interior side);
 * rightOwnerId is the adjacent territory or null for world boundary.
 */
export interface FrontierMapEdge {
    /** Stable identity: `${startVertexId}->${endVertexId}:${ownerPairKey}` */
    id: string;
    startVertexId: string;
    endVertexId: string;
    /** Owner on the interior (left) side when traversing start→end */
    leftOwnerId: string;
    /** Owner on the exterior (right) side. null = world boundary */
    rightOwnerId: string | null;
    kind: 'owner-owner' | 'owner-world';
    /** Smoothed polyline points from start vertex to end vertex (inclusive).
     *  These are the EXACT points from the Chaikin-smoothed SharedPolyline. */
    curvePoints: [number, number][];
    /** Index of the source SharedPolyline in the combined polyline array.
     *  Provides provenance back to the raw geometry stage output. */
    sourcePolylineIdx: number;
    /** Direction this edge was traversed relative to the source polyline */
    orientation: 'forward' | 'reverse';
}

// ---------------------------------------------------------------------------
// Canonical Loops
// ---------------------------------------------------------------------------

/**
 * Validity state for a canonical loop.
 *
 * - `valid-closed`: chain walk closed perfectly (tailKey === headKey)
 * - `partial-open`: chain walk did not close — emitted as best-effort
 * - `degraded-repaired`: loop required gap repair or tolerance fix
 *
 * Chain-walk diagnostics may still report partial-open loops even though fill
 * reconstruction now drops clearly open chains and only repairs small
 * near-closure gaps. Canonical consumers should still check this status before
 * trusting loop integrity.
 */
export type FrontierMapLoopValidity =
    | 'valid-closed'
    | 'partial-open'
    | 'degraded-repaired';

/**
 * A closed (or partial) loop of directed edges forming one territory boundary.
 *
 * Loops are the canonical representation of what the chain walk currently
 * outputs as flat MergedTerritory.points arrays. Each loop records the
 * ordered edge and vertex IDs so that the transition system can identify
 * which edges changed between two geometry states.
 */
export interface FrontierMapLoop {
    /** Stable identity: `${ownerId}:${loopIndex}` */
    loopId: string;
    ownerId: string;
    /** Whether this is an outer boundary or an enclave hole */
    kind: 'outer' | 'hole';
    /** Ordered edge IDs for this loop traversal */
    edgeIds: string[];
    /** Ordered vertex IDs for this loop traversal (same length as edgeIds) */
    vertexIds: string[];
    /** Validity state of this loop */
    validity: FrontierMapLoopValidity;
}

// ---------------------------------------------------------------------------
// Frontier Map
// ---------------------------------------------------------------------------

/**
 * Complete frontier map for one geometry state.
 *
 * This is the canonical representation that Transition will diff between
 * two states to identify local boundary edits. It is emitted alongside
 * (not instead of) existing TerritoryGeometryData outputs.
 */
export interface TerritoryFrontierMap {
    vertices: Map<string, FrontierMapVertex>;
    edges: Map<string, FrontierMapEdge>;
    loops: FrontierMapLoop[];
    /** Geometry fingerprint for change detection */
    fingerprint: string;
}
