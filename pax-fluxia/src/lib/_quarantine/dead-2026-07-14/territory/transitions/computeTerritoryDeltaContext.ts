// ---------------------------------------------------------------------------
// Compute which territories are affected by the conquest.
// ---------------------------------------------------------------------------

import type { TerritoryBoundarySnapshot, TerritoryDeltaContext } from './types';

/**
 * Identify territories affected by the current conquest event.
 * A territory is affected if any of its starIds intersect changedSiteIds.
 */
export function computeTerritoryDeltaContext(
    prev: TerritoryBoundarySnapshot[],
    next: TerritoryBoundarySnapshot[],
    changedSiteIds: Set<string>,
): TerritoryDeltaContext {
    const affectedTerritoryIds = new Set<string>();

    // Check both prev and next — territory may exist in one but not the other
    for (const snapshot of [...prev, ...next]) {
        for (const starId of snapshot.starIds) {
            if (changedSiteIds.has(starId)) {
                affectedTerritoryIds.add(snapshot.territoryId);
                break;
            }
        }
    }

    return { changedSiteIds, affectedTerritoryIds };
}
