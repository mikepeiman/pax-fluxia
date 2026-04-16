/**
 * territory/compiler/powerVoronoiTerritoryGeometryGenerator.ts
 *
 * Layer 2: Territory Geometry Generation — Power Voronoi
 *
 * Generates territory polygon geometry using d3-weighted-voronoi power diagrams.
 * Pure data generator — produces typed geometry; never renders.
 *
 * Pipeline:
 *   0. Build site array (owned stars + corridor virtuals + disconnect virtuals)
 *   1. Power diagram via d3-weighted-voronoi (weight = starMargin²)
 *   2. Build per-star TerritoryCell[] from polygon output
 *   3. Extract SharedBorderEdge[] (contested edges before merge)
 *   4. Build cluster map (for disconnect splitting)
 *   5. Merge same-owner cells → MergedTerritory[]
 *   6. Chain shared edges into SharedPolyline[] with Chaikin smoothing (geometry, not render)
 *   7. Detect enclaves
 *
 * Rules:
 * - Zero PIXI imports
 * - Zero rendering calls
 * - Zero config mutation
 * - Returns typed TerritoryGeometryData | CompileError — never throws, never fabricates geometry
 */

import { weightedVoronoi } from 'd3-weighted-voronoi';
import type { StarState, StarConnection } from '$lib/types/game.types';
import { computeCorridorVirtuals, computeDisconnectVirtuals, DISCONNECT_OWNER_ID } from '$lib/renderers/territoryFeatures';
import { findConnectedClustersOptimized } from '$lib/renderers/territoryUtils';
import { log } from '$lib/utils/logger';
import type { CompileError } from './types';
import { executeChainWalk, flattenLoopPoints } from './chainWalkCore';
import {
    buildSortedOutgoingArcMap,
    normalizePlanarAngle,
    pickClockwiseAdjacentArc,
    type DirectedPlanarArc,
} from './planarWalk';

// ---------------------------------------------------------------------------
// Geometry types (canonical contracts for PVV2 path)
// ---------------------------------------------------------------------------

/** A site in the power diagram — star or virtual point with weight. */
export interface PowerSite {
    x: number;
    y: number;
    weight: number;
    ownerId: string;
    starId: string;
    virtual?: 'corridor' | 'disconnect';
}

/** Polygon output from the power diagram, augmented with ownership info. */
export interface TerritoryCell {
    points: [number, number][];
    ownerId: string;
    siteId: string;
}

/** Merged polygon for same-owner territory rendering. Color assigned by renderer. */
export interface MergedTerritory {
    points: [number, number][];  // [[x,y], ...] closed polygon
    ownerId: string;
    color: number;               // renderer fills this in; 0 from stage
    starIds: string[];           // constituent star IDs — graph identity survives merging
}

/** A border edge segment shared between two different owners. */
export interface SharedBorderEdge {
    x1: number; y1: number;
    x2: number; y2: number;
    ownerA: string;
    ownerB: string;
    colorA: number;  // renderer fills these in; 0 from stage
    colorB: number;
    siteIdA: string;
    siteIdB: string;
}

/** A continuous polyline of chained shared border edges between two owners. */
export interface SharedPolyline {
    points: [number, number][];
    ownerPairKey: string;
    color: number;   // renderer fills this in; 0 from stage
}

const LOOP_CLOSURE_TOLERANCE_PX = 6;

interface DirectedEdgeArc extends DirectedPlanarArc {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    idx: number;
}

function buildDirectedEdgeArcs(
    edges: ReadonlyArray<{ x1: number; y1: number; x2: number; y2: number }>,
): DirectedEdgeArc[] {
    const arcs: DirectedEdgeArc[] = [];
    for (let i = 0; i < edges.length; i++) {
        const edge = edges[i]!;
        const forwardFromKey = ptKey(edge.x1, edge.y1);
        const forwardToKey = ptKey(edge.x2, edge.y2);
        const reverseFromKey = ptKey(edge.x2, edge.y2);
        const reverseToKey = ptKey(edge.x1, edge.y1);
        arcs.push({
            physicalIdx: i,
            idx: i,
            x1: edge.x1,
            y1: edge.y1,
            x2: edge.x2,
            y2: edge.y2,
            fromKey: forwardFromKey,
            toKey: forwardToKey,
            angle: normalizePlanarAngle(Math.atan2(edge.y2 - edge.y1, edge.x2 - edge.x1)),
        });
        arcs.push({
            physicalIdx: i,
            idx: i,
            x1: edge.x2,
            y1: edge.y2,
            x2: edge.x1,
            y2: edge.y1,
            fromKey: reverseFromKey,
            toKey: reverseToKey,
            angle: normalizePlanarAngle(Math.atan2(edge.y1 - edge.y2, edge.x1 - edge.x2)),
        });
    }
    return arcs;
}

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

/** All geometry data produced by the territory geometry generator. */
export interface TerritoryGeometryData {
    cells: TerritoryCell[];
    mergedTerritories: MergedTerritory[];   // Chaikin-eligible polygons (no color yet)
    sharedEdges: SharedBorderEdge[];  // Per-segment contested borders (no color yet)
    rawSharedPolylines: SharedPolyline[]; // Chained border polylines BEFORE smoothing (for vertex matching)
    sharedPolylines: SharedPolyline[];    // Chained + Chaikin-smoothed border polylines (no color yet)
    worldBorderPolylines: SharedPolyline[]; // World-boundary edges per territory (for outer border drawing)
    enclaveMap: Map<number, [number, number][][]>;  // mergedTerritory idx → hole polygons
    fingerprint: string;
    /** Canonical frontier map — Phase 1 identity annotation. Emitted alongside existing outputs. */
    frontierMap?: import('./canonicalTypes').TerritoryFrontierMap;
}

