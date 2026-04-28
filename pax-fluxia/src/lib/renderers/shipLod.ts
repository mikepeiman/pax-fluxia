import type { StarState } from '$lib/types/game.types';

export type ShipLodLevel = 'full' | 'balanced' | 'reduced' | 'critical';

export interface ShipLodStats {
    totalActiveOrbitShips: number;
    totalTravelingShips: number;
    totalDamagedShips: number;
    baseOrbitVisuals: number;
    baseDamagedVisuals: number;
    totalVisualPressure: number;
    starsWithOrbitals: number;
    starsWithDamaged: number;
}

export interface ShipLodPlan {
    level: ShipLodLevel;
    stats: ShipLodStats;
    orbitVisualBudget: number;
    orbitScale: number;
    maxOrbitVisualsPerStar: number;
    damagedVisualBudget: number;
    damagedScale: number;
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

const BALANCED_PRESSURE_THRESHOLD = 9_000;
const REDUCED_PRESSURE_THRESHOLD = 18_000;
const CRITICAL_PRESSURE_THRESHOLD = 36_000;
const BALANCED_ORBIT_CAP_PER_STAR = 48;
const REDUCED_ORBIT_CAP_PER_STAR = 24;
const CRITICAL_ORBIT_CAP_PER_STAR = 12;
const BALANCED_DAMAGED_CAP_PER_STAR = 6;
const REDUCED_DAMAGED_CAP_PER_STAR = 4;
const CRITICAL_DAMAGED_CAP_PER_STAR = 2;

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

    const requestedGlowOn = glowRadius > 0;
    const requestedOutlineOn = outlineOn !== false;

    let level: ShipLodLevel = 'full';
    let orbitVisualBudget = stats.baseOrbitVisuals;
    let damagedVisualBudget = stats.baseDamagedVisuals;
    let maxOrbitVisualsPerStar = Math.max(1, maxVisualPerStar);
    let maxDamagedVisualsPerStar = Math.max(1, stats.totalDamagedShips);
    let effectiveOutlineOn = requestedOutlineOn;
    let effectiveGlowOn = requestedGlowOn;

    if (stats.totalVisualPressure >= CRITICAL_PRESSURE_THRESHOLD) {
        level = 'critical';
        orbitVisualBudget = Math.max(2_048, stats.starsWithOrbitals * 10);
        damagedVisualBudget = Math.max(192, stats.starsWithDamaged);
        maxOrbitVisualsPerStar = Math.min(
            maxOrbitVisualsPerStar,
            CRITICAL_ORBIT_CAP_PER_STAR,
        );
        maxDamagedVisualsPerStar = CRITICAL_DAMAGED_CAP_PER_STAR;
        effectiveOutlineOn = false;
        effectiveGlowOn = false;
    } else if (stats.totalVisualPressure >= REDUCED_PRESSURE_THRESHOLD) {
        level = 'reduced';
        orbitVisualBudget = Math.max(3_072, stats.starsWithOrbitals * 16);
        damagedVisualBudget = Math.max(256, stats.starsWithDamaged * 2);
        maxOrbitVisualsPerStar = Math.min(
            maxOrbitVisualsPerStar,
            REDUCED_ORBIT_CAP_PER_STAR,
        );
        maxDamagedVisualsPerStar = REDUCED_DAMAGED_CAP_PER_STAR;
        effectiveOutlineOn = false;
        effectiveGlowOn = false;
    } else if (stats.totalVisualPressure >= BALANCED_PRESSURE_THRESHOLD) {
        level = 'balanced';
        orbitVisualBudget = Math.max(4_096, stats.starsWithOrbitals * 24);
        damagedVisualBudget = Math.max(384, stats.starsWithDamaged * 3);
        maxOrbitVisualsPerStar = Math.min(
            maxOrbitVisualsPerStar,
            BALANCED_ORBIT_CAP_PER_STAR,
        );
        maxDamagedVisualsPerStar = BALANCED_DAMAGED_CAP_PER_STAR;
        effectiveOutlineOn = requestedOutlineOn;
        effectiveGlowOn = false;
    }

    orbitVisualBudget = Math.min(stats.baseOrbitVisuals, orbitVisualBudget);
    damagedVisualBudget = Math.min(
        stats.baseDamagedVisuals,
        damagedVisualBudget,
    );

    return {
        level,
        stats,
        orbitVisualBudget,
        orbitScale:
            stats.baseOrbitVisuals > 0
                ? Math.min(1, orbitVisualBudget / stats.baseOrbitVisuals)
                : 1,
        maxOrbitVisualsPerStar,
        damagedVisualBudget,
        damagedScale:
            stats.baseDamagedVisuals > 0
                ? Math.min(1, damagedVisualBudget / stats.baseDamagedVisuals)
                : 1,
        maxDamagedVisualsPerStar,
        outlineOn: effectiveOutlineOn,
        glowOn: effectiveGlowOn,
    };
}

export function resolveScaledVisualCount(
    actualCount: number,
    baseVisualCount: number,
    scale: number,
): number {
    if (actualCount <= 0 || baseVisualCount <= 0) return 0;
    if (!Number.isFinite(scale) || scale >= 0.999) {
        return Math.min(actualCount, baseVisualCount);
    }
    return Math.max(
        1,
        Math.min(actualCount, Math.floor(baseVisualCount * scale)),
    );
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
    }

    return {
        totalActiveOrbitShips,
        totalTravelingShips,
        totalDamagedShips,
        baseOrbitVisuals,
        baseDamagedVisuals: totalDamagedShips,
        totalVisualPressure:
            baseOrbitVisuals + totalTravelingShips + totalDamagedShips,
        starsWithOrbitals,
        starsWithDamaged,
    };
}
