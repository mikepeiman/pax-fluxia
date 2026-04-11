// ============================================================================
// Map Generation — Delaunay Connection Generator
// Extracted from pax-fluxia/src/lib/utils/hex.utils.ts (generateStarConnections)
// ============================================================================

import { Delaunay } from 'd3-delaunay';
import type { Connectable, MapConnection } from './types';

// ---------------------------------------------------------------------------
// Geometry Utility
// ---------------------------------------------------------------------------

/**
 * Shortest distance from point (px,py) to line segment (ax,ay)–(bx,by).
 */
function pointToSegmentDistance(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number,
): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);

    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const projX = ax + t * dx;
    const projY = ay + t * dy;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

/**
 * If `finalEdges` is disconnected, add missing Delaunay edges (shortest first)
 * until one connected component spans all nodes. Updates `linkCount`.
 */
function ensureConnectedGraph<T extends Connectable>(
    nodes: T[],
    finalEdges: Set<string>,
    linkCount: Map<string, number>,
    nodeEdges: Map<string, { targetId: string; distance: number }[]>,
    edgeKey: (a: string, b: string) => string,
): void {
    if (nodes.length < 2) return;

    const ids = nodes.map((n) => n.id);
    const ufParent = new Map<string, string>();
    const ufFind = (x: string): string => {
        let p = ufParent.get(x);
        if (p === undefined) {
            ufParent.set(x, x);
            return x;
        }
        if (p !== x) {
            const r = ufFind(p);
            ufParent.set(x, r);
            return r;
        }
        return x;
    };
    const ufUnion = (a: string, b: string) => {
        const ra = ufFind(a);
        const rb = ufFind(b);
        if (ra === rb) return;
        ufParent.set(rb, ra);
    };

    const seenCand = new Set<string>();
    const candidates: { key: string; a: string; b: string; d: number }[] = [];
    for (const n of nodes) {
        for (const e of nodeEdges.get(n.id) ?? []) {
            const key = edgeKey(n.id, e.targetId);
            if (seenCand.has(key)) continue;
            seenCand.add(key);
            if (finalEdges.has(key)) continue;
            const a = n.id <= e.targetId ? n.id : e.targetId;
            const b = n.id <= e.targetId ? e.targetId : n.id;
            candidates.push({ key, a, b, d: e.distance });
        }
    }
    candidates.sort((u, v) => u.d - v.d);

    const maxBridgeAdds = Math.max(0, nodes.length * 4);
    let adds = 0;
    while (adds < maxBridgeAdds) {
        ufParent.clear();
        for (const id of ids) ufParent.set(id, id);
        for (const key of finalEdges) {
            const [a, b] = key.split('|');
            ufUnion(a, b);
        }
        const roots = new Set(ids.map((id) => ufFind(id)));
        if (roots.size <= 1) return;

        let bridged = false;
        for (const c of candidates) {
            if (ufFind(c.a) !== ufFind(c.b)) {
                finalEdges.add(c.key);
                linkCount.set(c.a, (linkCount.get(c.a) ?? 0) + 1);
                linkCount.set(c.b, (linkCount.get(c.b) ?? 0) + 1);
                bridged = true;
                adds++;
                break;
            }
        }
        if (!bridged) return;
    }
}

// ---------------------------------------------------------------------------
// Connection Generation
// ---------------------------------------------------------------------------

/**
 * Generate connections between nodes using Delaunay triangulation.
 *
 * 5-phase algorithm:
 *  1. Ensure minimum links per star (shortest Delaunay edges first)
 *  2. Fill additional edges up to maxLinksPerStar
 *  3. Prune near-zero-angle (<15°) connections (visual clutter)
 *  4. Prune connections passing too close to intermediate stars
 *  5. If the graph is disconnected, re-add shortest Delaunay edges until connected
 *
 * Returns unidirectional connections (sourceId < targetId by sort order).
 * Consumer converts to bidirectional if needed.
 *
 * @param nodes         - Items with { id, x, y }
 * @param maxDistance    - Max edge length (default Infinity)
 * @param minLinks      - Min connections per node (default 1)
 * @param maxLinks      - Max connections per node (default 6)
 * @param passThroughClearancePx - Lane margin: same px used later for sampled lane centerlines vs stars.
 * @param laneCurveVsPruneBias - 0..1. Phase 4 tests the **straight chord** against clearance
 *   `passThroughClearancePx * (1 - bias)`. **0** = prune/reconnect aggressively (topology); **1** = do not
 *   prune for pass-through (keep edges; lane solver uses **curves** to satisfy lane margin).
 * @returns Canonical unidirectional connections
 */
