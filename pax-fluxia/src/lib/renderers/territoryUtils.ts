import type { StarState, StarConnection } from '../types/game.types';
import { GAME_CONFIG } from '../config/game.config';

/**
 * Result of cluster analysis for a single star.
 */
export interface ClusterInfo {
    /** Unique cluster index (0-based, globally unique across all players). */
    clusterIdx: number;
    /** The original player/owner ID. */
    ownerId: string;
}

/**
 * Find connected components among same-owner stars using BFS.
 *
 * When TERRITORY_CLUSTER_SPLIT is OFF: returns per-player grouping
 * (all stars of the same owner share one clusterIdx — old behavior).
 *
 * When TERRITORY_CLUSTER_SPLIT is ON: returns per-connected-component grouping
 * (disconnected groups of same-owner stars get different clusterIdx values).
 *
 * @returns Map from star ID → ClusterInfo
 */
export function findConnectedClustersOptimized(
    ownedStars: StarState[],
    connections: StarConnection[],
    starById: Map<string, StarState>,
): Map<string, ClusterInfo> {
    const result = new Map<string, ClusterInfo>();

    if (!GAME_CONFIG.TERRITORY_CLUSTER_SPLIT) {
        // ── Fallback: per-player grouping (old behavior) ──
        const ownerToIdx = new Map<string, number>();
        let nextIdx = 0;
        for (const s of ownedStars) {
            if (!ownerToIdx.has(s.ownerId!)) {
                ownerToIdx.set(s.ownerId!, nextIdx++);
            }
            result.set(s.id, {
                clusterIdx: ownerToIdx.get(s.ownerId!)!,
                ownerId: s.ownerId!,
            });
        }
        return result;
    }

    // ── Cluster split: BFS connected components ──

    // Build adjacency list: only same-owner connections
    const adj = new Map<string, string[]>();
    for (const s of ownedStars) {
        adj.set(s.id, []);
    }
    for (const conn of connections) {
        const a = starById.get(conn.sourceId);
        const b = starById.get(conn.targetId);
        if (!a?.ownerId || !b?.ownerId || a.ownerId !== b.ownerId) continue;
        adj.get(conn.sourceId)?.push(conn.targetId);
        adj.get(conn.targetId)?.push(conn.sourceId);
    }

    // BFS to find connected components
    const visited = new Set<string>();
    let clusterIdx = 0;

    for (const s of ownedStars) {
        if (visited.has(s.id)) continue;

        const queue = [s.id];
        visited.add(s.id);
        const cluster: string[] = [];

        while (queue.length > 0) {
            const current = queue.shift()!;
            cluster.push(current);

            const neighbors = adj.get(current) ?? [];
            for (const n of neighbors) {
                if (!visited.has(n)) {
                    visited.add(n);
                    queue.push(n);
                }
            }
        }

        for (const starId of cluster) {
            result.set(starId, { clusterIdx, ownerId: s.ownerId! });
        }
        clusterIdx++;
    }

    return result;
}
