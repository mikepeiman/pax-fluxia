import type { FleetState, PlayerId, StarId } from '$lib/types/game.types';

export interface Fleet {
    id: string;
    sourceId: StarId;
    targetId: StarId;
    ownerId: PlayerId;
    shipCount: number;

    // Movement
    totalDistance: number;
    speed: number;
    progress: number; // 0.0 to 1.0

    /**
     * Update fleet position. Returns true if arrived.
     */
    update(): boolean;

    /**
     * Get serializable state
     */
    getState(): FleetState;
}

export function createFleet(
    config: {
        id: string;
        sourceId: StarId;
        targetId: StarId;
        ownerId: PlayerId;
        shipCount: number;
        totalDistance: number;
        speed: number;
    }
): Fleet {
    let { id, sourceId, targetId, ownerId, shipCount, totalDistance, speed } = config;
    let progress = 0;

    // Calculate progress increment per tick based on speed and distance
    // If distance is 0 (shouldn't happen), arrive immediately
    const progressPerTick = totalDistance > 0 ? speed / totalDistance : 1;

    return {
        id,
        sourceId,
        targetId,
        ownerId,
        shipCount,
        totalDistance,
        speed,
        get progress() { return progress; },

        update(): boolean {
            if (progress >= 1) return true;

            progress += progressPerTick;
            return progress >= 1;
        },

        getState(): FleetState {
            return {
                id,
                sourceId,
                targetId,
                ownerId,
                shipCount,
                progress: Math.min(progress, 1)
            };
        }
    };
}
