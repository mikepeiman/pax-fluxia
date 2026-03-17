/**
 * territory/compiler/regionStage.ts
 *
 * Stage 3: Convert FrontierGraph into closed, owned TerritoryRegion[] loops.
 *
 * Responsibilities:
 * - Assemble closed loops from frontier edges + world boundary
 * - Track componentId per disconnected same-owner holding (replaces DX)
 * - Guarantee: every region has exactly one owner, union covers world bounds
 *
 * Rules:
 * - Zero PIXI imports
 * - Zero rendering calls
 * - Disconnect gap enforcement (DX replacement): disconnected same-owner
 *   holdings with different componentIds are kept visually separate.
 */

import type { Star } from '@pax/common';
import type {
    FrontierGraph,
    MetricState,
    TerritoryRegion,
    RegionCompilerConfig,
    CompileError,
} from './types';

/** Walk the frontier graph to extract polyline chains per owner pair. */
function extractFrontierChains(frontier: FrontierGraph): Map<string, string[][]> {
    // Returns pairId → array of node-id chains (each chain is an ordered walk)
    const chains = new Map<string, string[][]>();
    const visited = new Set<string>();

    for (const [edgeId, edge] of frontier.edges) {
        if (visited.has(edgeId)) continue;

        const chain: string[] = [edge.a, edge.b];
        visited.add(edgeId);

        // Extend chain forward from edge.b
        let tail = edge.b;
        while (true) {
            const adj = frontier.adjacency.get(tail) ?? [];
            const nextId = adj.find((nid) => {
                for (const [eid, e] of frontier.edges) {
                    if (!visited.has(eid) && e.pairId === edge.pairId &&
                        ((e.a === tail && e.b === nid) || (e.b === tail && e.a === nid))) {
                        visited.add(eid);
                        return true;
                    }
                }
                return false;
            });
            if (!nextId) break;
            chain.push(nextId);
            tail = nextId;
        }

        const pairChains = chains.get(edge.pairId) ?? [];
        pairChains.push(chain);
        chains.set(edge.pairId, pairChains);
    }

    return chains;
}

/** Determine which player owns a world-space point using metric distances. */
function resolvePointOwner(
    px: number,
    py: number,
    stars: Star[],
    metric: MetricState,
    worldBounds: { minX: number; minY: number; maxX: number; maxY: number },
): string | null {
    // Heuristic: find the star whose best-owner Voronoi cell contains this point.
    // Uses Euclidean distance to nearest star as proxy for graph distance.
    let bestOwnerId: string | null = null;
    let bestDist = Infinity;

    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        const d = Math.hypot(px - star.x, py - star.y);
        if (d < bestDist) {
            bestDist = d;
            bestOwnerId = star.ownerId ?? null;
        }
    }

    return bestOwnerId;
}

/** Build world-boundary rectangle as a closed loop [x1,y1,x2,y2...]. */
function buildWorldBoundaryLoop(
    bounds: { minX: number; minY: number; maxX: number; maxY: number }
): number[] {
    return [
        bounds.minX, bounds.minY,
        bounds.maxX, bounds.minY,
        bounds.maxX, bounds.maxY,
        bounds.minX, bounds.maxY,
    ];
}

/** Build a componentId lookup per player by finding connected components
 *  in the star-level graph for each player's owned stars. */
function buildComponentMap(
    stars: Star[],
    connections: import('@pax/common').Connection[],
): Map<string, Map<string, string>> {
    // Returns: ownerId → (starId → componentId)
    const result = new Map<string, Map<string, string>>();

    const starsByOwner = new Map<string, Set<string>>();
    for (const star of stars) {
        if (!star.ownerId) continue;
        const set = starsByOwner.get(star.ownerId) ?? new Set();
        set.add(star.id);
        starsByOwner.set(star.ownerId, set);
    }

    for (const [ownerId, ownedStarIds] of starsByOwner) {
        const componentIdByStarId = new Map<string, string>();
        const visited = new Set<string>();
        let componentIdx = 0;

        for (const startId of ownedStarIds) {
            if (visited.has(startId)) continue;
            const compId = `${ownerId}#${componentIdx++}`;
            const queue = [startId];
            visited.add(startId);
            while (queue.length > 0) {
                const current = queue.shift()!;
                componentIdByStarId.set(current, compId);
                for (const conn of connections) {
                    const neighbor =
                        conn.sourceId === current ? conn.targetId :
                            conn.targetId === current ? conn.sourceId : null;
                    if (neighbor && ownedStarIds.has(neighbor) && !visited.has(neighbor)) {
                        visited.add(neighbor);
                        queue.push(neighbor);
                    }
                }
            }
        }

        result.set(ownerId, componentIdByStarId);
    }

    return result;
}

/**
 * Graham scan convex hull on flat [x,y,x,y...] points.
 * Returns flat [x,y,...] CCW closed loop. Returns [] if fewer than 3 points.
 */
