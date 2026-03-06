// ============================================================================
// territoryFeatures.ts — Shared territory computation for all renderers
// ============================================================================
//
// Renderer-agnostic virtual site generation. Used by both PowerVoronoiRenderer
// and DistanceFieldTerritoryRenderer as well as future renderers.
//
// Virtual sites are NEVER mixed into StarState[]. They have their own type,
// own array, and own pipeline. Renderers merge them explicitly when needed.
// ============================================================================

import type { StarState, StarConnection } from '$lib/types/game.types';

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * A virtual territory site — NOT a real star.
 *
 * Virtual sites influence territory shapes but have no gameplay existence.
 * They must NEVER be confused with real stars or used in gameplay computations.
 */
export interface VirtualSite {
    /** World X position */
    x: number;
    /** World Y position */
    y: number;
    /** Influence weight multiplier (relative to real star weight) */
    weight: number;
    /** Owner ID — real player for corridors and disconnects */
    ownerId: string;
    /** Semantic kind — always present, never omitted */
    kind: 'corridor' | 'disconnect';
    /** ID of the first real star that spawned this virtual site */
    sourceStarA: string;
    /** ID of the second real star that spawned this virtual site */
    sourceStarB: string;
}

/** Synthetic owner ID for disconnect virtual sites. Not a real player. */
export const DISCONNECT_OWNER_ID = '__disconnect__';

// ── Corridor Virtual Sites ─────────────────────────────────────────────────

/**
 * Generate corridor virtual sites along same-owner lanes.
 *
 * For each connection between two same-owner stars, places virtual sites
 * at regular intervals along the lane. These push territory outward along
 * connections, creating visible corridors between allied stars.
 *
 * @param ownedStars Stars that have an owner
 * @param connections All star connections (lanes)
 * @param spacing Distance between corridor virtual sites (px)
 * @param weightMultiplier Weight relative to base (default 0.5)
 * @returns Array of corridor VirtualSite objects
 */
export function computeCorridorVirtuals(
    ownedStars: StarState[],
    connections: StarConnection[],
    spacing: number,
    weightMultiplier = 0.5,
    count?: number,
): VirtualSite[] {
    const result: VirtualSite[] = [];
    const starMap = new Map(ownedStars.map(s => [s.id, s]));

    for (const conn of connections) {
        const sA = starMap.get(conn.sourceId);
        const sB = starMap.get(conn.targetId);
        if (!sA || !sB || sA.ownerId !== sB.ownerId) continue;

        const dx = sB.x - sA.x, dy = sB.y - sA.y;
        const dist = Math.hypot(dx, dy);

        // Count mode: fixed number of virtual stars per lane, evenly distributed
        // Spacing mode: virtual stars at fixed pixel intervals
        const steps = count != null ? count + 1 : Math.floor(dist / spacing);
        if (steps < 2) continue;

        for (let step = 1; step < steps; step++) {
            const t = step / steps;
            result.push({
                x: sA.x + dx * t,
                y: sA.y + dy * t,
                weight: weightMultiplier,
                ownerId: sA.ownerId!,
                kind: 'corridor',
                sourceStarA: sA.id,
                sourceStarB: sB.id,
            });
        }
    }

    return result;
}

// ── Disconnect Virtual Sites ───────────────────────────────────────────────

/**
 * Generate disconnect virtual sites between unconnected same-owner stars.
 *
 * When a player owns two stars that are NOT connected by a direct lane,
 * an enemy virtual site appears at their midpoint using the nearest
 * enemy player's ownerId. This makes enemy territory fill the gap
 * naturally through normal influence competition.
 *
 * @param ownedStars Stars that have an owner
 * @param allStars ALL stars (needed to find nearest enemy)
 * @param connections All star connections (lanes)
 * @param maxDistance Maximum distance to consider (stars farther apart are ignored)
 * @param weightMultiplier Weight relative to base (default 0.3)
 * @returns Array of disconnect VirtualSite objects
 */
export function computeDisconnectVirtuals(
    ownedStars: StarState[],
    allStars: StarState[],
    connections: StarConnection[],
    maxDistance: number,
    weightMultiplier = 0.3,
): VirtualSite[] {
    const result: VirtualSite[] = [];

    // Group owned stars by owner
    const byOwner = new Map<string, StarState[]>();
    for (const s of ownedStars) {
        if (!s.ownerId) continue;
        const arr = byOwner.get(s.ownerId) ?? [];
        arr.push(s);
        byOwner.set(s.ownerId, arr);
    }

    // For each owner, find connected components via Union-Find
    // Only same-owner lanes count as connections
    for (const [ownerId, ownerStars] of byOwner) {
        if (ownerStars.length < 2) continue;

        // Union-Find: maps starId → root starId
        const parent = new Map<string, string>();
        for (const s of ownerStars) parent.set(s.id, s.id);

        function find(x: string): string {
            while (parent.get(x) !== x) {
                parent.set(x, parent.get(parent.get(x)!)!); // path compression
                x = parent.get(x)!;
            }
            return x;
        }
        function union(a: string, b: string) {
            const ra = find(a), rb = find(b);
            if (ra !== rb) parent.set(ra, rb);
        }

        // Union all same-owner connected pairs
        for (const conn of connections) {
            const hasA = parent.has(conn.sourceId);
            const hasB = parent.has(conn.targetId);
            if (hasA && hasB) {
                union(conn.sourceId, conn.targetId);
            }
        }

        // For each pair in DIFFERENT components, consider DX site
        const starById = new Map(ownerStars.map(s => [s.id, s]));
        for (let i = 0; i < ownerStars.length; i++) {
            for (let j = i + 1; j < ownerStars.length; j++) {
                const sA = ownerStars[i], sB = ownerStars[j];

                // Same component = connected via allied path = no DX needed
                if (find(sA.id) === find(sB.id)) continue;

                const dist = Math.hypot(sB.x - sA.x, sB.y - sA.y);
                if (dist > maxDistance) continue;

                const midX = (sA.x + sB.x) / 2;
                const midY = (sA.y + sB.y) / 2;

                // Find nearest enemy star to the midpoint
                let nearestEnemyId = '';
                let nearestEnemyDist = Infinity;
                for (const s of allStars) {
                    if (!s.ownerId || s.ownerId === ownerId) continue;
                    const d = Math.hypot(s.x - midX, s.y - midY);
                    if (d < nearestEnemyDist) {
                        nearestEnemyDist = d;
                        nearestEnemyId = s.ownerId;
                    }
                }

                if (!nearestEnemyId) continue;

                result.push({
                    x: midX,
                    y: midY,
                    weight: weightMultiplier,
                    ownerId: nearestEnemyId,
                    kind: 'disconnect',
                    sourceStarA: sA.id,
                    sourceStarB: sB.id,
                });
            }
        }
    }

    return result;
}