export function generateConnections<T extends Connectable>(
    nodes: T[],
    maxDistance: number = Infinity,
    minLinks: number = 1,
    maxLinks: number = 6,
    passThroughClearancePx: number = 75,
    laneCurveVsPruneBias: number = 0,
): MapConnection[] {
    if (nodes.length < 2) return [];

    // Delaunay triangulation
    const points = nodes.map(n => [n.x, n.y] as [number, number]);
    const delaunay = Delaunay.from(points);

    // Build adjacency lists with distances
    const nodeEdges = new Map<string, { targetId: string; distance: number }[]>();
    nodes.forEach(n => nodeEdges.set(n.id, []));

    for (let i = 0; i < nodes.length; i++) {
        for (const j of delaunay.neighbors(i)) {
            if (i < j) {
                const a = nodes[i];
                const b = nodes[j];
                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= maxDistance) {
                    nodeEdges.get(a.id)!.push({ targetId: b.id, distance: dist });
                    nodeEdges.get(b.id)!.push({ targetId: a.id, distance: dist });
                }
            }
        }
    }

    // Sort edges by distance (shortest first)
    nodeEdges.forEach(edges => edges.sort((a, b) => a.distance - b.distance));

    const finalEdges = new Set<string>();
    const linkCount = new Map<string, number>();
    nodes.forEach(n => linkCount.set(n.id, 0));

    const edgeKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`;

    // ── Phase 1: Ensure minimum links ──────────────────────────────────────
    for (const node of nodes) {
        const edges = nodeEdges.get(node.id)!;
        for (const edge of edges) {
            if (linkCount.get(node.id)! >= minLinks) break;
            if (linkCount.get(edge.targetId)! >= maxLinks) continue;

            const key = edgeKey(node.id, edge.targetId);
            if (!finalEdges.has(key)) {
                finalEdges.add(key);
                linkCount.set(node.id, linkCount.get(node.id)! + 1);
                linkCount.set(edge.targetId, linkCount.get(edge.targetId)! + 1);
            }
        }
    }

    // ── Phase 2: Fill up to maxLinks ───────────────────────────────────────
    for (const node of nodes) {
        const edges = nodeEdges.get(node.id)!;
        for (const edge of edges) {
            if (linkCount.get(node.id)! >= maxLinks) break;
            if (linkCount.get(edge.targetId)! >= maxLinks) continue;

            const key = edgeKey(node.id, edge.targetId);
            if (!finalEdges.has(key)) {
                finalEdges.add(key);
                linkCount.set(node.id, linkCount.get(node.id)! + 1);
                linkCount.set(edge.targetId, linkCount.get(edge.targetId)! + 1);
            }
        }
    }

    // ── Phase 3: Prune near-zero-angle connections (< 15°) ────────────────
    const MIN_ANGLE_RAD = (15 * Math.PI) / 180;
    const posMap = new Map(nodes.map(n => [n.id, n]));

    let changed = true;
    while (changed) {
        changed = false;
        for (const node of nodes) {
            const edges: { key: string; targetId: string; angle: number; dist: number }[] = [];
            finalEdges.forEach(key => {
                const [aId, bId] = key.split('|');
                let targetId: string | null = null;
                if (aId === node.id) targetId = bId;
                else if (bId === node.id) targetId = aId;
                if (!targetId) return;

                const target = posMap.get(targetId)!;
                const dx = target.x - node.x;
                const dy = target.y - node.y;
                edges.push({ key, targetId, angle: Math.atan2(dy, dx), dist: Math.sqrt(dx * dx + dy * dy) });
            });

            if (edges.length < 2) continue;
            edges.sort((a, b) => a.angle - b.angle);

            for (let i = 0; i < edges.length; i++) {
                const curr = edges[i];
                const next = edges[(i + 1) % edges.length];
                let angleDiff = next.angle - curr.angle;
                if (angleDiff < 0) angleDiff += 2 * Math.PI;

                if (angleDiff < MIN_ANGLE_RAD) {
                    const toRemove = curr.dist > next.dist ? curr : next;
                    const sc = linkCount.get(node.id)!;
                    const tc = linkCount.get(toRemove.targetId)!;
                    if (sc > minLinks && tc > minLinks) {
                        finalEdges.delete(toRemove.key);
                        linkCount.set(node.id, sc - 1);
                        linkCount.set(toRemove.targetId, tc - 1);
                        changed = true;
                        break;
                    }
                }
            }
        }
    }

    // ── Phase 4: Prune pass-through connections (straight chord vs stars only) ──
    const b = Math.min(1, Math.max(0, laneCurveVsPruneBias));
    const clearance = Math.max(0, passThroughClearancePx * (1 - b));

    changed = true;
    while (changed) {
        changed = false;
        for (const key of Array.from(finalEdges)) {
            const [aId, bId] = key.split('|');
            const a = posMap.get(aId)!;
            const b = posMap.get(bId)!;

            let passesThrough = false;
            for (const other of nodes) {
                if (other.id === aId || other.id === bId) continue;
                if (pointToSegmentDistance(other.x, other.y, a.x, a.y, b.x, b.y) < clearance) {
                    passesThrough = true;
                    break;
                }
            }

            if (passesThrough) {
                const ac = linkCount.get(aId)!;
                const bc = linkCount.get(bId)!;
                if (ac > minLinks && bc > minLinks) {
                    finalEdges.delete(key);
                    linkCount.set(aId, ac - 1);
                    linkCount.set(bId, bc - 1);
                    changed = true;
                }
            }
        }
    }

    // ── Phase 5: Restore global connectivity (G-1) ─────────────────────
    // Phases 3–4 can disconnect the graph. Re-add shortest Delaunay edges that
    // bridge components until the graph is connected. May exceed maxLinks on an
    // endpoint — connectivity overrides degree caps for these bridge edges.
    ensureConnectedGraph(nodes, finalEdges, linkCount, nodeEdges, edgeKey);

    // ── Build result ──────────────────────────────────────────────────────
    const connections: MapConnection[] = [];
    finalEdges.forEach(key => {
        const [sourceId, targetId] = key.split('|');
        const s = posMap.get(sourceId)!;
        const t = posMap.get(targetId)!;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        connections.push({ sourceId, targetId, distance: Math.sqrt(dx * dx + dy * dy) });
    });

    return connections;
}

// ---------------------------------------------------------------------------
// Utility re-exports
// ---------------------------------------------------------------------------

export { pointToSegmentDistance };
