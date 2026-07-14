// ── Frontier Loop Assembly: edge classification, boundary walking, loop stitching ──
//
// Extracted from PVV3Renderer.ts — pure geometry functions, no renderer state.

import type { SharedPolyline, FrontierLoop } from './types';
import { log } from '$lib/utils/logger';

/** Classify which edge of a rectangle a point lies on (within tolerance). */
export function classifyEdge(
    x: number, y: number,
    xMin: number, yMin: number, xMax: number, yMax: number,
    tol: number = 8,
): 'top' | 'right' | 'bottom' | 'left' | null {
    // Check edges in priority order (corners go to the first edge found)
    if (Math.abs(y - yMin) <= tol) return 'top';
    if (Math.abs(x - xMax) <= tol) return 'right';
    if (Math.abs(y - yMax) <= tol) return 'bottom';
    if (Math.abs(x - xMin) <= tol) return 'left';
    return null;
}

/** Walk clockwise from point A to point B along rectangle perimeter,
 *  returning intermediate corner points (NOT including A or B themselves). */
export function walkBoundaryCW(
    ax: number, ay: number, edgeA: string,
    bx: number, by: number, edgeB: string,
    xMin: number, yMin: number, xMax: number, yMax: number,
): [number, number][] {
    // CW edge order: top → right → bottom → left
    const edgeOrder = ['top', 'right', 'bottom', 'left'];
    const corners: Record<string, [number, number]> = {
        'top→right': [xMax, yMin],
        'right→bottom': [xMax, yMax],
        'bottom→left': [xMin, yMax],
        'left→top': [xMin, yMin],
    };

    const pts: [number, number][] = [];
    let current = edgeA;
    let safety = 0;

    while (current !== edgeB && safety < 5) {
        const idx = edgeOrder.indexOf(current);
        const next = edgeOrder[(idx + 1) % 4];
        const cornerKey = `${current}→${next}`;
        if (corners[cornerKey]) {
            pts.push(corners[cornerKey]);
        }
        current = next;
        safety++;
    }

    return pts;
}

