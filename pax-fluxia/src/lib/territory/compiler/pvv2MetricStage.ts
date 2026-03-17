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
    sharedPolylines: SharedPolyline[];    // Chained + Chaikin-smoothed border polylines (no color yet)
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
 */
export function chaikinSmoothPolygon(pts: [number, number][], passes: number): [number, number][] {
    if (passes <= 0 || pts.length < 3) return pts;
    let current = pts;
    for (let iter = 0; iter < passes; iter++) {
        const n = current.length;
        const next: [number, number][] = [];
        for (let i = 0; i < n; i++) {
            const [ax, ay] = current[i];
            const [bx, by] = current[(i + 1) % n];
            next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
            next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
        }
        current = next;
    }
    return current;
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

    type DEdge = { x1: number; y1: number; x2: number; y2: number };
    const clusterEdges = new Map<string, DEdge[]>();
    const clusterOwner = new Map<string, string>();

    for (const cell of cells) {
        const ck = clusterKeyOf(cell);
        if (!clusterEdges.has(ck)) clusterEdges.set(ck, []);
        if (!clusterOwner.has(ck)) clusterOwner.set(ck, cell.ownerId);

        const pts = cell.points;
        for (let j = 0; j < pts.length - 1; j++) {
            const key = edgeKey(pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]);
            const clusters = edgeClusters.get(key)!;
            if (clusters.size === 1 && clusters.has(ck)) {
                clusterEdges.get(ck)!.push({
                    x1: pts[j][0], y1: pts[j][1],
                    x2: pts[j + 1][0], y2: pts[j + 1][1],
                });
            }
        }
    }

    const result: MergedTerritory[] = [];
    for (const [ck, edges] of clusterEdges) {
        const ownerId = clusterOwner.get(ck) ?? ck;
        if (ownerId === DISCONNECT_OWNER_ID) continue;

        // Walk edges into polygon chains
        const ptKey = (x: number, y: number) => `${+x.toFixed(2)},${+y.toFixed(2)}`;
        const adjacency = new Map<string, { x: number; y: number; peers: string[] }>();

        for (const e of edges) {
            const kA = ptKey(e.x1, e.y1);
            const kB = ptKey(e.x2, e.y2);
            if (!adjacency.has(kA)) adjacency.set(kA, { x: e.x1, y: e.y1, peers: [] });
            if (!adjacency.has(kB)) adjacency.set(kB, { x: e.x2, y: e.y2, peers: [] });
            adjacency.get(kA)!.peers.push(kB);
            adjacency.get(kB)!.peers.push(kA);
        }

        const visited = new Set<string>();
        for (const [startKey, startNode] of adjacency) {
            if (visited.has(startKey)) continue;
            const chain: [number, number][] = [[startNode.x, startNode.y]];
            visited.add(startKey);

            let current = startKey;
            let found = true;
            while (found) {
                found = false;
                for (const peer of adjacency.get(current)!.peers) {
                    if (!visited.has(peer)) {
                        visited.add(peer);
                        const node = adjacency.get(peer)!;
                        chain.push([node.x, node.y]);
                        current = peer;
                        found = true;
                        break;
                    }
                }
                if (!found) break;
            }

            if (chain.length >= 3) {
                if (chain[0][0] !== chain[chain.length - 1][0] ||
                    chain[0][1] !== chain[chain.length - 1][1]) {
                    chain.push([chain[0][0], chain[0][1]]);
                }
                result.push({ points: chain as [number, number][], ownerId, color: 0 });
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
    const ptKey = (x: number, y: number) => `${+x.toFixed(2)},${+y.toFixed(2)}`;

    for (const [pairKey, pairEdges] of byPair) {
        // Build adjacency for chain walking
        const adj = new Map<string, { x: number; y: number; peers: string[] }>();
        for (const e of pairEdges) {
            const kA = ptKey(e.x1, e.y1);
            const kB = ptKey(e.x2, e.y2);
            if (!adj.has(kA)) adj.set(kA, { x: e.x1, y: e.y1, peers: [] });
            if (!adj.has(kB)) adj.set(kB, { x: e.x2, y: e.y2, peers: [] });
            adj.get(kA)!.peers.push(kB);
            adj.get(kB)!.peers.push(kA);
        }

        const visited = new Set<string>();
        for (const [startKey, startNode] of adj) {
            if (visited.has(startKey)) continue;
            // Walk this chain
            const chain: [number, number][] = [[startNode.x, startNode.y]];
            visited.add(startKey);
            let current = startKey;
            let found = true;
            while (found) {
                found = false;
                for (const peer of adj.get(current)!.peers) {
                    if (!visited.has(peer)) {
                        visited.add(peer);
                        const node = adj.get(peer)!;
                        chain.push([node.x, node.y]);
                        current = peer;
                        found = true;
                        break;
                    }
                }
            }

            if (chain.length >= 2) {
                // Apply Chaikin smoothing — this is geometry, not render
                const smoothed = passes > 0 ? chaikinSmoothPolyline(chain, passes) : chain;
                result.push({
                    points: smoothed,
                    ownerPairKey: pairKey,
                    color: 0, // renderer assigns color
                });
            }
        }
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

        log.sys('PVV2Stage', `${cells.length} cells from ${sites.length} sites`);

        // Stage 2: Extract shared edges (before merge removes internal edges)
        const sharedEdges = extractSharedEdges(cells);

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
        const mergedTerritories = mergeSameOwnerCells(cells, config.clusterSplit, clusterMap);
        log.sys('PVV2Stage', `Merged to ${mergedTerritories.length} territories`);

        // Stage 5: Chain shared edges → smoothed polylines (Chaikin = geometry)
        const sharedPolylines = chainSharedEdgesIntoPolylines(sharedEdges, config.chaikinPasses);

        // Stage 6: Detect enclaves
        const enclaveMap = detectEnclaves(mergedTerritories);

        const fingerprint = buildPVV2Fingerprint(stars, config);

        return {
            cells,
            mergedTerritories,
            sharedEdges,
            sharedPolylines,
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
