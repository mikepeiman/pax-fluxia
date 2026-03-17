/**
 * territory/compiler/pvv2MetricStage.ts
 *
 * Stage: PVV2 Weighted-Voronoi Geometry
 *
 * Extracts the d3-weighted-voronoi geometry pipeline from PowerVoronoiRenderer
 * into a standalone compiler stage. Produces typed geometry data; never renders.
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
 * - Returns typed PVV2GeometryData | CompileError — never throws, never fabricates geometry
 */

import { weightedVoronoi } from 'd3-weighted-voronoi';
import type { StarState, StarConnection } from '$lib/types/game.types';
import { computeCorridorVirtuals, computeDisconnectVirtuals, DISCONNECT_OWNER_ID } from '$lib/renderers/territoryFeatures';
import { findConnectedClustersOptimized } from '$lib/renderers/territoryUtils';
import { log } from '$lib/utils/logger';
import type { CompileError } from './types';

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

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

/** All geometry data produced by the PVV2 compiler stage. */
export interface PVV2GeometryData {
    cells: TerritoryCell[];
    mergedTerritories: MergedTerritory[];   // Chaikin-eligible polygons (no color yet)
    sharedEdges: SharedBorderEdge[];  // Per-segment contested borders (no color yet)
    rawSharedPolylines: SharedPolyline[]; // Chained border polylines BEFORE smoothing (for vertex matching)
    sharedPolylines: SharedPolyline[];    // Chained + Chaikin-smoothed border polylines (no color yet)
    worldBorderPolylines: SharedPolyline[]; // World-boundary edges per territory (for outer border drawing)
    enclaveMap: Map<number, [number, number][][]>;  // mergedTerritory idx → hole polygons
    fingerprint: string;
}

// ---------------------------------------------------------------------------
// Stage config
// ---------------------------------------------------------------------------

