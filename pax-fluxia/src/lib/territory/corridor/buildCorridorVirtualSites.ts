// ============================================================================
// Single-source CX (corridor) virtual sites — all render families should use this.
// Includes cross-owner lanes: samples split by chord midpoint (arc-length later).
// ============================================================================

import type { StarState, StarConnection } from '$lib/types/game.types';

const EPSILON = 1e-6;

/** Row shape compatible with `VirtualSite` (corridor kind); consumed by `computeCorridorVirtuals`. */
export interface BuiltCorridorVirtualSite {
    x: number;
    y: number;
    weight: number;
    ownerId: string;
    kind: 'corridor';
    sourceStarA: string;
    sourceStarB: string;
    /** Endpoint star used for cluster / color attribution (cross-owner: side of chord midpoint). */
    anchorStarId: string;
}

interface NormalizedConn {
    sourceId: string;
    targetId: string;
    distance: number;
}

function normalizeConnections(connections: StarConnection[]): NormalizedConn[] {
    const normalized = connections
        .map((conn) => {
            const sourceId = conn.sourceId <= conn.targetId ? conn.sourceId : conn.targetId;
            const targetId = conn.sourceId <= conn.targetId ? conn.targetId : conn.sourceId;
            return { sourceId, targetId, distance: conn.distance ?? 0 };
        })
        .sort((a, b) => {
            if (a.sourceId !== b.sourceId) return a.sourceId.localeCompare(b.sourceId);
            if (a.targetId !== b.targetId) return a.targetId.localeCompare(b.targetId);
            return a.distance - b.distance;
        });

    const deduped: NormalizedConn[] = [];
    let prevKey = '';
    for (const conn of normalized) {
        const key = `${conn.sourceId}|${conn.targetId}|${Math.round(conn.distance * 1000)}`;
        if (key === prevKey) continue;
        deduped.push(conn);
        prevKey = key;
    }
    return deduped;
}

function clampWeight(weight: number, fallback: number): number {
    if (!Number.isFinite(weight) || weight <= 0) return fallback;
    return weight;
}

/**
 * Corridor virtual sites along map connections (same- or cross-owner).
 * Skips edges where either endpoint has no owner (e.g. neutral-only handling TBD).
 */
export function buildCorridorVirtualSites(
    ownedStars: StarState[],
    connections: StarConnection[],
    spacing: number,
    weightMultiplier = 0.5,
    count?: number,
): BuiltCorridorVirtualSite[] {
    if (ownedStars.length === 0 || connections.length === 0) return [];

    const starMap = new Map(
        [...ownedStars]
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((star) => [star.id, star] as const),
    );
    const normalizedConnections = normalizeConnections(connections);

    const spacingPx = Number.isFinite(spacing) && spacing > 0 ? spacing : 60;
    const countMode =
        count != null && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : null;
    const weight = clampWeight(weightMultiplier, 0.5);

    const sites: BuiltCorridorVirtualSite[] = [];

    for (const conn of normalizedConnections) {
        const starA = starMap.get(conn.sourceId);
        const starB = starMap.get(conn.targetId);
        if (!starA || !starB) continue;
        if (!starA.ownerId || !starB.ownerId) continue;

        const dx = starB.x - starA.x;
        const dy = starB.y - starA.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= EPSILON) continue;

        const nSites =
            countMode != null
                ? countMode
                : Math.max(0, Math.floor(dist / spacingPx) - 1);
        if (nSites <= 0) continue;

        const sameOwner = starA.ownerId === starB.ownerId;

        for (let i = 1; i <= nSites; i++) {
            const t = i / (nSites + 1);
            const x = starA.x + dx * t;
            const y = starA.y + dy * t;

            let anchor: StarState;
            let ownerId: string;
            if (sameOwner) {
                anchor = starA;
                ownerId = starA.ownerId;
            } else {
                anchor = t <= 0.5 + EPSILON ? starA : starB;
                ownerId = anchor.ownerId!;
            }

            sites.push({
                x,
                y,
                weight,
                ownerId,
                kind: 'corridor',
                sourceStarA: starA.id,
                sourceStarB: starB.id,
                anchorStarId: anchor.id,
            });
        }
    }

    return sites;
}
