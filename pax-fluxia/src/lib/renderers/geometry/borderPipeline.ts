// ── Border Pipeline: shared edge extraction, chaining, and smooth substitution ──
//
// Extracted from PVV3Renderer.ts — pure geometry functions, no renderer state.

import type { TerritoryCell, MergedTerritory, SharedBorderEdge, SharedPolyline } from './types';
import { edgeKey } from './polyUtils';
import { chaikinSmoothPolyline } from './chaikin';

/**
 * Extract edges shared between cells of DIFFERENT owners (contested borders).
 * Each edge appears once with ownerA/ownerB — these are the boundaries where
 * territory borders should overlap and blend.
 */
export function extractSharedEdges(cells: TerritoryCell[]): SharedBorderEdge[] {
    // Map: edgeKey → { owners+siteIds per side, coordinates }
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
                // Only add if this is a different cell (same edge shared by two cells)
                if (!entry.sides.some(s => s.siteId === cell.siteId)) {
                    entry.sides.push({ ownerId: cell.ownerId, siteId: cell.siteId });
                }
            }
        }
    }

    // Collect only edges with exactly 2 different owners (contested boundaries)
    const shared: SharedBorderEdge[] = [];
    for (const [, entry] of edgeOwners) {
        if (entry.sides.length === 2 &&
            entry.sides[0].ownerId !== entry.sides[1].ownerId &&
            entry.sides[0].ownerId !== '__disconnect__' &&
            entry.sides[1].ownerId !== '__disconnect__') {
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

// ── Merged owner outlines (e.g. Modified Voronoi) — contested + hull split ──

/** One closed owner region after merge (duplicate first/last vertex allowed). */
export interface OwnerPolygonOutline {
    ownerId: string;
    points: [number, number][];
}

/** Visit each undirected edge of a closed outline once. */
function forEachOutlineEdge(
    pts: [number, number][],
    visit: (x1: number, y1: number, x2: number, y2: number) => void,
): void {
    const n = pts.length;
    if (n < 2) return;
    const closed =
        n > 2 &&
        pts[0]![0] === pts[n - 1]![0] &&
        pts[0]![1] === pts[n - 1]![1];
    const m = closed ? n - 1 : n;
    for (let j = 0; j < m; j++) {
        const jn = (j + 1) % m;
        visit(pts[j]![0], pts[j]![1], pts[jn]![0], pts[jn]![1]);
    }
}

function addNormalizedEndpointSum(
    sum: [number, number, number, number],
    x1: number, y1: number, x2: number, y2: number,
): void {
    const ax = +x1.toFixed(2), ay = +y1.toFixed(2);
    const bx = +x2.toFixed(2), by = +y2.toFixed(2);
    if (ax < bx || (ax === bx && ay < by)) {
        sum[0] += x1; sum[1] += y1; sum[2] += x2; sum[3] += y2;
    } else {
        sum[0] += x2; sum[1] += y2; sum[2] += x1; sum[3] += y1;
    }
}

function finalizeLedgerEntry(
    sum: [number, number, number, number],
    count: number,
): { x1: number; y1: number; x2: number; y2: number } {
    const c = count;
    return {
        x1: sum[0] / c,
        y1: sum[1] / c,
        x2: sum[2] / c,
        y2: sum[3] / c,
    };
}

/**
 * From merged owner outlines (same geometry used for fills), split boundary into:
 * - **contested**: edges incident to two different owners — one normalized segment each,
 *   endpoints averaged when both polygons contribute (reduces asymmetric warp gaps).
 * - **hull**: per-polygon segments that only one owner claims (map / outer boundary).
 *
 * Matches the PVV2/PVV3 “shared contested border” model while keeping hull strokes
 * per territory color.
 */
export function splitMergedOwnerOutlineEdges(polygons: OwnerPolygonOutline[]): {
    contested: SharedBorderEdge[];
    hullSegmentsByPolygon: Array<Array<{ x1: number; y1: number; x2: number; y2: number }>>;
} {
    type LedgerEntry = {
        owners: Set<string>;
        sum: [number, number, number, number];
        count: number;
    };
    const ledger = new Map<string, LedgerEntry>();

    for (const poly of polygons) {
        forEachOutlineEdge(poly.points, (x1, y1, x2, y2) => {
            const key = edgeKey(x1, y1, x2, y2);
            let ent = ledger.get(key);
            if (!ent) {
                ent = { owners: new Set(), sum: [0, 0, 0, 0], count: 0 };
                ledger.set(key, ent);
            }
            ent.owners.add(poly.ownerId);
            addNormalizedEndpointSum(ent.sum, x1, y1, x2, y2);
            ent.count += 1;
        });
    }

    const contested: SharedBorderEdge[] = [];
    for (const ent of ledger.values()) {
        if (ent.owners.size !== 2) continue;
        const [oa, ob] = [...ent.owners].sort();
        const f = finalizeLedgerEntry(ent.sum, ent.count);
        contested.push({
            ...f,
            ownerA: oa,
            ownerB: ob,
            colorA: 0,
            colorB: 0,
            siteIdA: '',
            siteIdB: '',
        });
    }

    const hullSegmentsByPolygon: Array<Array<{ x1: number; y1: number; x2: number; y2: number }>> = polygons.map(() => []);
    for (let pi = 0; pi < polygons.length; pi++) {
        const poly = polygons[pi]!;
        const hull = hullSegmentsByPolygon[pi]!;
        forEachOutlineEdge(poly.points, (x1, y1, x2, y2) => {
            const key = edgeKey(x1, y1, x2, y2);
            const ent = ledger.get(key)!;
            if (ent.owners.size === 1) {
                hull.push(finalizeLedgerEntry(ent.sum, ent.count));
            }
        });
    }

    return { contested, hullSegmentsByPolygon };
}

/**
 * Greedy-chain undirected segments that meet at endpoints (same ptKey / toFixed(2) as borders).
 * Does not group by owner — call per polygon for hull chains so same owner’s disconnected
 * regions never merge incorrectly.
 */
export function chainUndirectedSegments(
    segments: Array<{ x1: number; y1: number; x2: number; y2: number }>,
): [number, number][][] {
    if (segments.length === 0) return [];
    const ptKey = (x: number, y: number) => `${+x.toFixed(2)},${+y.toFixed(2)}`;
    const n = segments.length;
    const used = new Array<boolean>(n).fill(false);
    const polylines: [number, number][][] = [];

    while (true) {
        let startIdx = -1;
        for (let i = 0; i < n; i++) {
            if (!used[i]) {
                startIdx = i;
                break;
            }
        }
        if (startIdx < 0) break;

        used[startIdx] = true;
        const e = segments[startIdx]!;
        const chain: [number, number][] = [[e.x1, e.y1], [e.x2, e.y2]];

        let extended = true;
        while (extended) {
            extended = false;
            const last = chain[chain.length - 1]!;
            const lk = ptKey(last[0], last[1]);
            for (let i = 0; i < n; i++) {
                if (used[i]) continue;
                const ei = segments[i]!;
                if (ptKey(ei.x1, ei.y1) === lk) {
                    chain.push([ei.x2, ei.y2]);
                    used[i] = true;
                    extended = true;
                    break;
                }
                if (ptKey(ei.x2, ei.y2) === lk) {
                    chain.push([ei.x1, ei.y1]);
                    used[i] = true;
                    extended = true;
                    break;
                }
            }
        }

        extended = true;
        while (extended) {
            extended = false;
            const first = chain[0]!;
            const fk = ptKey(first[0], first[1]);
            for (let i = 0; i < n; i++) {
                if (used[i]) continue;
                const ei = segments[i]!;
                if (ptKey(ei.x2, ei.y2) === fk) {
                    chain.unshift([ei.x1, ei.y1]);
                    used[i] = true;
                    extended = true;
                    break;
                }
                if (ptKey(ei.x1, ei.y1) === fk) {
                    chain.unshift([ei.x2, ei.y2]);
                    used[i] = true;
                    extended = true;
                    break;
                }
            }
        }

        polylines.push(chain);
    }

    return polylines;
}


/** Chain shared border edges into continuous polylines, grouped by owner-pair.
 *  Edges between the same two owners that share endpoints get merged into polylines. */
export function chainSharedEdgesIntoPolylines(edges: SharedBorderEdge[], colorLookup?: (ownerA: string, ownerB: string) => number, smoothPasses = 0): SharedPolyline[] {
    // Group edges by sorted owner pair
    const byPair = new Map<string, SharedBorderEdge[]>();
    for (const e of edges) {
        const key = e.ownerA < e.ownerB ? `${e.ownerA}|${e.ownerB}` : `${e.ownerB}|${e.ownerA}`;
        if (!byPair.has(key)) byPair.set(key, []);
        byPair.get(key)!.push(e);
    }

    const result: SharedPolyline[] = [];

    for (const [pairKey, pairEdges] of byPair) {
        // Build adjacency by endpoint
        // Matches edgeKey precision (toFixed(2))
        const ptKey = (x: number, y: number) => `${+x.toFixed(2)},${+y.toFixed(2)}`;
        const adj = new Map<string, { x: number; y: number; next: string }[]>();
        const used = new Array(pairEdges.length).fill(false);

        for (let i = 0; i < pairEdges.length; i++) {
            const e = pairEdges[i];
            const k1 = ptKey(e.x1, e.y1);
            const k2 = ptKey(e.x2, e.y2);
            if (!adj.has(k1)) adj.set(k1, []);
            if (!adj.has(k2)) adj.set(k2, []);
            adj.get(k1)!.push({ x: e.x2, y: e.y2, next: k2 });
            adj.get(k2)!.push({ x: e.x1, y: e.y1, next: k1 });
        }

        // Greedy chain: start from an endpoint (degree 1) or any unused edge
        while (true) {
            // Find an unused edge
            let startIdx = -1;
            for (let i = 0; i < pairEdges.length; i++) {
                if (!used[i]) { startIdx = i; break; }
            }
            if (startIdx < 0) break;

            // Simple: just trace edges greedily
            const chain: [number, number][] = [];
            used[startIdx] = true;
            const e = pairEdges[startIdx];
            chain.push([e.x1, e.y1]);
            chain.push([e.x2, e.y2]);

            // Extend forward: try to find next unused edge that connects
            let extended = true;
            while (extended) {
                extended = false;
                const last = chain[chain.length - 1];
                const lk = ptKey(last[0], last[1]);
                for (let i = 0; i < pairEdges.length; i++) {
                    if (used[i]) continue;
                    const ei = pairEdges[i];
                    if (ptKey(ei.x1, ei.y1) === lk) {
                        chain.push([ei.x2, ei.y2]);
                        used[i] = true;
                        extended = true;
                        break;
                    }
                    if (ptKey(ei.x2, ei.y2) === lk) {
                        chain.push([ei.x1, ei.y1]);
                        used[i] = true;
                        extended = true;
                        break;
                    }
                }
            }

            // Extend backward similarly
            extended = true;
            while (extended) {
                extended = false;
                const first = chain[0];
                const fk = ptKey(first[0], first[1]);
                for (let i = 0; i < pairEdges.length; i++) {
                    if (used[i]) continue;
                    const ei = pairEdges[i];
                    if (ptKey(ei.x2, ei.y2) === fk) {
                        chain.unshift([ei.x1, ei.y1]);
                        used[i] = true;
                        extended = true;
                        break;
                    }
                    if (ptKey(ei.x1, ei.y1) === fk) {
                        chain.unshift([ei.x2, ei.y2]);
                        used[i] = true;
                        extended = true;
                        break;
                    }
                }
            }

            const [ownerA, ownerB] = pairKey.split('|');
            const color = colorLookup ? colorLookup(ownerA, ownerB) : 0x888888;

            // Apply Chaikin smoothing to convert straight Voronoi edges into smooth arcs
            const smoothed = smoothPasses > 0 ? chaikinSmoothPolyline(chain, smoothPasses) : chain;
            result.push({ points: smoothed, ownerPairKey: pairKey, color });
        }
    }

    return result;
}


// -- Shared-Boundary Smoothing ----------------------------------------------

/**
 * Replace shared-edge segments in territory polygons with smoothed polyline coordinates.
 * Uses spatial proximity matching (squared-distance) instead of string key comparison
 * to avoid floating-point drift causing silent mismatches.
 *
 * Algorithm:
 * For each raw↔smoothed polyline pair, find where the raw polyline's start and end
 * vertices appear on each polygon (by proximity), then splice the smoothed points
 * in between those anchors.
 */
export function substituteSmoothedEdges(
    merged: MergedTerritory[],
    rawPolylines: SharedPolyline[],
    smoothedPolylines: SharedPolyline[]
): void {
    const EPSILON_SQ = 1.0; // 1 pixel squared tolerance

    /** Squared distance between two points. */
    const dist2 = (ax: number, ay: number, bx: number, by: number) =>
        (ax - bx) * (ax - bx) + (ay - by) * (ay - by);

    /** Find the index of the polygon vertex closest to (tx, ty) within EPSILON_SQ. Returns -1 if none. */
    const findNearest = (pts: [number, number][], tx: number, ty: number): number => {
        let bestIdx = -1;
        let bestD = EPSILON_SQ;
        for (let i = 0; i < pts.length; i++) {
            const d = dist2(pts[i][0], pts[i][1], tx, ty);
            if (d < bestD) { bestD = d; bestIdx = i; }
        }
        return bestIdx;
    };

    for (let pi = 0; pi < rawPolylines.length && pi < smoothedPolylines.length; pi++) {
        const rawPts = rawPolylines[pi].points;
        const smoothedPts = smoothedPolylines[pi].points;
        const ownerPairKey = rawPolylines[pi].ownerPairKey;
        if (rawPts.length < 2 || smoothedPts.length < 2) continue;

        const [oA, oB] = ownerPairKey.split('|');
        const rawStart = rawPts[0];
        const rawEnd = rawPts[rawPts.length - 1];

        for (const territory of merged) {
            // Only consider polylines involving this territory's owner
            if (territory.ownerId !== oA && territory.ownerId !== oB) continue;

            const pts = territory.points;
            if (pts.length < 3) continue;

            // Find start and end anchor indices by spatial proximity
            const startIdx = findNearest(pts, rawStart[0], rawStart[1]);
            const endIdx = findNearest(pts, rawEnd[0], rawEnd[1]);

            if (startIdx === -1 || endIdx === -1 || startIdx === endIdx) continue;

            // Determine direction and splice
            // We need to figure out which direction the polygon traverses the polyline.
            // Check if the polygon goes startIdx → endIdx (forward) or endIdx → startIdx (reverse).
            let forward: boolean;
            if (startIdx < endIdx) {
                // Could be forward (start→end) or reverse wrapping around
                // Check: does the polygon step from startIdx toward endIdx with intermediate raw points?
                const span = endIdx - startIdx;
                // Simple heuristic: if span roughly matches raw polyline length, it's forward
                forward = Math.abs(span + 1 - rawPts.length) <= Math.abs((pts.length - span + 1) - rawPts.length);
            } else {
                // startIdx > endIdx: could be forward wrapping or reverse direct
                const span = pts.length - startIdx + endIdx;
                forward = Math.abs(span + 1 - rawPts.length) <= Math.abs((startIdx - endIdx + 1) - rawPts.length);
            }

            const pointsToInsert = forward ? smoothedPts : [...smoothedPts].reverse();

            // Build new polygon: keep vertices outside the matched range, replace inside with smoothed
            const result: [number, number][] = [];

            if (forward) {
                if (startIdx < endIdx) {
                    // Simple case: splice startIdx..endIdx with smoothed points
                    for (let i = 0; i < pts.length; i++) {
                        if (i === startIdx) {
                            for (const sp of pointsToInsert) result.push(sp);
                            i = endIdx; // skip over replaced section
                        } else {
                            result.push(pts[i]);
                        }
                    }
                } else {
                    // Wraparound forward: polygon goes ...startIdx → end of array → 0 → endIdx...
                    // Keep endIdx+1..startIdx-1, replace the rest
                    for (let i = endIdx + 1; i < startIdx; i++) {
                        result.push(pts[i]);
                    }
                    // Insert smoothed points at the splice point
                    for (const sp of pointsToInsert) result.push(sp);
                }
            } else {
                if (endIdx < startIdx) {
                    // Reverse direct: polygon goes startIdx → ... → endIdx backwards
                    // which means the raw polyline end→start maps to polygon endIdx→startIdx
                    for (let i = 0; i < pts.length; i++) {
                        if (i === endIdx) {
                            for (const sp of pointsToInsert) result.push(sp);
                            i = startIdx; // skip over replaced section
                        } else {
                            result.push(pts[i]);
                        }
                    }
                } else {
                    // Wraparound reverse
                    for (let i = startIdx + 1; i < endIdx; i++) {
                        result.push(pts[i]);
                    }
                    for (const sp of pointsToInsert) result.push(sp);
                }
            }

            // Ensure polygon stays closed
            if (result.length >= 2) {
                const first = result[0];
                const last = result[result.length - 1];
                if (dist2(first[0], first[1], last[0], last[1]) > EPSILON_SQ) {
                    result.push([first[0], first[1]]);
                }
            }

            territory.points = result;
        }
    }
}