export interface PVV2StageConfig {
    starMargin: number;           // MODIFIED_VORONOI_STAR_MARGIN
    corridorEnabled: boolean;     // MODIFIED_VORONOI_CORRIDOR_ENABLED
    corridorSpacing: number;      // MODIFIED_VORONOI_CORRIDOR_SPACING
    disconnectEnabled: boolean;   // MODIFIED_VORONOI_DISCONNECT_ENABLED
    disconnectDistance: number;   // MODIFIED_VORONOI_DISCONNECT_DISTANCE
    clusterSplit: boolean;        // TERRITORY_CLUSTER_SPLIT
    chaikinPasses: number;        // VORONOI_BORDER_SMOOTH (0-5) — geometry smoothing
    worldWidth: number;
    worldHeight: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function edgeKey(x1: number, y1: number, x2: number, y2: number): string {
    const ax = +x1.toFixed(2), ay = +y1.toFixed(2);
    const bx = +x2.toFixed(2), by = +y2.toFixed(2);
    if (ax < bx || (ax === bx && ay < by)) return `${ax},${ay}-${bx},${by}`;
    return `${bx},${by}-${ax},${ay}`;
}

function ptKey(x: number, y: number): string {
    return `${+x.toFixed(2)},${+y.toFixed(2)}`;
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
 */
export function chaikinSmoothPolygon(
    pts: [number, number][],
    passes: number,
    worldW: number = Infinity,
    worldH: number = Infinity,
    pad: number = 50,
): [number, number][] {
    if (passes <= 0 || pts.length < 3) return pts;
    const eps = 6; // proximity threshold for "on boundary"
    const hasBounds = isFinite(worldW) && isFinite(worldH);

    function isPinned(x: number, y: number): boolean {
        if (!hasBounds) return false;
        return (
            x <= -pad + eps || x >= worldW + pad - eps ||
            y <= -pad + eps || y >= worldH + pad - eps
        );
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
            // Near-boundary vertex: emit it as-is instead of the cut point
            next.push(aPin ? [ax, ay] : [ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
            next.push(bPin ? [bx, by] : [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
        }
        current = next;
    }
    return current;
}

/**
 * Extract world-boundary edges from merged territory polygons.
 * Returns SharedPolylines for each continuous run of edges that lie on the
 * same world-clip boundary (left/right/top/bottom). These can be drawn as
 * closed outer borders to visually frame the territory map.
 */
export function extractWorldBorderPolylines(
    territories: MergedTerritory[],
    worldW: number,
    worldH: number,
    pad: number = 50,
): SharedPolyline[] {
    const eps = 8;
    const result: SharedPolyline[] = [];

    function onSameBoundary(ax: number, ay: number, bx: number, by: number): boolean {
        return (
            (ax <= -pad + eps && bx <= -pad + eps) || // left
            (ax >= worldW + pad - eps && bx >= worldW + pad - eps) || // right
            (ay <= -pad + eps && by <= -pad + eps) || // top
            (ay >= worldH + pad - eps && by >= worldH + pad - eps)    // bottom
        );
    }

    for (const territory of territories) {
        const pts = territory.points;
        const n = pts.length;
        if (n < 2) continue;

        // Collect all boundary edge indices
        const boundaryEdges: number[] = [];
        for (let i = 0; i < n; i++) {
            const [ax, ay] = pts[i];
            const [bx, by] = pts[(i + 1) % n];
            if (onSameBoundary(ax, ay, bx, by)) {
                boundaryEdges.push(i);
            }
        }
        if (boundaryEdges.length === 0) continue;

        // Chain consecutive boundary edges into continuous polylines
        let run: [number, number][] = [];
        let lastIdx = -2;
        for (const ei of boundaryEdges) {
            const [ax, ay] = pts[ei];
            const [bx, by] = pts[(ei + 1) % n];
            if (ei === lastIdx + 1 && run.length > 0) {
                run.push([bx, by]);
            } else {
                if (run.length >= 2) {
                    result.push({ points: run, ownerPairKey: `${territory.ownerId}|world`, color: territory.color });
                }
                run = [[ax, ay], [bx, by]];
            }
            lastIdx = ei;
        }
        if (run.length >= 2) {
            result.push({ points: run, ownerPairKey: `${territory.ownerId}|world`, color: territory.color });
        }
    }
    return result;
}

function extractSharedEdges(cells: TerritoryCell[]): SharedBorderEdge[] {
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

function mergeSameOwnerCells(
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

    for (const cell of cells) {
        const ck = clusterKeyOf(cell);
        if (!clusterEdges.has(ck)) clusterEdges.set(ck, []);
        if (!clusterOwnerMap.has(ck)) clusterOwnerMap.set(ck, cell.ownerId);

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

        // Build bidirectional adjacency: each physical edge adds two directed half-edges
        type IEdge = { x1: number; y1: number; x2: number; y2: number; idx: number };
        const allEdges: IEdge[] = [];
        for (let i = 0; i < edges.length; i++) {
            const e = edges[i];
            allEdges.push({ x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, idx: i });
            allEdges.push({ x1: e.x2, y1: e.y2, x2: e.x1, y2: e.y1, idx: i });
        }

        const adj = new Map<string, IEdge[]>();
        for (const ie of allEdges) {
            const k = ptKey(ie.x1, ie.y1);
            if (!adj.has(k)) adj.set(k, []);
            adj.get(k)!.push(ie);
        }

        const used = new Set<number>();
        for (let start = 0; start < edges.length; start++) {
            if (used.has(start)) continue;
            const e0 = edges[start];
            used.add(start);
            const chain: [number, number][] = [[e0.x1, e0.y1], [e0.x2, e0.y2]];
            const startPt = ptKey(e0.x1, e0.y1);
            let curEnd = ptKey(e0.x2, e0.y2);
            let safety = edges.length * 2;

            while (curEnd !== startPt && safety-- > 0) {
                const cands = adj.get(curEnd);
                if (!cands) break;
                let stepped = false;
                for (const c of cands) {
                    if (used.has(c.idx)) continue;
                    used.add(c.idx);
                    curEnd = ptKey(c.x2, c.y2);
                    chain.push([c.x2, c.y2]);
                    stepped = true;
                    break;
                }
                if (!stepped) break;
            }

            if (chain.length >= 3) {
                // Ensure closed polygon
                if (chain[0][0] !== chain[chain.length - 1][0] ||
                    chain[0][1] !== chain[chain.length - 1][1]) {
                    chain.push([chain[0][0], chain[0][1]]);
                }
                result.push({ points: chain as [number, number][], ownerId, color: 0 });
            }
        }
    }

    log.sys('PVV2Stage', `mergeSameOwnerCells: ${cells.length} cells -> ${result.length} merged polygons for ${clusterEdges.size} clusters`);
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
        type IEdge = { x1: number; y1: number; x2: number; y2: number; idx: number };
        const allEdges: IEdge[] = [];
        for (let i = 0; i < pairEdges.length; i++) {
            const e = pairEdges[i];
            allEdges.push({ x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, idx: i });
            allEdges.push({ x1: e.x2, y1: e.y2, x2: e.x1, y2: e.y1, idx: i });
        }

        const adj = new Map<string, IEdge[]>();
        for (const ie of allEdges) {
            const k = ptKey(ie.x1, ie.y1);
            if (!adj.has(k)) adj.set(k, []);
            adj.get(k)!.push(ie);
        }

        const used = new Set<number>();
        for (let start = 0; start < pairEdges.length; start++) {
            if (used.has(start)) continue;
            const e0 = pairEdges[start];
            used.add(start);
            const chain: [number, number][] = [[e0.x1, e0.y1], [e0.x2, e0.y2]];
            let curEnd = ptKey(e0.x2, e0.y2);
            let safety = pairEdges.length * 2;

            while (safety-- > 0) {
                const cands = adj.get(curEnd);
                if (!cands) break;
                let stepped = false;
                for (const c of cands) {
                    if (used.has(c.idx)) continue;
                    used.add(c.idx);
                    curEnd = ptKey(c.x2, c.y2);
                    chain.push([c.x2, c.y2]);
                    stepped = true;
                    break;
                }
                if (!stepped) break;
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
        log.sys('PVV2Stage', `chainSharedEdgesIntoPolylines [${pairKey}]: ${pairEdges.length} edges -> ${result.filter(r => r.ownerPairKey === pairKey).length} polylines`);
    }
    return result;
}



function detectEnclaves(merged: MergedTerritory[]): Map<number, [number, number][][]> {
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

export function buildPVV2Fingerprint(stars: StarState[], config: PVV2StageConfig): string {
    let fp = 'pvv2:';
    for (const s of stars) fp += `${s.id}:${s.ownerId ?? ''}|`;
    fp += `:m${config.starMargin}`;
    fp += `:cs${config.clusterSplit ? 1 : 0}`;
    fp += `:ce${config.corridorEnabled ? 1 : 0}`;
    fp += `:csp${config.corridorSpacing}`;
    fp += `:de${config.disconnectEnabled ? 1 : 0}`;
    fp += `:dd${config.disconnectDistance}`;
    fp += `:ch${config.chaikinPasses}`;
    return fp;
}

// ---------------------------------------------------------------------------
// Main stage entry point
// ---------------------------------------------------------------------------

/**
 * Execute the PVV2 geometry stage.
 * Inputs: stars + connections + world bounds + config from GAME_CONFIG.
 * Returns PVV2GeometryData on success, CompileError on failure.
 * Never throws. Never returns partial data. Never imports PIXI.
 */
export function executePVV2MetricStage(
    stars: StarState[],
    connections: StarConnection[],
    config: PVV2StageConfig,
): PVV2GeometryData | CompileError {
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
            const corridorVirtuals = computeCorridorVirtuals(ownedStars, connections, config.corridorSpacing, 0.5);
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
            const disconnectVirtuals = computeDisconnectVirtuals(ownedStars, stars, connections, config.disconnectDistance, 0.3);
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
        const pad = 50;
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

        log.sys('PVV2Stage', `INPUT: ${stars.length} stars, ${ownedStars.length} owned, ${sites.length} total sites built | corridorEnabled=${config.corridorEnabled} disconnectEnabled=${config.disconnectEnabled} chaikinPasses=${config.chaikinPasses}`);
        log.sys('PVV2Stage', `VORONOI OUTPUT: ${polygons.length} raw polygons -> ${cells.length} valid cells`);
        // Stage 2: Extract shared edges (before merge removes internal edges)
        const sharedEdges = extractSharedEdges(cells);
        log.sys('PVV2Stage', `EDGES: ${sharedEdges.length} contested edges across ${new Set(sharedEdges.map(e => [e.ownerA, e.ownerB].sort().join('|'))).size} owner pairs`);


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
        log.sys('PVV2Stage', `POLYLINES: ${sharedPolylines.length} border polylines | pts: ${sharedPolylines.map(p => `${p.ownerPairKey}:${p.points.length}`).join(' ')}`);

        // Stage 6: Detect enclaves (before smoothing, for centroid accuracy)
        const enclaveMapRaw = detectEnclaves(mergedRaw);
        log.sys('PVV2Stage', `ENCLAVES: ${enclaveMapRaw.size} | COMPLETE`);

        // Apply Chaikin smoothing to fill polygons in the geometry stage.
        // BOTH fills and borders are smoothed with the same chaikinPasses here —
        // before any render calls — ensuring geometric consistency.
        // Previous approach (smooth fills independently at render time) caused B-42 divergence.
        const mergedTerritories: MergedTerritory[] = config.chaikinPasses > 0
            ? mergedRaw.map(t => ({
                ...t,
                points: chaikinSmoothPolygon(t.points, config.chaikinPasses, config.worldWidth, config.worldHeight),
            }))
            : mergedRaw;

        // Also smooth enclave hole polygons with the same passes
        const enclaveMap = new Map<number, [number, number][][]>();
        for (const [idx, holes] of enclaveMapRaw) {
            enclaveMap.set(idx, config.chaikinPasses > 0
                ? holes.map(hole => chaikinSmoothPolygon(hole, config.chaikinPasses, config.worldWidth, config.worldHeight))
                : holes,
            );
        }

        // Extract world-boundary border polylines for outer territory framing
        const worldBorderPolylines = extractWorldBorderPolylines(mergedTerritories, config.worldWidth, config.worldHeight);
        log.sys('PVV2Stage', `WORLD BORDERS: ${worldBorderPolylines.length} boundary polylines`);

        log.sys('PVV2Stage', `MERGED: ${mergedTerritories.length} territories | chaikinPasses=${config.chaikinPasses} | pts: ${mergedTerritories.map(t => `${t.ownerId}:${t.points.length}`).join(' ')}`);


        const fingerprint = buildPVV2Fingerprint(stars, config);

        return {
            cells,
            mergedTerritories,
            sharedEdges,
            rawSharedPolylines,
            sharedPolylines,
            worldBorderPolylines,
            enclaveMap,
            fingerprint,
        } satisfies PVV2GeometryData;

    } catch (err) {
        return {
            kind: 'error',
            stage: 'metric',
            message: err instanceof Error ? err.message : String(err),
            recoverable: false,
        } satisfies CompileError;
    }
}
