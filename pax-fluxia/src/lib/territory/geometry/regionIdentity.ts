function compareStableIds(a: string, b: string): number {
    return a.localeCompare(b, undefined, {
        numeric: true,
        sensitivity: 'base',
    });
}

export function isVirtualSiteId(id: string): boolean {
    return id.startsWith('corridor_') || id.startsWith('disconnect_');
}

export function splitRegionSiteIds(starIds: ReadonlyArray<string>): {
    anchorStarIds: string[];
    contributingSiteIds: string[];
} {
    const anchorStarIds: string[] = [];
    const contributingSiteIds: string[] = [];

    for (const starId of starIds) {
        if (isVirtualSiteId(starId)) {
            contributingSiteIds.push(starId);
        } else {
            anchorStarIds.push(starId);
        }
    }

    anchorStarIds.sort(compareStableIds);
    contributingSiteIds.sort(compareStableIds);

    return {
        anchorStarIds,
        contributingSiteIds,
    };
}

export function deriveStableRegionId(
    ownerId: string,
    starIds: ReadonlyArray<string>,
): string {
    const { anchorStarIds, contributingSiteIds } = splitRegionSiteIds(starIds);
    const identityIds =
        anchorStarIds.length > 0 ? anchorStarIds : contributingSiteIds;

    if (identityIds.length === 0) {
        return `region:${ownerId}:no-sites`;
    }

    return `region:${ownerId}:${identityIds.join('+')}`;
}
