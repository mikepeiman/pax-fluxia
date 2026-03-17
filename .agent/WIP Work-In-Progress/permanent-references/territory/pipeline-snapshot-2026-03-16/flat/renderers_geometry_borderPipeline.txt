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
 * World-boundary vertices (not matched to any shared polyline) stay straight.
 * Adjacent territories get identical smoothed coordinates at their shared border.
 */
export function substituteSmoothedEdges(
    merged: MergedTerritory[],
    rawPolylines: SharedPolyline[],
    smoothedPolylines: SharedPolyline[]
): void {
    // Matches edgeKey precision (toFixed(2))
    const ptKey = (x: number, y: number) => `${+x.toFixed(2)},${+y.toFixed(2)}`;

    // Build mappings: raw polyline vertex keys → smoothed polyline points
    interface PolylineMapping {
        rawKeys: string[];
        smoothedPoints: [number, number][];
        ownerPairKey: string;
    }
    const mappings: PolylineMapping[] = [];
    for (let pi = 0; pi < rawPolylines.length && pi < smoothedPolylines.length; pi++) {
        const raw = rawPolylines[pi];
        const smoothed = smoothedPolylines[pi];
        mappings.push({
            rawKeys: raw.points.map(p => ptKey(p[0], p[1])),
            smoothedPoints: smoothed.points as [number, number][],
            ownerPairKey: raw.ownerPairKey,
        });
    }

    for (const territory of merged) {
        const pts = territory.points;
        if (pts.length < 3) continue;

        const result: [number, number][] = [];
        let i = 0;

        while (i < pts.length) {
            const vKey = ptKey(pts[i][0], pts[i][1]);
            let matched = false;

            for (const mapping of mappings) {
                // Only consider polylines involving this territory's owner
                const [oA, oB] = mapping.ownerPairKey.split('|');
                if (territory.ownerId !== oA && territory.ownerId !== oB) continue;

                const rk = mapping.rawKeys;

                // Forward match: polygon vertices align with raw polyline start→end
                if (vKey === rk[0] && rk.length >= 2) {
                    let matchLen = 1;
                    for (let r = 1; r < rk.length && (i + matchLen) < pts.length; r++) {
                        if (ptKey(pts[i + matchLen][0], pts[i + matchLen][1]) === rk[r]) matchLen++;
                        else break;
                    }
                    if (matchLen >= 2) {
                        for (const sp of mapping.smoothedPoints) {
                            if (result.length > 0) {
                                const last = result[result.length - 1];
                                if (ptKey(last[0], last[1]) === ptKey(sp[0], sp[1])) continue;
                            }
                            result.push(sp);
                        }
                        i += matchLen;
                        matched = true;
                        break;
                    }
                }

                // Reverse match: polygon traverses polyline end→start
                if (vKey === rk[rk.length - 1] && rk.length >= 2) {
                    let matchLen = 1;
                    for (let r = rk.length - 2; r >= 0 && (i + matchLen) < pts.length; r--) {
                        if (ptKey(pts[i + matchLen][0], pts[i + matchLen][1]) === rk[r]) matchLen++;
                        else break;
                    }
                    if (matchLen >= 2) {
                        const reversed = [...mapping.smoothedPoints].reverse();
                        for (const sp of reversed) {
                            if (result.length > 0) {
                                const last = result[result.length - 1];
                                if (ptKey(last[0], last[1]) === ptKey(sp[0], sp[1])) continue;
                            }
                            result.push(sp);
                        }
                        i += matchLen;
                        matched = true;
                        break;
                    }
                }
            }

            if (!matched) {
                // World-boundary vertex or unmatched — keep as-is
                result.push(pts[i]);
                i++;
            }
        }

        territory.points = result;
    }
}
