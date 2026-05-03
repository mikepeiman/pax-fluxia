// ============================================================================
// Single-source CX (corridor) virtual sites — all render families should use this.
// Cross-owner lanes: samples split at half arc-length when a polyline resolver is provided.
// ============================================================================

import type { StarState, StarConnection } from '$lib/types/game.types';

const EPSILON = 1e-6;

function polylineArcLength(pts: ReadonlyArray<readonly [number, number]>): number {
    let L = 0;
    for (let i = 1; i < pts.length; i++) {
        const dx = pts[i][0] - pts[i - 1][0];
        const dy = pts[i][1] - pts[i - 1][1];
        L += Math.hypot(dx, dy);
    }
    return L;
}

function pointOnPolylineAtArcLength(
    pts: ReadonlyArray<readonly [number, number]>,
    dist: number,
): { x: number; y: number } {
    if (pts.length === 0) return { x: 0, y: 0 };
    if (pts.length === 1) return { x: pts[0][0], y: pts[0][1] };
    let remaining = Math.max(0, dist);
    for (let i = 1; i < pts.length; i++) {
        const ax = pts[i - 1][0];
        const ay = pts[i - 1][1];
        const bx = pts[i][0];
        const by = pts[i][1];
        const segLen = Math.hypot(bx - ax, by - ay);
        if (segLen < EPSILON) continue;
        if (remaining <= segLen) {
            const t = remaining / segLen;
            return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t };
        }
        remaining -= segLen;
    }
    const last = pts[pts.length - 1];
    return { x: last[0], y: last[1] };
}

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
    if (!Number.isFinite(weight)) return fallback;
    return Math.max(0, weight);
}

function pointAlongConnection(
    t: number,
    usePoly: boolean,
    poly: ReadonlyArray<readonly [number, number]> | undefined,
    pathLen: number,
    ax: number,
    ay: number,
    dx: number,
    dy: number,
): { x: number; y: number } {
    if (usePoly && poly) {
        return pointOnPolylineAtArcLength(poly, t * pathLen);
    }
    return { x: ax + dx * t, y: ay + dy * t };
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
    lanePolylineResolver?: (a: string, b: string) => [number, number][] | undefined,
    includeCrossOwnerMidpointPair = true,
    includeSameOwnerDistributedSamples = true,
    includeCrossOwnerDistributedSamples = true,
    crossOwnerMidpointPairWeight = weightMultiplier,
    crossOwnerMidpointPairCount = 1,
    crossOwnerMidpointPairSpacing = 45,
    endpointExclusionPx = 0,
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
    const midpointPairWeight = clampWeight(crossOwnerMidpointPairWeight, weight);
    const midpointPairCount = Math.max(
        1,
        Math.min(10, Math.round(crossOwnerMidpointPairCount || 1)),
    );
    const midpointPairSpacingPx =
        Number.isFinite(crossOwnerMidpointPairSpacing) &&
        crossOwnerMidpointPairSpacing > 0
            ? crossOwnerMidpointPairSpacing
            : 45;
    const endpointExclusion =
        Number.isFinite(endpointExclusionPx) && endpointExclusionPx > 0
            ? endpointExclusionPx
            : 0;

    const sites: BuiltCorridorVirtualSite[] = [];

    for (const conn of normalizedConnections) {
        const starA = starMap.get(conn.sourceId);
        const starB = starMap.get(conn.targetId);
        if (!starA || !starB) continue;
        if (!starA.ownerId || !starB.ownerId) continue;

        const poly = lanePolylineResolver?.(conn.sourceId, conn.targetId);
        const usePoly = poly != null && poly.length >= 2;

        const dx = starB.x - starA.x;
        const dy = starB.y - starA.y;
        const chordDist = Math.hypot(dx, dy);
        if (chordDist <= EPSILON) continue;

        const pathLen = usePoly ? polylineArcLength(poly) : chordDist;
        if (pathLen <= EPSILON) continue;
        const interiorStart = Math.min(endpointExclusion, pathLen * 0.5);
        const interiorEnd = Math.max(interiorStart, pathLen - endpointExclusion);

        const nSites =
            countMode != null
                ? countMode
                : Math.max(0, Math.floor(pathLen / spacingPx) - 1);

        const sameOwner = starA.ownerId === starB.ownerId;
        const halfArc = usePoly ? pathLen * 0.5 : null;

        if (sameOwner && !includeSameOwnerDistributedSamples) continue;
        if (!sameOwner && !includeCrossOwnerMidpointPair && !includeCrossOwnerDistributedSamples) {
            continue;
        }

        if (!sameOwner && includeCrossOwnerMidpointPair) {
            const midpointOffset = Math.min(
                Math.max(midpointPairSpacingPx * 0.5, 10),
                Math.max(pathLen * 0.18, 12),
            );
            const midpointDistance = pathLen * 0.5;
            const centeredOffsetCount = (midpointPairCount - 1) * 0.5;
            for (let pairIndex = 0; pairIndex < midpointPairCount; pairIndex++) {
                const laneShift =
                    (pairIndex - centeredOffsetCount) * midpointPairSpacingPx;
                const leftDistance = Math.max(
                    interiorStart,
                    Math.min(interiorEnd, midpointDistance - midpointOffset + laneShift),
                );
                const rightDistance = Math.max(
                    interiorStart,
                    Math.min(interiorEnd, midpointDistance + midpointOffset + laneShift),
                );
                if (rightDistance - leftDistance <= EPSILON) {
                    continue;
                }
                const leftPoint = pointAlongConnection(
                    leftDistance / pathLen,
                    usePoly,
                    poly,
                    pathLen,
                    starA.x,
                    starA.y,
                    dx,
                    dy,
                );
                const rightPoint = pointAlongConnection(
                    rightDistance / pathLen,
                    usePoly,
                    poly,
                    pathLen,
                    starA.x,
                    starA.y,
                    dx,
                    dy,
                );
                sites.push({
                    x: leftPoint.x,
                    y: leftPoint.y,
                    weight: midpointPairWeight,
                    ownerId: starA.ownerId,
                    kind: 'corridor',
                    sourceStarA: starA.id,
                    sourceStarB: starB.id,
                    anchorStarId: starA.id,
                });
                sites.push({
                    x: rightPoint.x,
                    y: rightPoint.y,
                    weight: midpointPairWeight,
                    ownerId: starB.ownerId,
                    kind: 'corridor',
                    sourceStarA: starA.id,
                    sourceStarB: starB.id,
                    anchorStarId: starB.id,
                });
            }
        }

        if (nSites <= 0) continue;

        for (let i = 1; i <= nSites; i++) {
            const t = i / (nSites + 1);
            if (!sameOwner && !includeCrossOwnerDistributedSamples) continue;
            if (!sameOwner && Math.abs(t - 0.5) < 0.16) continue;
            const along = t * pathLen;
            if (
                along <= interiorStart + EPSILON ||
                along >= interiorEnd - EPSILON
            ) {
                continue;
            }
            let x: number;
            let y: number;
            let crossT: number;
            if (usePoly) {
                const p = pointOnPolylineAtArcLength(poly, along);
                x = p.x;
                y = p.y;
                crossT = halfArc != null ? (along <= halfArc + EPSILON ? 0 : 1) : t;
            } else {
                x = starA.x + dx * t;
                y = starA.y + dy * t;
                crossT = t;
            }

            let anchor: StarState;
            let ownerId: string;
            if (sameOwner) {
                anchor = starA;
                ownerId = starA.ownerId;
            } else {
                anchor = crossT <= 0.5 + EPSILON ? starA : starB;
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
