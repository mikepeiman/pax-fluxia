import type { StarConnection, StarState } from '$lib/types/game.types';

function hashString(hash: number, value: string): number {
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    hash ^= 0x1f;
    return Math.imul(hash, 16777619);
}

function hashNumber(hash: number, value: number): number {
    return hashString(
        hash,
        Number.isFinite(value) ? value.toFixed(3) : String(value),
    );
}

export function buildTerritorySpatialTopologySignature(
    stars: ReadonlyArray<StarState>,
    lanes: ReadonlyArray<StarConnection>,
): string {
    let hash = 2166136261;
    for (const star of stars) {
        hash = hashString(hash, star.id);
        hash = hashNumber(hash, star.x);
        hash = hashNumber(hash, star.y);
        hash = hashNumber(hash, star.radius);
    }
    hash ^= 0x7c;
    hash = Math.imul(hash, 16777619);
    for (const lane of lanes) {
        hash = hashString(hash, lane.sourceId);
        hash = hashString(hash, lane.targetId);
        hash = hashNumber(hash, lane.distance);
        hash = hashString(hash, lane.lanePathKind ?? '');
        hash = hashString(hash, lane.laneConstraintStatus ?? '');
        const waypoints = lane.laneWaypoints ?? [];
        hash = hashNumber(hash, waypoints.length);
        for (const [x, y] of waypoints) {
            hash = hashNumber(hash, x);
            hash = hashNumber(hash, y);
        }
    }
    return (hash >>> 0).toString(36);
}
