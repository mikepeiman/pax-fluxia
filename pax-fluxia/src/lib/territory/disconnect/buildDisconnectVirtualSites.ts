import type { StarConnection, StarState } from '$lib/types/game.types';

const EPSILON = 1e-6;

export type DisconnectPairSide = 'negative' | 'positive';

export interface BuiltDisconnectVirtualSite {
    id: string;
    x: number;
    y: number;
    weight: number;
    ownerId: string;
    kind: 'disconnect';
    sourceStarA: string;
    sourceStarB: string;
    /** Enemy star chosen to represent this side of the disconnect gap. */
    anchorStarId: string;
    pairSide: DisconnectPairSide;
}

interface NormalizedConnection {
    sourceId: string;
    targetId: string;
    distance: number;
}

interface EnemyCandidate {
    ownerId: string;
    starId: string;
}

interface EnemyPairCandidates {
    negative: EnemyCandidate | null;
    positive: EnemyCandidate | null;
}

function clampWeight(weight: number, fallback: number): number {
    if (!Number.isFinite(weight)) return fallback;
    return Math.max(0, weight);
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

function normalizePair(
    starA: StarState,
    starB: StarState,
): { sourceStarA: StarState; sourceStarB: StarState } {
    if (starA.id <= starB.id) {
        return { sourceStarA: starA, sourceStarB: starB };
    }
    return { sourceStarA: starB, sourceStarB: starA };
}

function isBetterEnemy(
    candidate: StarState,
    distance: number,
    current: StarState | null,
    currentDistance: number,
): boolean {
    return (
        distance < currentDistance - EPSILON ||
        (Math.abs(distance - currentDistance) <= EPSILON &&
            (current == null ||
                candidate.ownerId! < current.ownerId! ||
                (candidate.ownerId === current.ownerId &&
                    candidate.id < current.id)))
    );
}

function toEnemyCandidate(chosen: StarState | null): EnemyCandidate | null {
    if (!chosen?.ownerId) return null;

    return {
        ownerId: chosen.ownerId,
        starId: chosen.id,
    };
}

function resolveEnemiesForPair(params: {
    midpointX: number;
    midpointY: number;
    nx: number;
    ny: number;
    enemies: readonly StarState[];
}): EnemyPairCandidates {
    let bestNegativeStar: StarState | null = null;
    let bestNegativeDist = Infinity;
    let bestPositiveStar: StarState | null = null;
    let bestPositiveDist = Infinity;
    let bestFallbackStar: StarState | null = null;
    let bestFallbackDist = Infinity;

    for (const enemy of params.enemies) {
        if (!enemy.ownerId) continue;

        const relX = enemy.x - params.midpointX;
        const relY = enemy.y - params.midpointY;
        const projPerp = relX * params.nx + relY * params.ny;
        const dist = Math.hypot(relX, relY);

        if (isBetterEnemy(enemy, dist, bestFallbackStar, bestFallbackDist)) {
            bestFallbackStar = enemy;
            bestFallbackDist = dist;
        }

        if (
            projPerp < -EPSILON &&
            isBetterEnemy(enemy, dist, bestNegativeStar, bestNegativeDist)
        ) {
            bestNegativeStar = enemy;
            bestNegativeDist = dist;
        } else if (
            projPerp > EPSILON &&
            isBetterEnemy(enemy, dist, bestPositiveStar, bestPositiveDist)
        ) {
            bestPositiveStar = enemy;
            bestPositiveDist = dist;
        }
    }

    return {
        negative: toEnemyCandidate(bestNegativeStar ?? bestFallbackStar),
        positive: toEnemyCandidate(bestPositiveStar ?? bestFallbackStar),
    };
}

function disconnectPerpendicularOffset(distance: number): number {
    return Math.max(12, Math.min(distance / 6, 90));
}

function normalizeSites(
    sites: readonly BuiltDisconnectVirtualSite[],
): BuiltDisconnectVirtualSite[] {
    return [...sites].sort((a, b) => a.id.localeCompare(b.id));
}

export function buildDisconnectVirtualSites(
    ownedStars: readonly StarState[],
    allStars: readonly StarState[],
    connections: readonly StarConnection[],
    maxDistance: number,
    weightMultiplier = 0.3,
): BuiltDisconnectVirtualSite[] {
    if (ownedStars.length < 2) return [];

    const effectiveMaxDistance =
        Number.isFinite(maxDistance) && maxDistance > 0 ? maxDistance : Infinity;
    const weight = clampWeight(weightMultiplier, 0.3);

    const normalizedConnections = normalizeConnections(connections);
    const sortedOwnedStars = [...ownedStars]
        .filter((star) => Boolean(star.ownerId))
        .sort((a, b) => {
            if (a.ownerId !== b.ownerId) return a.ownerId.localeCompare(b.ownerId);
            return a.id.localeCompare(b.id);
        });

    const byOwner = new Map<string, StarState[]>();
    for (const star of sortedOwnedStars) {
        const bucket = byOwner.get(star.ownerId) ?? [];
        bucket.push(star);
        byOwner.set(star.ownerId, bucket);
    }

    const sortedAllStars = [...allStars].sort((a, b) => a.id.localeCompare(b.id));
    const sites: BuiltDisconnectVirtualSite[] = [];

    for (const [ownerId, ownerGroup] of byOwner) {
        if (ownerGroup.length < 2) continue;

        const parent = new Map<string, string>();
        for (const star of ownerGroup) parent.set(star.id, star.id);

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

        for (const conn of normalizedConnections) {
            if (!parent.has(conn.sourceId) || !parent.has(conn.targetId)) continue;
            union(conn.sourceId, conn.targetId);
        }

        const components = new Map<string, StarState[]>();
        for (const star of ownerGroup) {
            const root = find(star.id);
            const bucket = components.get(root) ?? [];
            bucket.push(star);
            components.set(root, bucket);
        }

        const orderedComponents = [...components.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([, starsInComponent]) =>
                starsInComponent.sort((a, b) => a.id.localeCompare(b.id)),
            );

        if (orderedComponents.length < 2) continue;

        const enemyStars = sortedAllStars.filter(
            (star) => star.ownerId && star.ownerId !== ownerId,
        );
        if (enemyStars.length === 0) continue;

        for (let i = 0; i < orderedComponents.length; i++) {
            for (let j = i + 1; j < orderedComponents.length; j++) {
                const componentA = orderedComponents[i];
                const componentB = orderedComponents[j];

                for (const rawStarA of componentA) {
                    for (const rawStarB of componentB) {
                        const { sourceStarA: starA, sourceStarB: starB } =
                            normalizePair(rawStarA, rawStarB);

                        const dx = starB.x - starA.x;
                        const dy = starB.y - starA.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist <= EPSILON || dist > effectiveMaxDistance) continue;

                        const ax = dx / dist;
                        const ay = dy / dist;
                        const nx = -ay;
                        const ny = ax;

                        const midpointX = (starA.x + starB.x) / 2;
                        const midpointY = (starA.y + starB.y) / 2;
                        const offset = disconnectPerpendicularOffset(dist);

                        const enemies = resolveEnemiesForPair({
                            midpointX,
                            midpointY,
                            nx,
                            ny,
                            enemies: enemyStars,
                        });
                        const negativeEnemy = enemies.negative;
                        const positiveEnemy = enemies.positive;

                        if (!negativeEnemy || !positiveEnemy) continue;

                        const pairId = `${starA.id}|${starB.id}`;
                        sites.push({
                            id: `disconnect:${pairId}:negative:${negativeEnemy.starId}`,
                            x: midpointX - nx * offset,
                            y: midpointY - ny * offset,
                            weight,
                            ownerId: negativeEnemy.ownerId,
                            kind: 'disconnect',
                            sourceStarA: starA.id,
                            sourceStarB: starB.id,
                            anchorStarId: negativeEnemy.starId,
                            pairSide: 'negative',
                        });
                        sites.push({
                            id: `disconnect:${pairId}:positive:${positiveEnemy.starId}`,
                            x: midpointX + nx * offset,
                            y: midpointY + ny * offset,
                            weight,
                            ownerId: positiveEnemy.ownerId,
                            kind: 'disconnect',
                            sourceStarA: starA.id,
                            sourceStarB: starB.id,
                            anchorStarId: positiveEnemy.starId,
                            pairSide: 'positive',
                        });
                    }
                }
            }
        }
    }

    return normalizeSites(sites);
}
