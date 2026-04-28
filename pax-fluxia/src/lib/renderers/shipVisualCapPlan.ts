import type { StarState } from '$lib/types/game.types';

export type ShipVisualCapPolicyId = 'fixed_cap';

export interface ShipVisualCapStats {
    totalActiveOrbitShips: number;
    totalTravelingShips: number;
    totalDamagedShips: number;
    baseOrbitVisuals: number;
    baseDamagedVisuals: number;
    totalPotentialVisuals: number;
    starsWithOrbitals: number;
    starsWithDamaged: number;
}

export interface ShipVisualCapPlan {
    policyId: ShipVisualCapPolicyId;
    stats: ShipVisualCapStats;
    orbitVisualCount: number;
    maxOrbitVisualsPerStar: number;
    damagedVisualCount: number;
    maxDamagedVisualsPerStar: number;
    outlineOn: boolean;
    glowOn: boolean;
}

interface ShipVisualCapInputs {
    stars: readonly StarState[];
    incomingByStarId: ReadonlyMap<string, { count: number }>;
    totalTravelingShips: number;
    maxVisualPerStar: number;
    outlineOn: boolean;
    glowRadius: number;
}

export function resolveShipVisualCapPlan({
    stars,
    incomingByStarId,
    totalTravelingShips,
    maxVisualPerStar,
    outlineOn,
    glowRadius,
}: ShipVisualCapInputs): ShipVisualCapPlan {
    const stats = collectShipVisualCapStats(
        stars,
        incomingByStarId,
        totalTravelingShips,
        maxVisualPerStar,
    );

    return {
        policyId: 'fixed_cap',
        stats,
        orbitVisualCount: stats.baseOrbitVisuals,
        maxOrbitVisualsPerStar: Math.max(1, maxVisualPerStar),
        damagedVisualCount: stats.baseDamagedVisuals,
        maxDamagedVisualsPerStar: Math.max(1, maxVisualPerStar),
        outlineOn: outlineOn !== false,
        glowOn: glowRadius > 0,
    };
}

function collectShipVisualCapStats(
    stars: readonly StarState[],
    incomingByStarId: ReadonlyMap<string, { count: number }>,
    totalTravelingShips: number,
    maxVisualPerStar: number,
): ShipVisualCapStats {
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