/** A continuous closed frontier loop for one player's territory boundary. */
export interface FrontierLoop {
    points: [number, number][];
    ownerId: string;
}

// ---------------------------------------------------------------------------
// Stage config
// ---------------------------------------------------------------------------

export interface TerritoryGeneratorSettings {
    starMargin: number;           // MODIFIED_VORONOI_STAR_MARGIN
    corridorEnabled: boolean;     // MODIFIED_VORONOI_CORRIDOR_ENABLED
    corridorSpacing: number;      // MODIFIED_VORONOI_CORRIDOR_SPACING
    cxCount: number;              // TERRITORY_CX_COUNT — vstars per lane (0 = auto)
    cxWeight: number;             // TERRITORY_CX_WEIGHT — weight multiplier (0.0-2.0)
    disconnectEnabled: boolean;   // MODIFIED_VORONOI_DISCONNECT_ENABLED
    disconnectDistance: number;   // MODIFIED_VORONOI_DISCONNECT_DISTANCE
    dxWeight: number;             // TERRITORY_DX_WEIGHT — weight multiplier (0.0-2.0)
    clusterSplit: boolean;        // TERRITORY_CLUSTER_SPLIT
    chaikinPasses: number;        // VORONOI_BORDER_SMOOTH (0-5) — geometry smoothing
    frontierResolution: number;   // FRONTIER_RESOLUTION — vertex spacing in px (1-20)
    boundaryPad: number;          // CHAIKIN_BOUNDARY_PAD — world-clip padding in px (default 50)
    boundaryEps: number;          // CHAIKIN_BOUNDARY_EPS — boundary proximity threshold in px (default 6)
    worldWidth: number;
    worldHeight: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

export function edgeKey(x1: number, y1: number, x2: number, y2: number): string {
    const ax = +x1.toFixed(2), ay = +y1.toFixed(2);
    const bx = +x2.toFixed(2), by = +y2.toFixed(2);
    if (ax < bx || (ax === bx && ay < by)) return `${ax},${ay}-${bx},${by}`;
    return `${bx},${by}-${ax},${ay}`;
}

export function ptKey(x: number, y: number): string {
    return `${+x.toFixed(2)},${+y.toFixed(2)}`;
}

/**
 * Resample a CLOSED polygon so vertices are spaced ~`spacingPx` pixels apart.
 * Walks the perimeter at equal arc-length intervals.
 * Returns the resampled points (closed — last point ≈ first point).
 */
function resampleClosedPolygonBySpacing(pts: [number, number][], spacingPx: number): [number, number][] {
    if (pts.length < 3 || spacingPx <= 0) return pts;

    // Ensure closed
    const first = pts[0], last = pts[pts.length - 1];
    const isClosed = Math.abs(first[0] - last[0]) < 0.01 && Math.abs(first[1] - last[1]) < 0.01;
    const closed = isClosed ? pts : [...pts, [first[0], first[1]] as [number, number]];

    // Compute cumulative arc lengths
    const segCount = closed.length - 1;
    const cumLen: number[] = [0];
    for (let i = 1; i < closed.length; i++) {
        const dx = closed[i][0] - closed[i - 1][0];
        const dy = closed[i][1] - closed[i - 1][1];
        cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const totalLen = cumLen[segCount];
    if (totalLen < spacingPx * 2) return pts; // too small to resample

    const n = Math.max(4, Math.round(totalLen / spacingPx));
    const step = totalLen / n;
    const result: [number, number][] = [];
    let segIdx = 0;

    for (let i = 0; i < n; i++) {
        const targetLen = i * step;

        // Advance segment index to contain targetLen
        while (segIdx < segCount - 1 && cumLen[segIdx + 1] < targetLen) segIdx++;

        const segStart = cumLen[segIdx];
        const segEnd = cumLen[segIdx + 1];
        const segLen = segEnd - segStart;
        const t = segLen > 0 ? (targetLen - segStart) / segLen : 0;

        result.push([
            closed[segIdx][0] + (closed[segIdx + 1][0] - closed[segIdx][0]) * t,
            closed[segIdx][1] + (closed[segIdx + 1][1] - closed[segIdx][1]) * t,
        ]);
    }

    // Close the polygon
    result.push([result[0][0], result[0][1]]);
    return result;
}

/**
 * Chaikin corner-cutting subdivision for OPEN polylines.
 * Preserves endpoints. Interior corners smoothed by 25/75 cut pairs.
 * This is a GEOMETRY operation — it changes world-coordinate positions.
 */
export function chaikinSmoothPolyline(pts: [number, number][], passes: number): [number, number][] {
    if (passes <= 0 || pts.length < 3) return pts;
    let current = pts;
    for (let iter = 0; iter < passes; iter++) {
        const n = current.length;
        const next: [number, number][] = [current[0]];
        for (let i = 0; i < n - 1; i++) {
            const [ax, ay] = current[i];
            const [bx, by] = current[i + 1];
            if (i === 0) {
                next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
            } else if (i === n - 2) {
                next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
            } else {
                next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
                next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
            }
        }
        next.push(current[n - 1]);
        current = next;
    }
    return current;
}

/**
 * Chaikin corner-cutting for CLOSED polygons.
 * Every edge including last→first is uniformly cut.
 * This is a GEOMETRY operation — it changes world-coordinate positions.
 *
 * Boundary-pinned variant: vertices that lie on the world-clip boundary
 * (within `eps` of the padded rectangle) are preserved each pass instead
 * of being replaced by cut points. This prevents fill polygons from pulling
 * away from world edges while interior corners still smooth naturally.
 *
 * Junction-pinned variant: caller may pass a Set of ptKey strings for
 * Voronoi junction vertices (shared by 3+ cells). These are also preserved,
 * preventing fill gaps at 3-way territory junctions.
 */
export function chaikinSmoothPolygon(
    pts: [number, number][],
    passes: number,
    worldW: number = Infinity,
    worldH: number = Infinity,
    pad: number = 50,
    pinnedPtKeys?: Set<string>,
    boundaryEps: number = 6,
): [number, number][] {
    if (passes <= 0 || pts.length < 3) return pts;
    const hasBounds = isFinite(worldW) && isFinite(worldH);
    const eps = boundaryEps;

    function isPinned(x: number, y: number): boolean {
        if (hasBounds && (
            x <= -pad + eps || x >= worldW + pad - eps ||
            y <= -pad + eps || y >= worldH + pad - eps
        )) return true;
        if (pinnedPtKeys?.has(ptKey(x, y))) return true;
        return false;
    }

    let current = pts;
    for (let iter = 0; iter < passes; iter++) {
        const n = current.length;
        const next: [number, number][] = [];
        for (let i = 0; i < n; i++) {
            const [ax, ay] = current[i];
            const [bx, by] = current[(i + 1) % n];
            const aPin = isPinned(ax, ay);
            const bPin = isPinned(bx, by);
            // Pinned vertex: emit as-is instead of cut point
            next.push(aPin ? [ax, ay] : [ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
            next.push(bPin ? [bx, by] : [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
        }
        current = next;
    }
    return current;
}

/**
 * Compute the set of Voronoi junction vertices — points shared by 3+ cells.
 * At these points, 3+ territory fills meet. Without pinning, Chaikin would
 * cut all three corners and leave a visible triangular gap.
 */
export function extractJunctionVertices(cells: TerritoryCell[]): Set<string> {
    const vertexCount = new Map<string, number>();
    for (const cell of cells) {
        const seen = new Set<string>();
        for (const [x, y] of cell.points) {
            const k = ptKey(x, y);
            if (!seen.has(k)) {
                seen.add(k);
                vertexCount.set(k, (vertexCount.get(k) ?? 0) + 1);
            }
        }
    }
    const junctions = new Set<string>();
    for (const [k, count] of vertexCount) {
        if (count >= 3) junctions.add(k);
    }
    return junctions;
}

/**
 * Extract world-boundary edges from merged territory polygons.
 * Returns territory-colored SharedPolylines for each continuous run of edges
 * that lie on the same world-clip boundary. Points are snapped to the ACTUAL
 * world boundary (0/worldW/0/worldH) so they appear on screen, not at the
 * padded clip position.
 */
export function extractWorldBorderPolylines(
    territories: MergedTerritory[],
    worldW: number,
    worldH: number,
    pad: number = 50,
): SharedPolyline[] {
    const eps = 8;
    const result: SharedPolyline[] = [];

    /** Which boundary a point is on (falsy = interior). */
    function boundaryOf(x: number, y: number): 'left' | 'right' | 'top' | 'bottom' | null {
        if (x <= -pad + eps) return 'left';
        if (x >= worldW + pad - eps) return 'right';
        if (y <= -pad + eps) return 'top';
        if (y >= worldH + pad - eps) return 'bottom';
        return null;
    }

    /** Snap a point from padded boundary to actual world edge. */
    function snap(x: number, y: number): [number, number] {
        if (x <= -pad + eps) return [0, Math.max(0, Math.min(worldH, y))];
        if (x >= worldW + pad - eps) return [worldW, Math.max(0, Math.min(worldH, y))];
        if (y <= -pad + eps) return [Math.max(0, Math.min(worldW, x)), 0];
        if (y >= worldH + pad - eps) return [Math.max(0, Math.min(worldW, x)), worldH];
        return [x, y];
    }

    for (const territory of territories) {
        const pts = territory.points;
        const n = pts.length;
        if (n < 2) continue;

        // Collect boundary-edge indices: both endpoints on same world-clip boundary
        const boundaryEdges: number[] = [];
        for (let i = 0; i < n; i++) {
            const [ax, ay] = pts[i];
            const [bx, by] = pts[(i + 1) % n];
            const ba = boundaryOf(ax, ay);
            const bb = boundaryOf(bx, by);
            if (ba !== null && ba === bb) {
                boundaryEdges.push(i);
            }
        }
        if (boundaryEdges.length === 0) continue;

        // Chain consecutive boundary edges into continuous runs
        // Handle wrap-around at polygon end→start
        const runs: Array<[number, number][]> = [];
        let run: [number, number][] = [];

        for (let j = 0; j < boundaryEdges.length; j++) {
            const ei = boundaryEdges[j];
            const prevEi = j === 0 ? -2 : boundaryEdges[j - 1];
            const [ax, ay] = pts[ei];
            const [bx, by] = pts[(ei + 1) % n];
            const snapA = snap(ax, ay);
            const snapB = snap(bx, by);

            if (ei === prevEi + 1 && run.length > 0) {
                run.push(snapB);
            } else {
                if (run.length >= 2) runs.push(run);
                run = [snapA, snapB];
            }
        }
        if (run.length >= 2) runs.push(run);

        for (const r of runs) {
            result.push({
                points: r,
                ownerPairKey: `${territory.ownerId}|world`,
                color: territory.color,
            });
        }
    }
    return result;
}

export function extractSharedEdges(cells: TerritoryCell[]): SharedBorderEdge[] {
    const edgeOwners = new Map<string, {
        sides: { ownerId: string; siteId: string }[];
        pts: [number, number, number, number];
    }>();

    for (const cell of cells) {
        const pts = cell.points;
        for (let j = 0; j < pts.length - 1; j++) {
            const key = edgeKey(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
            if (!edgeOwners.has(key)) {
                edgeOwners.set(key, {
                    sides: [{ ownerId: cell.ownerId, siteId: cell.siteId }],
                    pts: [pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]],
                });
            } else {
                const entry = edgeOwners.get(key)!;
                if (!entry.sides.some(s => s.siteId === cell.siteId)) {
                    entry.sides.push({ ownerId: cell.ownerId, siteId: cell.siteId });
                }
            }
        }
    }

    const shared: SharedBorderEdge[] = [];
    for (const [, entry] of edgeOwners) {
        if (entry.sides.length === 2 &&
            entry.sides[0].ownerId !== entry.sides[1].ownerId &&
            entry.sides[0].ownerId !== DISCONNECT_OWNER_ID &&
            entry.sides[1].ownerId !== DISCONNECT_OWNER_ID) {
            shared.push({
                x1: entry.pts[0], y1: entry.pts[1],
                x2: entry.pts[2], y2: entry.pts[3],
                ownerA: entry.sides[0].ownerId,
                ownerB: entry.sides[1].ownerId,
                colorA: 0,
                colorB: 0,
                siteIdA: entry.sides[0].siteId,
                siteIdB: entry.sides[1].siteId,
            });
        }
    }
    return shared;
}

export function mergeSameOwnerCells(
    cells: TerritoryCell[],
    clusterSplit: boolean,
    clusterMap: Map<string, number>,
): MergedTerritory[] {
    const clusterKeyOf = (cell: TerritoryCell) => {
        const cIdx = clusterMap.get(cell.siteId) ?? 0;
        return clusterSplit ? `${cell.ownerId}:${cIdx}` : cell.ownerId;
    };

    // Pass 1: count how many times each edge appears, and which clusters see it
    const edgeCount = new Map<string, number>();
    const edgeClusters = new Map<string, Set<string>>();

    for (const cell of cells) {
        const ck = clusterKeyOf(cell);
        const pts = cell.points;
        for (let j = 0; j < pts.length - 1; j++) {
            const key = edgeKey(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
            edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
            if (!edgeClusters.has(key)) edgeClusters.set(key, new Set());
            edgeClusters.get(key)!.add(ck);
        }
    }

    // Pass 2: collect EXTERNAL edges per cluster.
    // Rule: skip edges where count>=2 AND only one cluster sees them — these are
    // internal shared edges between cells of the same owner (interior, should be dissolved).
    // Keep: world boundary edges (count=1) AND contested borders (clusters.size>=2).
    type DEdge = { x1: number; y1: number; x2: number; y2: number };
    const clusterEdges = new Map<string, DEdge[]>();
    const clusterOwnerMap = new Map<string, string>();
    const clusterStarIds = new Map<string, Set<string>>();

    for (const cell of cells) {
        const ck = clusterKeyOf(cell);
        if (!clusterEdges.has(ck)) clusterEdges.set(ck, []);
        if (!clusterOwnerMap.has(ck)) clusterOwnerMap.set(ck, cell.ownerId);
        if (!clusterStarIds.has(ck)) clusterStarIds.set(ck, new Set());
        clusterStarIds.get(ck)!.add(cell.siteId);

        const pts = cell.points;
        for (let j = 0; j < pts.length - 1; j++) {
            const key = edgeKey(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
            const cnt = edgeCount.get(key) ?? 0;
            const clusters = edgeClusters.get(key)!;
            // Internal edge: shared by 2+ cells all belonging to this same cluster → skip
            if (cnt >= 2 && clusters.size === 1) continue;
            clusterEdges.get(ck)!.push({
                x1: pts[j][0], y1: pts[j][1],
                x2: pts[j + 1][0], y2: pts[j + 1][1],
            });
        }
    }

    // Pass 3: chain edges into closed polygon rings per cluster.
    // Uses bidirectional adjacency with EDGE INDEX tracking (not vertex marks)
    // so that junctions with degree > 2 are correctly handled for multi-star territories.
    const result: MergedTerritory[] = [];

    for (const [ck, edges] of clusterEdges) {
        const ownerId = clusterOwnerMap.get(ck) ?? ck.split(':')[0];
        if (ownerId === DISCONNECT_OWNER_ID) continue;
        if (edges.length === 0) continue;

        const adjacency = buildSortedOutgoingArcMap(buildDirectedEdgeArcs(edges));

        const used = new Set<number>();
        for (let start = 0; start < edges.length; start++) {
            if (used.has(start)) continue;
            const e0 = edges[start];
            used.add(start);
            const chain: [number, number][] = [[e0.x1, e0.y1], [e0.x2, e0.y2]];
            const startPt = ptKey(e0.x1, e0.y1);
            let curEnd = ptKey(e0.x2, e0.y2);
            let currentArc: DirectedEdgeArc = {
                physicalIdx: start,
                idx: start,
                x1: e0.x1,
                y1: e0.y1,
                x2: e0.x2,
                y2: e0.y2,
                fromKey: startPt,
                toKey: curEnd,
                angle: normalizePlanarAngle(Math.atan2(e0.y2 - e0.y1, e0.x2 - e0.x1)),
            };
            let safety = edges.length * 2;

            while (curEnd !== startPt && safety-- > 0) {
                const nextArc = pickClockwiseAdjacentArc({
                    adjacency,
                    current: currentArc,
                    isAvailable: (arc) => !used.has(arc.idx),
                });
                if (!nextArc) break;
                used.add(nextArc.idx);
                curEnd = nextArc.toKey;
                chain.push([nextArc.x2, nextArc.y2]);
                currentArc = nextArc;
            }

            if (chain.length >= 3) {
                const dx = Math.abs(chain[0][0] - chain[chain.length - 1][0]);
                const dy = Math.abs(chain[0][1] - chain[chain.length - 1][1]);
                const nearClosed =
                    dx <= LOOP_CLOSURE_TOLERANCE_PX &&
                    dy <= LOOP_CLOSURE_TOLERANCE_PX;
                if (nearClosed && (dx > 0.01 || dy > 0.01)) {
                    chain.push([chain[0][0], chain[0][1]]);
                }
                if (
                    chain[0][0] === chain[chain.length - 1][0] &&
                    chain[0][1] === chain[chain.length - 1][1]
                ) {
                    result.push({ points: chain as [number, number][], ownerId, color: 0, starIds: [...(clusterStarIds.get(ck) ?? [])] });
                }
            }
        }
    }

    log.renderer('PVV2Stage', `mergeSameOwnerCells: ${cells.length} cells -> ${result.length} merged polygons for ${clusterEdges.size} clusters`);
    return result;
}


/**
 * Construct closed fill polygons by chaining frontier polylines at junction vertices.
 *
 * Each SharedPolyline carries ownership (ownerPairKey = 'A|B').
 * Each WorldBorderPolyline carries ownership (ownerPairKey = 'owner|world').
 * Polyline endpoints sit at junction vertices shared with other polylines.
 *
 * Delegates to the shared chainWalkCore for the actual walk, then flattens
 * the rich result into legacy MergedTerritory[] format.
 *
 * Result: fill polygons using the EXACT same smoothed vertices as border polylines.
 */
export function constructFillsFromFrontierChain(
    sharedPolylines: SharedPolyline[],
    worldBorderPolylines: SharedPolyline[],
    cells: TerritoryCell[] = [],
): MergedTerritory[] {
    const walkResult = executeChainWalk(sharedPolylines, worldBorderPolylines);

    // Flatten each walk loop into a MergedTerritory
    const result: MergedTerritory[] = [];
    let droppedOpenLoopCount = 0;
    let repairedNearClosedLoopCount = 0;
    for (const loop of walkResult.loops) {
        const chain = flattenLoopPoints(loop);
        if (chain.length < 3) continue;

        const first = chain[0];
        const last = chain[chain.length - 1];
        const dx = Math.abs(first[0] - last[0]);
        const dy = Math.abs(first[1] - last[1]);
        const nearClosed =
            dx <= LOOP_CLOSURE_TOLERANCE_PX &&
            dy <= LOOP_CLOSURE_TOLERANCE_PX;

        if (!loop.closed && !nearClosed) {
            droppedOpenLoopCount += 1;
            continue;
        }

        const points =
            loop.closed || (dx < 0.01 && dy < 0.01)
                ? chain
                : [...chain, [first[0], first[1]] as [number, number]];

        if (!loop.closed && nearClosed) {
            repairedNearClosedLoopCount += 1;
        }

        result.push({
            points,
            ownerId: loop.ownerId,
            color: 0,
            starIds: [],
        });
    }

    if (droppedOpenLoopCount > 0 || repairedNearClosedLoopCount > 0) {
        log.renderer(
            'PVV2Stage',
            `CHAIN WALK FILTER | droppedOpen=${droppedOpenLoopCount} repairedNearClosed=${repairedNearClosedLoopCount} kept=${result.length}`,
        );
    }

    // Populate starIds from cells using graph ownership (not geometric approximation).
    // Group cells by ownerId. For single-territory owners, assign directly.
    // For multi-territory owners (disconnected regions), use BFS on cell adjacency graph.
    if (cells.length > 0 && result.length > 0) {
        // Build map: ownerId → list of fill indices
        const ownerFillIndices = new Map<string, number[]>();
        for (let fi = 0; fi < result.length; fi++) {
            const arr = ownerFillIndices.get(result[fi].ownerId) ?? [];
            arr.push(fi);
            ownerFillIndices.set(result[fi].ownerId, arr);
        }

        // Build map: ownerId → list of cells
        const ownerCells = new Map<string, TerritoryCell[]>();
        for (const cell of cells) {
            const arr = ownerCells.get(cell.ownerId) ?? [];
            arr.push(cell);
            ownerCells.set(cell.ownerId, arr);
        }

        // Build cell adjacency graph from shared polygon edges (graph-native).
        // Two cells are neighbors if they share ≥2 consecutive polygon vertices (a Voronoi edge).
        const cellNeighbors = new Map<string, Set<string>>();
        const edgeToCell = new Map<string, string[]>(); // "x1,y1|x2,y2" → [siteId, ...]
        for (const cell of cells) {
            cellNeighbors.set(cell.siteId, new Set());
            const pts = cell.points;
            for (let i = 0; i < pts.length - 1; i++) {
                // Normalize edge key: smaller coord first
                const a = `${pts[i][0].toFixed(4)},${pts[i][1].toFixed(4)}`;
                const b = `${pts[i + 1][0].toFixed(4)},${pts[i + 1][1].toFixed(4)}`;
                const ek = a < b ? `${a}|${b}` : `${b}|${a}`;
                const arr = edgeToCell.get(ek) ?? [];
                arr.push(cell.siteId);
                edgeToCell.set(ek, arr);
            }
        }
        // Cells sharing an edge are neighbors
        for (const [, siteIds] of edgeToCell) {
            for (let i = 0; i < siteIds.length; i++) {
                for (let j = i + 1; j < siteIds.length; j++) {
                    cellNeighbors.get(siteIds[i])?.add(siteIds[j]);
                    cellNeighbors.get(siteIds[j])?.add(siteIds[i]);
                }
            }
        }

        for (const [ownerId, fillIndices] of ownerFillIndices) {
            const oCells = ownerCells.get(ownerId) ?? [];
            if (fillIndices.length === 1) {
                // Single territory for this owner — all cells belong here
                result[fillIndices[0]].starIds = oCells.map(c => c.siteId);
            } else {
                // Multiple territories: BFS flood fill on same-owner cell adjacency
                const visited = new Set<string>();
                const components: string[][] = [];
                for (const cell of oCells) {
                    if (visited.has(cell.siteId)) continue;
                    // BFS from this cell, only following same-owner neighbors
                    const component: string[] = [];
                    const queue = [cell.siteId];
                    visited.add(cell.siteId);
                    while (queue.length > 0) {
                        const cur = queue.shift()!;
                        component.push(cur);
                        for (const nbr of cellNeighbors.get(cur) ?? []) {
                            if (visited.has(nbr)) continue;
                            // Only follow neighbors with the same owner
                            const nbrCell = oCells.find(c => c.siteId === nbr);
                            if (!nbrCell) continue;
                            visited.add(nbr);
                            queue.push(nbr);
                        }
                    }
                    components.push(component);
                }

                // Match components to fill regions by size (largest component → largest fill)
                // Sort both by size descending
                components.sort((a, b) => b.length - a.length);
                const sortedFills = [...fillIndices].sort((a, b) =>
                    result[b].points.length - result[a].points.length
                );
                for (let k = 0; k < Math.min(components.length, sortedFills.length); k++) {
                    result[sortedFills[k]].starIds = components[k];
                }
            }
        }
    }

    return result;
}





export function chainSharedEdgesIntoPolylines(
    edges: SharedBorderEdge[],
    passes: number,
): SharedPolyline[] {
    // Group by sorted owner pair
    const byPair = new Map<string, SharedBorderEdge[]>();
    for (const edge of edges) {
        const key = edge.ownerA < edge.ownerB
            ? `${edge.ownerA}|${edge.ownerB}`
            : `${edge.ownerB}|${edge.ownerA}`;
        if (!byPair.has(key)) byPair.set(key, []);
        byPair.get(key)!.push(edge);
    }

    const result: SharedPolyline[] = [];

    for (const [pairKey, pairEdges] of byPair) {
        // Build bidirectional adjacency with EDGE INDEX tracking.
        // Vertex-mark walks fail at junctions (degree > 2) — edge-index tracking
        // ensures every physical edge is consumed exactly once regardless of topology.
        const adjacency = buildSortedOutgoingArcMap(buildDirectedEdgeArcs(pairEdges));

        const used = new Set<number>();
        for (let start = 0; start < pairEdges.length; start++) {
            if (used.has(start)) continue;
            const e0 = pairEdges[start];
            used.add(start);
            const chain: [number, number][] = [[e0.x1, e0.y1], [e0.x2, e0.y2]];
            let curEnd = ptKey(e0.x2, e0.y2);
            let currentArc: DirectedEdgeArc = {
                physicalIdx: start,
                idx: start,
                x1: e0.x1,
                y1: e0.y1,
                x2: e0.x2,
                y2: e0.y2,
                fromKey: ptKey(e0.x1, e0.y1),
                toKey: curEnd,
                angle: normalizePlanarAngle(Math.atan2(e0.y2 - e0.y1, e0.x2 - e0.x1)),
            };
            let safety = pairEdges.length * 2;

            while (safety-- > 0) {
                const nextArc = pickClockwiseAdjacentArc({
                    adjacency,
                    current: currentArc,
                    isAvailable: (arc) => !used.has(arc.idx),
                });
                if (!nextArc) break;
                used.add(nextArc.idx);
                curEnd = nextArc.toKey;
                chain.push([nextArc.x2, nextArc.y2]);
                currentArc = nextArc;
            }

            if (chain.length >= 2) {
                const smoothed = passes > 0 ? chaikinSmoothPolyline(chain, passes) : chain;
                result.push({
                    points: smoothed,
                    ownerPairKey: pairKey,
                    color: 0,
                });
            }
        }
    }
    return result;
}



export function detectEnclaves(merged: MergedTerritory[]): Map<number, [number, number][][]> {
    function pointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
        let inside = false;
        const n = polygon.length;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = polygon[i][0], yi = polygon[i][1];
            const xj = polygon[j][0], yj = polygon[j][1];
            if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    function centroid(pts: [number, number][]): [number, number] {
        let cx = 0, cy = 0;
        const len = pts.length > 0 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]
            ? pts.length - 1 : pts.length;
        for (let i = 0; i < len; i++) { cx += pts[i][0]; cy += pts[i][1]; }
        return len > 0 ? [cx / len, cy / len] : [0, 0];
    }

    const enclaveMap = new Map<number, [number, number][][]>();
    for (let outerIdx = 0; outerIdx < merged.length; outerIdx++) {
        const outer = merged[outerIdx];
        const holes: [number, number][][] = [];
        for (let innerIdx = 0; innerIdx < merged.length; innerIdx++) {
            if (innerIdx === outerIdx) continue;
            const inner = merged[innerIdx];
            if (inner.ownerId === outer.ownerId) continue;
            const [cx, cy] = centroid(inner.points);
            if (pointInPolygon(cx, cy, outer.points)) {
                holes.push(inner.points);
            }
        }
        if (holes.length > 0) enclaveMap.set(outerIdx, holes);
    }
    return enclaveMap;
}

export function buildTerritoryGeometryFingerprint(stars: StarState[], config: TerritoryGeneratorSettings): string {
    let fp = 'pvv2:';
    for (const s of stars) fp += `${s.id}:${s.ownerId ?? ''}|`;
    fp += `:m${config.starMargin}`;
    fp += `:cs${config.clusterSplit ? 1 : 0}`;
    fp += `:ce${config.corridorEnabled ? 1 : 0}`;
    fp += `:csp${config.corridorSpacing}`;
    fp += `:cxN${config.cxCount}`;
    fp += `:cxW${config.cxWeight}`;
    fp += `:de${config.disconnectEnabled ? 1 : 0}`;
    fp += `:dd${config.disconnectDistance}`;
    fp += `:dxW${config.dxWeight}`;
    fp += `:ch${config.chaikinPasses}`;
    return fp;
}

// ---------------------------------------------------------------------------
// Main stage entry point
// ---------------------------------------------------------------------------

/**
 * Execute the PVV2 geometry stage.
 * Inputs: stars + connections + world bounds + config from GAME_CONFIG.
 * Returns TerritoryGeometryData on success, CompileError on failure.
 * Never throws. Never returns partial data. Never imports PIXI.
 */
export function generateVoronoiTerritoryGeometry(
    stars: StarState[],
    connections: StarConnection[],
    config: TerritoryGeneratorSettings,
): TerritoryGeometryData | CompileError {
    try {
        const { starMargin, worldWidth, worldHeight } = config;

        const ownedStars = stars.filter(s => s.ownerId);
        if (ownedStars.length < 2) {
            return {
                kind: 'error',
                stage: 'metric',
                message: 'PVV2: fewer than 2 owned stars — cannot compute power diagram',
                recoverable: true,
            } satisfies CompileError;
        }

        // Stage 0: Build site array
        const sites: PowerSite[] = ownedStars.map(s => ({
            x: s.x,
            y: s.y,
            weight: starMargin * starMargin,
            ownerId: s.ownerId!,
            starId: s.id,
        }));

        if (config.corridorEnabled) {
            const corridorVirtuals = computeCorridorVirtuals(ownedStars, connections, config.corridorSpacing, config.cxWeight, config.cxCount || undefined);
            for (const cv of corridorVirtuals) {
                sites.push({
                    x: cv.x, y: cv.y,
                    weight: starMargin * starMargin * cv.weight,
                    ownerId: cv.ownerId,
                    starId: `corridor_${cv.sourceStarA}_${cv.sourceStarB}`,
                    virtual: 'corridor',
                });
            }
        }

        if (config.disconnectEnabled) {
            const disconnectVirtuals = computeDisconnectVirtuals(ownedStars, stars, connections, config.disconnectDistance, config.dxWeight);
            for (const dv of disconnectVirtuals) {
                sites.push({
                    x: dv.x, y: dv.y,
                    weight: starMargin * starMargin * dv.weight,
                    ownerId: DISCONNECT_OWNER_ID,
                    starId: `disconnect_${dv.sourceStarA}_${dv.sourceStarB}`,
                    virtual: 'disconnect',
                });
            }
        }

        // Stage 1: Power diagram
        const pad = config.boundaryPad;
        const clip: [number, number][] = [
            [-pad, -pad],
            [worldWidth + pad, -pad],
            [worldWidth + pad, worldHeight + pad],
            [-pad, worldHeight + pad],
        ];

        let polygons: any[];
        try {
            const wv = weightedVoronoi()
                .x((d: PowerSite) => d.x)
                .y((d: PowerSite) => d.y)
                .weight((d: PowerSite) => d.weight)
                .clip(clip);
            polygons = wv(sites);
        } catch (e) {
            return {
                kind: 'error',
                stage: 'metric',
                message: `PVV2: d3-weighted-voronoi crashed: ${e}`,
                recoverable: false,
            } satisfies CompileError;
        }

        // Convert to TerritoryCell array
        const cells: TerritoryCell[] = [];
        for (let i = 0; i < polygons.length; i++) {
            const poly = polygons[i];
            if (!poly || poly.length < 3) continue;
            const site = (poly as any).site?.originalObject as PowerSite | undefined;
            if (!site) continue;

            let effectiveOwner = site.ownerId;
            if (site.ownerId === DISCONNECT_OWNER_ID) {
                const parts = site.starId.split('_');
                const sourceStarA = parts[1];
                const sourceOwner = ownedStars.find(s => s.id === sourceStarA)?.ownerId;
                let nearestDist = Infinity;
                let nearestOwner = '';
                for (const s of ownedStars) {
                    if (s.ownerId === sourceOwner) continue;
                    const d = (s.x - site.x) ** 2 + (s.y - site.y) ** 2;
                    if (d < nearestDist) { nearestDist = d; nearestOwner = s.ownerId!; }
                }
                if (!nearestOwner) {
                    effectiveOwner = sourceOwner ?? '';
                    if (!effectiveOwner) continue;
                } else {
                    effectiveOwner = nearestOwner;
                }
            }

            const pts: [number, number][] = poly.map((p: number[]) => [p[0], p[1]] as [number, number]);
            if (pts.length > 0 && (pts[0][0] !== pts[pts.length - 1][0] || pts[0][1] !== pts[pts.length - 1][1])) {
                pts.push([pts[0][0], pts[0][1]]);
            }
            cells.push({ points: pts, ownerId: effectiveOwner, siteId: site.starId });
        }

        log.renderer('PVV2Stage', `INPUT: ${stars.length} stars, ${ownedStars.length} owned, ${sites.length} total sites built | corridorEnabled=${config.corridorEnabled} disconnectEnabled=${config.disconnectEnabled} chaikinPasses=${config.chaikinPasses}`);
        log.renderer('PVV2Stage', `VORONOI OUTPUT: ${polygons.length} raw polygons -> ${cells.length} valid cells`);

        // Stage 2a: Extract junction vertices (points shared by 3+ cells)
        // These are pinned during Chaikin to prevent gaps at 3-way territory junctions.
        const junctionPts = config.chaikinPasses > 0 ? extractJunctionVertices(cells) : new Set<string>();
        log.renderer('PVV2Stage', `JUNCTIONS: ${junctionPts.size} pinned vertices`);
        // Stage 2: Extract shared edges (before merge removes internal edges)
        const sharedEdges = extractSharedEdges(cells);
        log.renderer('PVV2Stage', `EDGES: ${sharedEdges.length} contested edges across ${new Set(sharedEdges.map(e => [e.ownerA, e.ownerB].sort().join('|'))).size} owner pairs`);


        // Stage 3: Build cluster map
        const clusterMap = new Map<string, number>();
        if (config.clusterSplit) {
            const starById = new Map(ownedStars.map(s => [s.id, s]));
            const clusters = findConnectedClustersOptimized(ownedStars, connections, starById);
            for (const [starId, info] of clusters) {
                clusterMap.set(starId, info.clusterIdx);
            }
            for (const site of sites) {
                if (site.virtual === 'corridor') {
                    const sourceId = site.starId.split('_')[1];
                    const srcCluster = clusterMap.get(sourceId);
                    if (srcCluster !== undefined) clusterMap.set(site.starId, srcCluster);
                }
            }
        }

        // Stage 4: Merge same-owner cells
        const mergedRaw = mergeSameOwnerCells(cells, config.clusterSplit, clusterMap);

        // Stage 5: Chain shared edges → smoothed polylines (Chaikin = geometry)
        const rawSharedPolylines = chainSharedEdgesIntoPolylines(sharedEdges, 0);
        const sharedPolylines = chainSharedEdgesIntoPolylines(sharedEdges, config.chaikinPasses);
        log.renderer('PVV2Stage', `POLYLINES: ${sharedPolylines.length} border polylines | pts: ${sharedPolylines.map(p => `${p.ownerPairKey}:${p.points.length}`).join(' ')}`);

        // Stage 7: Extract world-boundary border polylines from RAW merged territories
        const worldBorderPolylines = extractWorldBorderPolylines(mergedRaw, config.worldWidth, config.worldHeight);
        log.renderer('PVV2Stage', `WORLD BORDERS: ${worldBorderPolylines.length} boundary polylines`);

        // Stage 8: Construct fill polygons by chaining frontier polylines at junction vertices.
        // Each polyline carries ownership. Fills use the EXACT same smoothed vertices as borders.
        // Eliminates fill/border geometry divergence (B-42).
        const mergedTerritories = constructFillsFromFrontierChain(sharedPolylines, worldBorderPolylines, cells);
        log.renderer('PVV2Stage', `FRONTIER CHAIN FILLS: ${mergedTerritories.length} fill regions`);

        log.renderer('PVV2Stage', `MERGED: ${mergedTerritories.length} territories | chaikinPasses=${config.chaikinPasses} | pts: ${mergedTerritories.map((t: MergedTerritory) => `${t.ownerId}:${t.points.length}`).join(' ')}`);

        // Stage 9: Detect enclaves using the finalized mergedTerritories so indices match renderer expectations.
        const enclaveMapFinal = detectEnclaves(mergedTerritories);
        log.renderer('PVV2Stage', `ENCLAVES: ${enclaveMapFinal.size} | COMPLETE`);

        const fingerprint = buildTerritoryGeometryFingerprint(stars, config);

        return {
            cells,
            mergedTerritories,
            sharedEdges,
            rawSharedPolylines,
            sharedPolylines,
            worldBorderPolylines,
            enclaveMap: enclaveMapFinal,
            fingerprint,
        } satisfies TerritoryGeometryData;

    } catch (err) {
        return {
            kind: 'error',
            stage: 'metric',
            message: err instanceof Error ? err.message : String(err),
            recoverable: false,
        } satisfies CompileError;
    }
}
