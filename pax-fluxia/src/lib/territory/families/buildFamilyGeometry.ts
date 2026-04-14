import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarConnection, StarState } from '$lib/types/game.types';
import type { CanonicalGeometrySnapshot } from '../contracts/GeometryContracts';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import { readTerritoryRuntimeSettings } from '../integration/TerritorySettingsBridge';
import { compileVectorGeometry } from '../layers/geometry/compiler_UnifiedVectorGeometry';

export function buildOwnershipSnapshotFromStars(
    stars: ReadonlyArray<StarState>,
): OwnershipSnapshot {
    const starOwners = new Map<string, string>();
    for (const star of stars) {
        if (star.ownerId) {
            starOwners.set(star.id, star.ownerId);
        }
    }

    return {
        version: 'render-family-live',
        starOwners,
        contestedLaneIds: [],
        conquestEvents: [],
        virtualStars: [],
    };
}

export function buildCanonicalRenderFamilyGeometry(params: {
    stars: ReadonlyArray<StarState>;
    lanes: ReadonlyArray<StarConnection>;
    worldWidth: number;
    worldHeight: number;
    nowMs: number;
    ownership?: OwnershipSnapshot | null;
}): CanonicalGeometrySnapshot {
    const runtimeSettings = readTerritoryRuntimeSettings(
        GAME_CONFIG as unknown as Record<string, unknown>,
    );

    return compileVectorGeometry({
        nowMs: params.nowMs,
        stars: [...params.stars],
        lanes: [...params.lanes],
        world: {
            width: params.worldWidth,
            height: params.worldHeight,
        },
        tunables: runtimeSettings.tunables,
        ownership:
            params.ownership ?? buildOwnershipSnapshotFromStars(params.stars),
        styleMode: runtimeSettings.selection.styleMode,
    });
}
