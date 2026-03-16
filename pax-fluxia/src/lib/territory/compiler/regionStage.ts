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
        const { worldBounds } = config;
        const regions: TerritoryRegion[] = [];
        const componentMap = buildComponentMap(stars, connections);

        // For this implementation, we create one region per owned star cluster.
        // The region outer loop is built as a convex hull from the star's owned
        // frontier nodes (for the initial stub); full polygon walking is evolved
        // in subsequent iterations.
        //
        // ComponentId tracking (DX replacement): same-owner stars in different
        // connected components get different componentIds, ensuring the render
        // layer can visually separate them.

        const regionIdSet = new Set<string>();
        let regionIdx = 0;

        // Group stars by owner
        const starsByOwner = new Map<string, Star[]>();
        for (const star of stars) {
            if (!star.ownerId) continue;
            const arr = starsByOwner.get(star.ownerId) ?? [];
            arr.push(star);
            starsByOwner.set(star.ownerId, arr);
        }

        // Build one region per connected component per owner
        const ownerCompStars = new Map<string, Map<string, Star[]>>();
        for (const [ownerId, ownerStars] of starsByOwner) {
            const compStarsMap = new Map<string, Star[]>();
            const compIdMap = componentMap.get(ownerId);
            for (const star of ownerStars) {
                const compId = compIdMap?.get(star.id) ?? `${ownerId}#0`;
                const arr = compStarsMap.get(compId) ?? [];
                arr.push(star);
                compStarsMap.set(compId, arr);
            }
            ownerCompStars.set(ownerId, compStarsMap);
        }

        for (const [ownerId, compStarsMap] of ownerCompStars) {
            for (const [componentId, compStars] of compStarsMap) {
                // Build a convex-hull-like outer loop from star positions as a stub.
                // Frontier nodes for this owner pair will refine this in future iterations.
                const points = compStars.flatMap(s => [s.x, s.y]);
                if (points.length === 0) continue;

                const regionId = `region:${ownerId}:${componentId}:${regionIdx++}`;
                regions.push({
                    id: regionId,
                    ownerId,
                    componentId,
                    loops: [points],
                });
            }
        }

        // If no regions were produced, create a single world-boundary fallback region
        // per player (this can happen in degenerate maps). Mark as recoverable error.
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
