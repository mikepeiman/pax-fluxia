import type { StarConnection, StarState } from '$lib/types/game.types';
import { pointInPolygon } from './geometryUtils';

const EPSILON = 1e-6;
const DEFAULT_DEPTH_FACTOR = 0.15;
const DEFAULT_WIDTH_FACTOR = 0.22;

type TerritoryPolygon = {
    ownerId: string;
    points: [number, number][];
};

interface NormalizedConnection {
    sourceId: string;
    targetId: string;
    distance: number;
}

export interface DisconnectZone {
    ownerId: string;
    sourceStarA: string;
    sourceStarB: string;
    midpoint: { x: number; y: number };
    tangentAxis: { x: number; y: number };
    normalAxis: { x: number; y: number };
    depthPx: number;
    halfWidthPx: number;
}

function normalizeConnections(connections: readonly StarConnection[]): NormalizedConnection[] {
    const normalized = connections
        .map((conn) => {
            const sourceId =
                conn.sourceId <= conn.targetId ? conn.sourceId : conn.targetId;
            const targetId =
                conn.sourceId <= conn.targetId ? conn.targetId : conn.sourceId;
            return { sourceId, targetId, distance: conn.distance ?? 0 };
        })
        .sort((a, b) => {
            if (a.sourceId !== b.sourceId) return a.sourceId.localeCompare(b.sourceId);
            if (a.targetId !== b.targetId) return a.targetId.localeCompare(b.targetId);
            return a.distance - b.distance;
        });

    const deduped: NormalizedConnection[] = [];
    let prevKey = '';
    for (const conn of normalized) {
        const key = `${conn.sourceId}|${conn.targetId}|${Math.round(conn.distance * 1000)}`;
        if (key === prevKey) continue;
        deduped.push(conn);
        prevKey = key;
    }

    return deduped;
}

function buildOwnerComponents(
    ownerStars: readonly StarState[],
    connections: readonly NormalizedConnection[],
): ReadonlyArray<readonly StarState[]> {
    const parent = new Map<string, string>();
    for (const star of ownerStars) parent.set(star.id, star.id);

    const find = (id: string): string => {
        let cur = id;
        while (parent.get(cur) !== cur) {
            const next = parent.get(cur)!;
            parent.set(cur, parent.get(next)!);
            cur = next;
        }
        return cur;
    };

    const union = (a: string, b: string) => {
        const ra = find(a);
        const rb = find(b);
        if (ra === rb) return;
        if (ra < rb) parent.set(rb, ra);
        else parent.set(ra, rb);
    };

    for (const conn of connections) {
        if (!parent.has(conn.sourceId) || !parent.has(conn.targetId)) continue;
        union(conn.sourceId, conn.targetId);
    }

    const components = new Map<string, StarState[]>();
    for (const star of ownerStars) {
        const root = find(star.id);
        const bucket = components.get(root) ?? [];
        bucket.push(star);
        components.set(root, bucket);
    }

    return [...components.values()]
        .map((stars) => [...stars].sort((a, b) => a.id.localeCompare(b.id)))
        .sort((a, b) => a[0]!.id.localeCompare(b[0]!.id));
}

