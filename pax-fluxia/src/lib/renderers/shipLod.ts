import type { StarState } from '$lib/types/game.types';

// Historical filename retained for import stability. The adaptive ship LOD
// system has been removed; this module now resolves a fixed-cap visual plan.

export type ShipLodLevel = 'fixed_cap';

export interface ShipLodStats {
    totalActiveOrbitShips: number;
    totalTravelingShips: number;
    totalDamagedShips: number;
    baseOrbitVisuals: number;
    baseDamagedVisuals: number;
    totalPotentialVisuals: number;
    starsWithOrbitals: number;
    starsWithDamaged: number;
}

export interface ShipLodPlan {
    level: ShipLodLevel;
    stats: ShipLodStats;
    orbitVisualCount: number;
    maxOrbitVisualsPerStar: number;
    damagedVisualCount: number;
    maxDamagedVisualsPerStar: number;
    outlineOn: boolean;
    glowOn: boolean;
}

interface ShipLodInputs {
    stars: readonly StarState[];
    incomingByStarId: ReadonlyMap<string, { count: number }>;
    totalTravelingShips: number;
    maxVisualPerStar: number;
    outlineOn: boolean;
    glowRadius: number;
}

export function resolveShipLodPlan({
    stars,
    incomingByStarId,
    totalTravelingShips,
    maxVisualPerStar,
    outlineOn,
    glowRadius,
}: ShipLodInputs): ShipLodPlan {
    const stats = collectShipLodStats(
        stars,
        incomingByStarId,
        totalTravelingShips,
        maxVisualPerStar,
    );

    return {
        level: 'fixed_cap',
        stats,
        orbitVisualCount: stats.baseOrbitVisuals,
        maxOrbitVisualsPerStar: Math.max(1, maxVisualPerStar),
        damagedVisualCount: stats.baseDamagedVisuals,
        maxDamagedVisualsPerStar: Math.max(1, maxVisualPerStar),
        outlineOn: outlineOn !== false,
        glowOn: glowRadius > 0,
    };
}

function collectShipLodStats(
    stars: readonly StarState[],
    incomingByStarId: ReadonlyMap<string, { count: number }>,
    totalTravelingShips: number,
    maxVisualPerStar: number,
): ShipLodStats {
    let totalActiveOrbitShips = 0;
    let totalDamagedShips = 0;
    let baseOrbitVisuals = 0;
    let baseDamagedVisuals = 0;
    let starsWithOrbitals = 0;
    let starsWithDamaged = 0;

    for (const star of stars) {
        const incomingCount = incomingByStarId.get(star.id)?.count ?? 0;
        const actualOrbitShips = Math.max(0, star.activeShips - incomingCount);
        const damagedShips = Math.max(0, star.damagedShips);
        if (actualOrbitShips > 0) {
            starsWithOrbitals += 1;
        }
        if (damagedShips > 0) {
            starsWithDamaged += 1;
        }
        totalActiveOrbitShips += actualOrbitShips;
        totalDamagedShips += damagedShips;
        baseOrbitVisuals += Math.min(actualOrbitShips, maxVisualPerStar);
        baseDamagedVisuals += Math.min(damagedShips, maxVisualPerStar);
    }

    return {
        totalActiveOrbitShips,
        totalTravelingShips,
        totalDamagedShips,
        baseOrbitVisuals,
        baseDamagedVisuals,
        totalPotentialVisuals:
            baseOrbitVisuals + totalTravelingShips + baseDamagedVisuals,
        starsWithOrbitals,
        starsWithDamaged,
    };
}
