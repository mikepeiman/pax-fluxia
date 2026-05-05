import type { StarConnection, StarState } from '$lib/types/game.types';
import type {
    OwnershipSnapshot,
    TerritoryConquestEvent,
    VirtualStar,
} from '../../contracts/OwnershipContracts';

export function buildOwnershipStarOwners(
    stars: readonly StarState[],
): Map<string, string> {
    const starOwners = new Map<string, string>();
    for (const star of stars) {
        if (star.ownerId) {
            starOwners.set(star.id, star.ownerId);
        }
    }
    return starOwners;
}

export function buildOwnershipContestedLaneIds(
    lanes: readonly StarConnection[],
    starOwners: ReadonlyMap<string, string>,
): string[] {
    const contestedLaneIds: string[] = [];
    for (const lane of lanes) {
        const ownerA = starOwners.get(lane.sourceId);
        const ownerB = starOwners.get(lane.targetId);
        if (ownerA && ownerB && ownerA !== ownerB) {
            contestedLaneIds.push(`${lane.sourceId}:${lane.targetId}`);
        }
    }
    return contestedLaneIds;
}

export function hashOwnershipState(
    starOwners: ReadonlyMap<string, string>,
    virtualStarCount: number,
): string {
    let hash = 2166136261;
    const entries = [...starOwners.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [starId, ownerId] of entries) {
        for (let i = 0; i < starId.length; i += 1) {
            hash ^= starId.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        hash ^= 0x7c;
        hash = Math.imul(hash, 16777619);
        for (let i = 0; i < ownerId.length; i += 1) {
            hash ^= ownerId.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        hash ^= 0x1f;
        hash = Math.imul(hash, 16777619);
    }
    hash ^= virtualStarCount;
    hash = Math.imul(hash, 16777619);
    return (hash >>> 0).toString(36);
}

export function buildOwnershipVersion(
    starOwners: ReadonlyMap<string, string>,
    virtualStarCount: number,
): string {
    return `ownership:${hashOwnershipState(starOwners, virtualStarCount)}`;
}

export function buildOwnershipSnapshotFromStarState(params: {
    stars: readonly StarState[];
    lanes: readonly StarConnection[];
    conquestEvents?: readonly TerritoryConquestEvent[];
    virtualStars?: readonly VirtualStar[];
}): OwnershipSnapshot {
    const starOwners = buildOwnershipStarOwners(params.stars);
    const virtualStars = params.virtualStars ? [...params.virtualStars] : [];
    return {
        version: buildOwnershipVersion(starOwners, virtualStars.length),
        starOwners,
        contestedLaneIds: buildOwnershipContestedLaneIds(params.lanes, starOwners),
        conquestEvents: params.conquestEvents ? [...params.conquestEvents] : [],
        virtualStars,
    };
}

export function withOwnershipSnapshotConquestEvents(
    snapshot: OwnershipSnapshot,
    conquestEvents: readonly TerritoryConquestEvent[],
): OwnershipSnapshot {
    if (!conquestEvents.length && snapshot.conquestEvents.length === 0) {
        return snapshot;
    }
    return {
        version: snapshot.version,
        starOwners: snapshot.starOwners,
        contestedLaneIds: snapshot.contestedLaneIds,
        conquestEvents: [...conquestEvents],
        virtualStars: snapshot.virtualStars,
    };
}