export function buildDisconnectZones(
    ownedStars: readonly StarState[],
    connections: readonly StarConnection[],
    maxDistancePx: number,
    depthFactor = DEFAULT_DEPTH_FACTOR,
    fallbackWidthFactor = DEFAULT_WIDTH_FACTOR,
): DisconnectZone[] {
    if (ownedStars.length < 2) return [];

    const effectiveMaxDistance =
        Number.isFinite(maxDistancePx) && maxDistancePx > 0 ? maxDistancePx : Infinity;
    const normalizedConnections = normalizeConnections(connections);
    const starsByOwner = new Map<string, StarState[]>();

    for (const star of ownedStars) {
        if (!star.ownerId) continue;
        const bucket = starsByOwner.get(star.ownerId) ?? [];
        bucket.push(star);
        starsByOwner.set(star.ownerId, bucket);
    }

    const zones: DisconnectZone[] = [];

    for (const [ownerId, ownerGroup] of starsByOwner) {
        if (ownerGroup.length < 2) continue;
        const components = buildOwnerComponents(ownerGroup, normalizedConnections);
        if (components.length < 2) continue;

        for (let i = 0; i < components.length; i++) {
            for (let j = i + 1; j < components.length; j++) {
                const componentA = components[i]!;
                const componentB = components[j]!;

                for (const rawStarA of componentA) {
                    for (const rawStarB of componentB) {
                        const starA = rawStarA.id <= rawStarB.id ? rawStarA : rawStarB;
                        const starB = rawStarA.id <= rawStarB.id ? rawStarB : rawStarA;

                        const dx = starB.x - starA.x;
                        const dy = starB.y - starA.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist <= EPSILON || dist > effectiveMaxDistance) continue;

                        const tangentX = dx / dist;
                        const tangentY = dy / dist;

                        zones.push({
                            ownerId,
                            sourceStarA: starA.id,
                            sourceStarB: starB.id,
                            midpoint: {
                                x: (starA.x + starB.x) / 2,
                                y: (starA.y + starB.y) / 2,
                            },
                            tangentAxis: { x: tangentX, y: tangentY },
                            normalAxis: { x: -tangentY, y: tangentX },
                            depthPx: dist * depthFactor,
                            halfWidthPx: dist * fallbackWidthFactor,
                        });
                    }
                }
            }
        }
    }

    return zones.sort((a, b) => {
        const keyA = `${a.ownerId}|${a.sourceStarA}|${a.sourceStarB}`;
        const keyB = `${b.ownerId}|${b.sourceStarA}|${b.sourceStarB}`;
        return keyA.localeCompare(keyB);
    });
}

function ownerControlsMidpoint(
    territories: ReadonlyArray<TerritoryPolygon>,
    zone: DisconnectZone,
): boolean {
    return territories.some(
        (territory) =>
            territory.ownerId === zone.ownerId &&
            pointInPolygon(zone.midpoint.x, zone.midpoint.y, territory.points),
    );
}

function pointInsideZone(
    point: [number, number],
    zone: DisconnectZone,
): { along: number; perp: number } | null {
    const relX = point[0] - zone.midpoint.x;
    const relY = point[1] - zone.midpoint.y;
    const along = relX * zone.tangentAxis.x + relY * zone.tangentAxis.y;
    const perp = relX * zone.normalAxis.x + relY * zone.normalAxis.y;

    if (
        Math.abs(along) >= zone.depthPx * 0.5 - EPSILON ||
        Math.abs(perp) >= zone.halfWidthPx - EPSILON
    ) {
        return null;
    }

    return { along, perp };
}

export function applyExplicitDisconnectZones(
    territories: TerritoryPolygon[],
    zones: readonly DisconnectZone[],
): number {
    let appliedZoneCount = 0;

    for (const zone of zones) {
        if (!ownerControlsMidpoint(territories, zone)) continue;

        const halfDepth = zone.depthPx * 0.5;
        const halfWidth = zone.halfWidthPx;
        if (halfDepth <= EPSILON || halfWidth <= EPSILON) continue;

        let zoneChanged = false;

        for (const territory of territories) {
            if (territory.ownerId !== zone.ownerId) continue;

            for (let vi = 0; vi < territory.points.length; vi++) {
                const point = territory.points[vi]!;
                const local = pointInsideZone(point, zone);
                if (!local) continue;

                const pushDir = local.along < 0 ? -1 : 1;
                territory.points[vi] = [
                    zone.midpoint.x +
                        zone.tangentAxis.x * halfDepth * pushDir +
                        zone.normalAxis.x * local.perp,
                    zone.midpoint.y +
                        zone.tangentAxis.y * halfDepth * pushDir +
                        zone.normalAxis.y * local.perp,
                ];
                zoneChanged = true;
            }
        }

        if (zoneChanged) {
            appliedZoneCount += 1;
        }
    }

    return appliedZoneCount;
}
