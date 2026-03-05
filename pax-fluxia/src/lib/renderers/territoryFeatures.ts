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
    /** Owner ID — real player for corridors, synthetic `__disconnect__` for disconnects */
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
): VirtualSite[] {
    const result: VirtualSite[] = [];
    const starMap = new Map(ownedStars.map(s => [s.id, s]));

    for (const conn of connections) {
        const sA = starMap.get(conn.sourceId);
        const sB = starMap.get(conn.targetId);
        if (!sA || !sB || sA.ownerId !== sB.ownerId) continue;

        const dx = sB.x - sA.x, dy = sB.y - sA.y;
        const dist = Math.hypot(dx, dy);
        if (dist < spacing) continue;

        const steps = Math.floor(dist / spacing);
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
 * an enemy virtual site appears at their midpoint, creating a hard territory
 * gap. The middle ~33% between those stars becomes enemy-occupied space.
 *
 * @param ownedStars Stars that have an owner
 * @param connections All star connections (lanes)
 * @param maxDistance Maximum distance to consider (stars farther apart are ignored)
 * @param weightMultiplier Weight relative to base (default 0.3)
 * @returns Array of disconnect VirtualSite objects
 */
export function computeDisconnectVirtuals(
    ownedStars: StarState[],
    connections: StarConnection[],
    maxDistance: number,
    weightMultiplier = 0.3,
): VirtualSite[] {
    const result: VirtualSite[] = [];
    const starMap = new Map(ownedStars.map(s => [s.id, s]));

    // Build set of connected same-owner pairs (bidirectional)
    const connectedPairs = new Set<string>();
    for (const conn of connections) {
        const sA = starMap.get(conn.sourceId);
        const sB = starMap.get(conn.targetId);
        if (!sA || !sB || sA.ownerId !== sB.ownerId) continue;
        connectedPairs.add(`${conn.sourceId}|${conn.targetId}`);
        connectedPairs.add(`${conn.targetId}|${conn.sourceId}`);
    }

    // For each pair of same-owner stars NOT connected, inject enemy virtual site
    for (let i = 0; i < ownedStars.length; i++) {
        for (let j = i + 1; j < ownedStars.length; j++) {
            const sA = ownedStars[i], sB = ownedStars[j];
            if (sA.ownerId !== sB.ownerId) continue;
            if (connectedPairs.has(`${sA.id}|${sB.id}`)) continue;

            const dist = Math.hypot(sB.x - sA.x, sB.y - sA.y);
            if (dist > maxDistance) continue;

            // Place enemy virtual site at midpoint
            result.push({
                x: (sA.x + sB.x) / 2,
                y: (sA.y + sB.y) / 2,
                weight: weightMultiplier,
                ownerId: DISCONNECT_OWNER_ID,
                kind: 'disconnect',
                sourceStarA: sA.id,
                sourceStarB: sB.id,
            });
        }
    }

    return result;
}
