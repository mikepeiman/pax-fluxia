import type { StarState, StarConnection } from '$lib/types/game.types';

export interface VirtualSite {
    x: number;
    y: number;
    weight: number;
    ownerId: string;
    kind: 'corridor' | 'disconnect';
    sourceStarA: string;
    sourceStarB: string;
}

export const DISCONNECT_OWNER_ID = '__disconnect__';

interface NormalizedConnection {
    sourceId: string;
    targetId: string;
    distance: number;
}

const EPSILON = 1e-6;

function normalizeConnections(connections: StarConnection[]): NormalizedConnection[] {
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

function canonicalizeVirtualSites(sites: VirtualSite[]): VirtualSite[] {
    if (sites.length <= 1) return [...sites];

    const normalized = sites.map((site) => {
        const sourceStarA = site.sourceStarA <= site.sourceStarB ? site.sourceStarA : site.sourceStarB;
        const sourceStarB = site.sourceStarA <= site.sourceStarB ? site.sourceStarB : site.sourceStarA;
        return {
            ...site,
            sourceStarA,
            sourceStarB,
        };
    });

    normalized.sort((a, b) => {
        const keyA = `${a.kind}|${a.ownerId}|${a.sourceStarA}|${a.sourceStarB}|${Math.round(a.x * 100)}|${Math.round(a.y * 100)}|${Math.round(a.weight * 1000)}`;
        const keyB = `${b.kind}|${b.ownerId}|${b.sourceStarA}|${b.sourceStarB}|${Math.round(b.x * 100)}|${Math.round(b.y * 100)}|${Math.round(b.weight * 1000)}`;
        return keyA.localeCompare(keyB);
    });

    const deduped: VirtualSite[] = [];
    let prevKey = '';
    for (const site of normalized) {
        const key = `${site.kind}|${site.ownerId}|${site.sourceStarA}|${site.sourceStarB}|${Math.round(site.x * 100)}|${Math.round(site.y * 100)}|${Math.round(site.weight * 1000)}`;
        if (key === prevKey) continue;
        deduped.push(site);
        prevKey = key;
    }

    return deduped;
}

function clampWeight(weight: number, fallback: number): number {
    if (!Number.isFinite(weight) || weight <= 0) return fallback;
    return weight;
}

function nearestEnemyOwnerId(midX: number, midY: number, enemies: StarState[]): string {
    let nearestOwnerId = '';
    let nearestDist = Infinity;
    let nearestStarId = '';

    for (const enemy of enemies) {
        const d = Math.hypot(enemy.x - midX, enemy.y - midY);
        const betterDistance = d < nearestDist - EPSILON;
        const tiedDistance = Math.abs(d - nearestDist) <= EPSILON;
        const betterOwner = tiedDistance && (nearestOwnerId === '' || enemy.ownerId < nearestOwnerId);
        const tiedOwner = tiedDistance && enemy.ownerId === nearestOwnerId && enemy.id < nearestStarId;
        if (betterDistance || betterOwner || tiedOwner) {
            nearestDist = d;
            nearestOwnerId = enemy.ownerId;
            nearestStarId = enemy.id;
        }
    }

    return nearestOwnerId;
}

export function computeCorridorVirtuals(
    ownedStars: StarState[],
    connections: StarConnection[],
    spacing: number,
    weightMultiplier = 0.5,
    count?: number,
): VirtualSite[] {
    if (ownedStars.length === 0 || connections.length === 0) return [];

    const starMap = new Map([...ownedStars]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((star) => [star.id, star] as const));
    const normalizedConnections = normalizeConnections(connections);

    const spacingPx = Number.isFinite(spacing) && spacing > 0 ? spacing : 60;
    const countMode = count != null && Number.isFinite(count)
        ? Math.max(0, Math.floor(count))
        : null;
    const weight = clampWeight(weightMultiplier, 0.5);

    const sites: VirtualSite[] = [];

    for (const conn of normalizedConnections) {
        const starA = starMap.get(conn.sourceId);
        const starB = starMap.get(conn.targetId);
        if (!starA || !starB) continue;
        if (!starA.ownerId || starA.ownerId !== starB.ownerId) continue;

        const dx = starB.x - starA.x;
        const dy = starB.y - starA.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= EPSILON) continue;

        const nSites = countMode != null
            ? countMode
            : Math.max(0, Math.floor(dist / spacingPx) - 1);
        if (nSites <= 0) continue;

        for (let i = 1; i <= nSites; i++) {
            const t = i / (nSites + 1);
            sites.push({
                x: starA.x + dx * t,
                y: starA.y + dy * t,
                weight,
                ownerId: starA.ownerId,
                kind: 'corridor',
                sourceStarA: starA.id,
                sourceStarB: starB.id,
            });
        }
    }

    return canonicalizeVirtualSites(sites);
}

export function computeDisconnectVirtuals(
    ownedStars: StarState[],
    allStars: StarState[],
    connections: StarConnection[],
    maxDistance: number,
    weightMultiplier = 0.3,
): VirtualSite[] {
    if (ownedStars.length < 2 || connections.length === 0) return [];

    const effectiveMaxDistance = Number.isFinite(maxDistance) && maxDistance > 0
        ? maxDistance
        : Infinity;
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
    const sites: VirtualSite[] = [];

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
            .map(([, starsInComponent]) => starsInComponent.sort((a, b) => a.id.localeCompare(b.id)));

        if (orderedComponents.length < 2) continue;

        const enemyStars = sortedAllStars.filter((star) => star.ownerId && star.ownerId !== ownerId);
        if (enemyStars.length === 0) continue;

        for (let i = 0; i < orderedComponents.length; i++) {
            for (let j = i + 1; j < orderedComponents.length; j++) {
                const componentA = orderedComponents[i];
                const componentB = orderedComponents[j];

                for (const starA of componentA) {
                    for (const starB of componentB) {
                        const dist = Math.hypot(starB.x - starA.x, starB.y - starA.y);
                        if (dist > effectiveMaxDistance) continue;

                        const midX = (starA.x + starB.x) / 2;
                        const midY = (starA.y + starB.y) / 2;

                        const enemyOwnerId = nearestEnemyOwnerId(midX, midY, enemyStars);
                        if (!enemyOwnerId) continue;

                        sites.push({
                            x: midX,
                            y: midY,
                            weight,
                            ownerId: enemyOwnerId,
                            kind: 'disconnect',
                            sourceStarA: starA.id,
                            sourceStarB: starB.id,
                        });
                    }
                }
            }
        }
    }

    return canonicalizeVirtualSites(sites);
}