export function assembleFrontierLoops(
    polylines: SharedPolyline[],
    mapBounds?: { xMin: number; yMin: number; xMax: number; yMax: number },
): Map<string, FrontierLoop[]> {
    // Matches edgeKey precision (toFixed(2))
    const ptKey = (x: number, y: number) =>
        `${+x.toFixed(2)},${+y.toFixed(2)}`;

    // Accumulate all diagnostic lines into one string
    const diag: string[] = [];
    diag.push(`═══ assembleFrontierLoops: ${polylines.length} polylines ═══`);

    // Build endpoint adjacency table
    const endpointCounts = new Map<string, number>();
    const polyTable: { idx: number; pair: string; pts: number; start: string; end: string; startKey: string; endKey: string }[] = [];

    for (let pi = 0; pi < polylines.length; pi++) {
        const p = polylines[pi];
        const pts = p.points;
        if (pts.length < 2) { diag.push(`  poly[${pi}] SKIP (${pts.length} pts)`); continue; }
        const sk = ptKey(pts[0][0], pts[0][1]);
        const ek = ptKey(pts[pts.length - 1][0], pts[pts.length - 1][1]);
        endpointCounts.set(sk, (endpointCounts.get(sk) ?? 0) + 1);
        endpointCounts.set(ek, (endpointCounts.get(ek) ?? 0) + 1);
        polyTable.push({
            idx: pi, pair: p.ownerPairKey, pts: pts.length,
            start: `(${pts[0][0].toFixed(0)},${pts[0][1].toFixed(0)})`,
            end: `(${pts[pts.length - 1][0].toFixed(0)},${pts[pts.length - 1][1].toFixed(0)})`,
            startKey: sk, endKey: ek,
        });
    }

    // Flag dangles
    const dangles: string[] = [];
    for (const [key, count] of endpointCounts) {
        if (count === 1) dangles.push(key);
    }
    if (dangles.length > 0) {
        diag.push(`⚠ ${dangles.length} DANGLING endpoints: ${dangles.join(', ')}`);
    } else {
        diag.push(`✓ All endpoints paired`);
    }

    // Group polylines by each owner they touch
    const byOwner = new Map<string, { points: [number, number][]; startKey: string; endKey: string; polyIdx: number }[]>();

    for (let pi = 0; pi < polylines.length; pi++) {
        const poly = polylines[pi];
        const [ownerA, ownerB] = poly.ownerPairKey.split('|');
        const pts = poly.points;
        if (pts.length < 2) continue;

        const startKey = ptKey(pts[0][0], pts[0][1]);
        const endKey = ptKey(pts[pts.length - 1][0], pts[pts.length - 1][1]);
        const segment = { points: pts, startKey, endKey, polyIdx: pi };

        for (const owner of [ownerA, ownerB]) {
            if (!byOwner.has(owner)) byOwner.set(owner, []);
            byOwner.get(owner)!.push(segment);
        }
    }

    const result = new Map<string, FrontierLoop[]>();

    for (const [ownerId, segments] of byOwner) {
        const loops: FrontierLoop[] = [];
        const openChains: { points: [number, number][]; chainLog: string[] }[] = [];
        const used = new Array(segments.length).fill(false);

        while (true) {
            // Find first unused segment
            let startIdx = -1;
            for (let i = 0; i < segments.length; i++) {
                if (!used[i]) { startIdx = i; break; }
            }
            if (startIdx < 0) break;

            // Start a chain from this segment
            used[startIdx] = true;
            const chain: [number, number][] = [...segments[startIdx].points];
            const chainLog: string[] = [`seg[${segments[startIdx].polyIdx}]`];

            // Extend forward: find next segment whose start matches our end
            let extended = true;
            let fwdExtensions = 0;
            while (extended) {
                extended = false;
                const lastPt = chain[chain.length - 1];
                const lastKey = ptKey(lastPt[0], lastPt[1]);

                for (let i = 0; i < segments.length; i++) {
                    if (used[i]) continue;
                    const seg = segments[i];

                    if (seg.startKey === lastKey) {
                        for (let j = 1; j < seg.points.length; j++) {
                            chain.push(seg.points[j]);
                        }
                        used[i] = true;
                        extended = true;
                        fwdExtensions++;
                        chainLog.push(`+F[${seg.polyIdx}]`);
                        break;
                    }
                    if (seg.endKey === lastKey) {
                        for (let j = seg.points.length - 2; j >= 0; j--) {
                            chain.push(seg.points[j]);
                        }
                        used[i] = true;
                        extended = true;
                        fwdExtensions++;
                        chainLog.push(`+F[${seg.polyIdx}]R`);
                        break;
                    }
                }
            }

            // Extend backward: find next segment whose end matches our start
            extended = true;
            let bwdExtensions = 0;
            while (extended) {
                extended = false;
                const firstPt = chain[0];
                const firstKey = ptKey(firstPt[0], firstPt[1]);

                for (let i = 0; i < segments.length; i++) {
                    if (used[i]) continue;
                    const seg = segments[i];

                    if (seg.endKey === firstKey) {
                        for (let j = seg.points.length - 2; j >= 0; j--) {
                            chain.unshift(seg.points[j]);
                        }
                        used[i] = true;
                        extended = true;
                        bwdExtensions++;
                        chainLog.unshift(`+B[${seg.polyIdx}]`);
                        break;
                    }
                    if (seg.startKey === firstKey) {
                        for (let j = 1; j < seg.points.length; j++) {
                            chain.unshift(seg.points[j]);
                        }
                        used[i] = true;
                        extended = true;
                        bwdExtensions++;
                        chainLog.unshift(`+B[${seg.polyIdx}]R`);
                        break;
                    }
                }
            }

            // Check if naturally closed
            const first = chain[0];
            const last = chain[chain.length - 1];
            const isClosed = ptKey(first[0], first[1]) === ptKey(last[0], last[1]);

            if (isClosed) {
                chain[chain.length - 1] = [first[0], first[1]];
                const status = chain.length >= 4 ? '✓' : '⚠REJECTED';
                diag.push(`  [${ownerId}] ${status} ${chain.length}pts f=${fwdExtensions} b=${bwdExtensions} closed=true | ${chainLog.join(' → ')}`);
                if (chain.length >= 4) {
                    loops.push({ points: chain, ownerId });
                }
            } else {
                // Open chain — collect for boundary merge below
                diag.push(`  [${ownerId}] OPEN ${chain.length}pts f=${fwdExtensions} b=${bwdExtensions} | ${chainLog.join(' → ')}`);
                if (chain.length >= 2) {
                    openChains.push({ points: chain, chainLog });
                }
            }
        }

        // ── Boundary merge: stitch all open chains into one closed polygon ──
        if (openChains.length > 0 && mapBounds) {
            const { xMin, yMin, xMax, yMax } = mapBounds;

            // Compute CW perimeter position (0..4) for a point on the boundary
            // top=0→1, right=1→2, bottom=2→3, left=3→4
            const perimPos = (x: number, y: number): number => {
                const edge = classifyEdge(x, y, xMin, yMin, xMax, yMax);
                const w = xMax - xMin, h = yMax - yMin;
                if (edge === 'top') return 0 + (x - xMin) / w;
                if (edge === 'right') return 1 + (y - yMin) / h;
                if (edge === 'bottom') return 2 + (xMax - x) / w;
                if (edge === 'left') return 3 + (yMax - y) / h;
                return -1; // not on boundary
            };

            // For each open chain, compute perimeter pos of its endpoints
            type OpenChainEntry = {
                points: [number, number][];
                startPerim: number;
                endPerim: number;
                startEdge: string;
                endEdge: string;
                chainLog: string[];
            };
            const entries: OpenChainEntry[] = [];
            for (const oc of openChains) {
                const pts = oc.points;
                const s = pts[0], e = pts[pts.length - 1];
                const sEdge = classifyEdge(s[0], s[1], xMin, yMin, xMax, yMax);
                const eEdge = classifyEdge(e[0], e[1], xMin, yMin, xMax, yMax);
                if (sEdge && eEdge) {
                    entries.push({
                        points: pts,
                        startPerim: perimPos(s[0], s[1]),
                        endPerim: perimPos(e[0], e[1]),
                        startEdge: sEdge,
                        endEdge: eEdge,
                        chainLog: oc.chainLog,
                    });
                } else {
                    // Can't classify — push as individual loop (force close)
                    pts.push([pts[0][0], pts[0][1]]);
                    if (pts.length >= 4) loops.push({ points: pts, ownerId });
                    diag.push(`  [${ownerId}] ⚠force-closed ${pts.length}pts (non-boundary endpoint)`);
                }
            }

            if (entries.length > 0) {
                // Sort by endPerim (CW order around perimeter)
                entries.sort((a, b) => a.endPerim - b.endPerim);

                // Stitch: chain1-end →(walk)→ chain2-start → chain2 → chain2-end →(walk)→ ...
                const merged: [number, number][] = [];
                const mergeLog: string[] = [];

                for (let i = 0; i < entries.length; i++) {
                    const entry = entries[i];
                    const nextEntry = entries[(i + 1) % entries.length];

                    // Append this chain's points
                    for (const pt of entry.points) merged.push(pt);
                    mergeLog.push(`C${i}(${entry.points.length}pts)`);

                    // Walk from this chain's end to next chain's start
                    const walkPts = walkBoundaryCW(
                        entry.points[entry.points.length - 1][0],
                        entry.points[entry.points.length - 1][1],
                        entry.endEdge,
                        nextEntry.points[0][0],
                        nextEntry.points[0][1],
                        nextEntry.startEdge,
                        xMin, yMin, xMax, yMax,
                    );
                    for (const wp of walkPts) merged.push(wp);
                    if (walkPts.length > 0) mergeLog.push(`W+${walkPts.length}`);
                }

                // Close the merged polygon
                if (merged.length >= 2) {
                    merged.push([merged[0][0], merged[0][1]]);
                }

                diag.push(`  [${ownerId}] ✓MERGED ${merged.length}pts from ${entries.length} open chains | ${mergeLog.join(' → ')}`);

                if (merged.length >= 4) {
                    loops.push({ points: merged, ownerId });
                }
            }
        } else if (openChains.length > 0) {
            // No map bounds — force close each open chain individually
            for (const oc of openChains) {
                oc.points.push([oc.points[0][0], oc.points[0][1]]);
                if (oc.points.length >= 4) loops.push({ points: oc.points, ownerId });
            }
        }

        if (loops.length > 0) {
            result.set(ownerId, loops);
        }
    }

    // Emit one consolidated log + table
    log.renderer('FrontierDiag', diag.join('\n'));
    if (polyTable.length > 0) {
        console.table(polyTable);
    }


    return result;
}