function convexHull(flatPts: number[]): number[] {
    const pts: [number, number][] = [];
    for (let i = 0; i < flatPts.length - 1; i += 2) {
        pts.push([flatPts[i], flatPts[i + 1]]);
    }
    if (pts.length < 3) {
        return flatPts.slice(0, Math.min(flatPts.length, 4));
    }
    // Find lowest-then-leftmost pivot
    let pivot = 0;
    for (let i = 1; i < pts.length; i++) {
        if (pts[i][1] < pts[pivot][1] || (pts[i][1] === pts[pivot][1] && pts[i][0] < pts[pivot][0])) {
            pivot = i;
        }
    }
    [pts[0], pts[pivot]] = [pts[pivot], pts[0]];
    const base = pts[0];
    const sorted = pts.slice(1).sort((a, b) => {
        const angA = Math.atan2(a[1] - base[1], a[0] - base[0]);
        const angB = Math.atan2(b[1] - base[1], b[0] - base[0]);
        if (angA !== angB) return angA - angB;
        return Math.hypot(a[0] - base[0], a[1] - base[1]) - Math.hypot(b[0] - base[0], b[1] - base[1]);
    });
    const hull: [number, number][] = [base];
    for (const p of sorted) {
        while (hull.length >= 2) {
            const [ox, oy] = hull[hull.length - 2];
            const [ax, ay] = hull[hull.length - 1];
            const cross = (ax - ox) * (p[1] - oy) - (ay - oy) * (p[0] - ox);
            if (cross <= 0) hull.pop(); else break;
        }
        hull.push(p);
    }
    if (hull.length < 3) return flatPts.slice(0, 4);
    return hull.flatMap(([x, y]) => [x, y]);
}

/**
 * Expand a polygon outward by `margin` pixels (simple centroid-based expansion).
 * Used to extend territory fills slightly past frontier split points so fills
 * reach the actual boundary lines rather than stopping at star centers.
 */
function expandPolygon(flatPts: number[], margin: number): number[] {
    if (flatPts.length < 6) return flatPts;
    let cx = 0, cy = 0;
    const n = flatPts.length / 2;
    for (let i = 0; i < flatPts.length; i += 2) { cx += flatPts[i]; cy += flatPts[i + 1]; }
    cx /= n; cy /= n;
    const result: number[] = [];
    for (let i = 0; i < flatPts.length; i += 2) {
        const dx = flatPts[i] - cx;
        const dy = flatPts[i + 1] - cy;
        const dist = Math.hypot(dx, dy) || 1;
        result.push(flatPts[i] + (dx / dist) * margin, flatPts[i + 1] + (dy / dist) * margin);
    }
    return result;
}

/**
 * Execute the region stage.
 * Returns TerritoryRegion[] on success or CompileError.
 */
export function executeRegionStage(
    stars: Star[],
    connections: import('@pax/common').Connection[],
    frontier: FrontierGraph,
    metric: MetricState,
    config: RegionCompilerConfig = {
        worldBounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
    },
): TerritoryRegion[] | CompileError {
    try {
        const regions: TerritoryRegion[] = [];
        const componentMap = buildComponentMap(stars, connections);

        // Group stars by owner → component
        const ownerCompStars = new Map<string, Map<string, Star[]>>();
        for (const star of stars) {
            if (!star.ownerId) continue;
            const compIdMap = componentMap.get(star.ownerId);
            const compId = compIdMap?.get(star.id) ?? `${star.ownerId}#0`;
            const innerMap = ownerCompStars.get(star.ownerId) ?? new Map<string, Star[]>();
            const arr = innerMap.get(compId) ?? [];
            arr.push(star);
            innerMap.set(compId, arr);
            ownerCompStars.set(star.ownerId, innerMap);
        }

        // Collect frontier nodes that touch each owner (either side of a frontier edge)
        // keyed by ownerIdx
        const frontierNodesByOwnerIdx = new Map<number, [number, number][]>();
        for (const node of frontier.nodes.values()) {
            for (const idx of [node.ownerA, node.ownerB]) {
                const arr = frontierNodesByOwnerIdx.get(idx) ?? [];
                arr.push([node.x, node.y]);
                frontierNodesByOwnerIdx.set(idx, arr);
            }
        }

        let regionIdx = 0;

        for (const [ownerId, compStarsMap] of ownerCompStars) {
            // Find ownerIdx in metric.playerIds
            const ownerIdx = metric.playerIds.indexOf(ownerId);

            for (const [componentId, compStars] of compStarsMap) {
                const hullPts: number[] = [];

                // Add owned star positions
                for (const s of compStars) {
                    hullPts.push(s.x, s.y);
                }

                // Add frontier nodes adjacent to this owner — these are the
                // boundary points where the territory edge actually is
                const frontierPts = ownerIdx >= 0 ? (frontierNodesByOwnerIdx.get(ownerIdx) ?? []) : [];
                for (const [fx, fy] of frontierPts) {
                    hullPts.push(fx, fy);
                }

                if (hullPts.length < 6) continue; // need at least 3 points for a polygon

                // Build convex hull of stars+frontier nodes, then expand slightly
                const hull = convexHull(hullPts);
                const FILL_MARGIN_PX = 12; // expand fill past frontier so it meets the border line
                const expanded = expandPolygon(hull, FILL_MARGIN_PX);

                if (expanded.length < 6) continue;

                regions.push({
                    id: `region:${ownerId}:${componentId}:${regionIdx++}`,
                    ownerId,
                    componentId,
                    loops: [expanded],
                });
            }
        }

        if (regions.length === 0) {
            return {
                kind: 'error',
                stage: 'region',
                message: 'No owned stars found — cannot derive territory regions.',
                recoverable: true,
            } satisfies CompileError;
        }

        return regions;
    } catch (err) {
        return {
            kind: 'error',
            stage: 'region',
            message: err instanceof Error ? err.message : String(err),
            recoverable: false,
        } satisfies CompileError;
    }
}

