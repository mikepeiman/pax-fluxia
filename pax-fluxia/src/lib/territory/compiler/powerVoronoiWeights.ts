export type TerritoryMsrStarPowerMode = 'linear' | 'squared' | 'exponent';

export interface LegacyTerritoryMsrStarPowerSettings {
    enabled: boolean;
    mode: TerritoryMsrStarPowerMode;
    gain: number;
    exponent: number;
    capPx: number;
}

export const VIRTUAL_SITE_REFERENCE_RADIUS_PX = 75;
const DEFAULT_REAL_STAR_POWER_CAP_PX = 500;
const DEFAULT_TERRITORY_MSR_STAR_BIAS = 0;
const MAX_TERRITORY_MSR_STAR_BIAS = 2;
const OWNERSHIP_GUARD_EPSILON = 1;

function clampFiniteNumber(value: number, fallback: number): number {
    return Number.isFinite(value) ? value : fallback;
}

function clampPositive(value: number, fallback: number): number {
    const numeric = clampFiniteNumber(value, fallback);
    return numeric > 0 ? numeric : fallback;
}

function clampNonNegative(value: number, fallback: number): number {
    const numeric = clampFiniteNumber(value, fallback);
    return numeric >= 0 ? numeric : fallback;
}

function clampMsrStarBias(value: number, fallback: number): number {
    const numeric = clampFiniteNumber(value, fallback);
    if (numeric <= 0) return 0;
    return Math.min(MAX_TERRITORY_MSR_STAR_BIAS, numeric);
}

export function normalizeTerritoryMsrStarBias(
    value: number,
    fallback = DEFAULT_TERRITORY_MSR_STAR_BIAS,
): number {
    return clampMsrStarBias(value, fallback);
}

export function normalizeLegacyTerritoryMsrStarPowerSettings(
    settings: LegacyTerritoryMsrStarPowerSettings,
): LegacyTerritoryMsrStarPowerSettings {
    const mode: TerritoryMsrStarPowerMode =
        settings.mode === 'linear' ||
        settings.mode === 'squared' ||
        settings.mode === 'exponent'
            ? settings.mode
            : 'squared';

    return {
        enabled: settings.enabled !== false,
        mode,
        gain: clampPositive(settings.gain, 1),
        exponent: clampPositive(settings.exponent, 2),
        capPx: clampNonNegative(settings.capPx, DEFAULT_REAL_STAR_POWER_CAP_PX),
    };
}

function buildLegacyRealSiteWeight(
    localMsrPx: number,
    settings: LegacyTerritoryMsrStarPowerSettings,
): number {
    const normalized = normalizeLegacyTerritoryMsrStarPowerSettings(settings);
    if (!normalized.enabled) {
        return 0;
    }

    const scaledMargin = Math.max(
        0,
        Math.min(normalized.capPx, localMsrPx * normalized.gain),
    );
    if (scaledMargin <= 0) {
        return 0;
    }

    if (normalized.mode === 'linear') {
        return scaledMargin;
    }
    if (normalized.mode === 'exponent') {
        return Math.pow(scaledMargin, normalized.exponent);
    }
    return scaledMargin * scaledMargin;
}

export function deriveLegacyTerritoryMsrStarBias(
    settings: LegacyTerritoryMsrStarPowerSettings,
    referenceLocalMsrPx = VIRTUAL_SITE_REFERENCE_RADIUS_PX,
): number {
    const safeMargin = Math.max(0, clampFiniteNumber(referenceLocalMsrPx, 0));
    if (safeMargin <= 0) {
        return 0;
    }

    const legacyWeight = buildLegacyRealSiteWeight(safeMargin, settings);
    if (legacyWeight <= 0) {
        return 0;
    }

    const normalizedMsr =
        safeMargin / (safeMargin + VIRTUAL_SITE_REFERENCE_RADIUS_PX);
    const denominator =
        VIRTUAL_SITE_REFERENCE_RADIUS_PX ** 2 * normalizedMsr;
    if (denominator <= 0) {
        return 0;
    }

    return clampMsrStarBias(
        legacyWeight / denominator,
        DEFAULT_TERRITORY_MSR_STAR_BIAS,
    );
}

export function buildRealSiteWeight(
    localMsrPx: number,
    msrStarBias: number,
): number {
    const safeMargin = Math.max(0, clampFiniteNumber(localMsrPx, 0));
    if (safeMargin <= 0) {
        return 0;
    }

    const normalizedBias = normalizeTerritoryMsrStarBias(msrStarBias);
    if (normalizedBias <= 0) {
        return 0;
    }

    const normalizedMsr =
        safeMargin / (safeMargin + VIRTUAL_SITE_REFERENCE_RADIUS_PX);
    return VIRTUAL_SITE_REFERENCE_RADIUS_PX ** 2 * normalizedBias * normalizedMsr;
}

/**
 * Corridor and disconnect virtual sites still need an absolute spatial scale
 * in power-diagram units. Keep that scale fixed so CX/DX stay effective while
 * remaining independent from the live MSR slider.
 */
export function buildVirtualSiteWeight(multiplier: number): number {
    const safeMultiplier =
        Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 0;
    return VIRTUAL_SITE_REFERENCE_RADIUS_PX ** 2 * safeMultiplier;
}

export interface RealStarOwnershipGuardSite {
    x: number;
    y: number;
    weight: number;
    clearanceRadiusPx?: number;
}

export function clampVirtualSiteWeightForRealStarOwnership(params: {
    x: number;
    y: number;
    weight: number;
    realSites: ReadonlyArray<RealStarOwnershipGuardSite>;
    epsilon?: number;
}): number {
    if (!Number.isFinite(params.weight) || params.weight <= 0) {
        return 0;
    }

    let clampedWeight = params.weight;
    const epsilon =
        Number.isFinite(params.epsilon) && params.epsilon! > 0
            ? params.epsilon!
            : OWNERSHIP_GUARD_EPSILON;

    for (const realSite of params.realSites) {
        const dx = params.x - realSite.x;
        const dy = params.y - realSite.y;
        const clearanceRadius = Math.max(
            0,
            clampFiniteNumber(realSite.clearanceRadiusPx ?? 0, 0),
        );

        const currentClampGapSq = clampedWeight - realSite.weight + epsilon;
        if (currentClampGapSq <= 0) {
            continue;
        }

        const distanceSq = dx * dx + dy * dy;
        let maxNonClampingDistanceSq = currentClampGapSq;
        if (clearanceRadius > 0) {
            const maxNonClampingDistance =
                clearanceRadius + Math.sqrt(currentClampGapSq);
            maxNonClampingDistanceSq =
                maxNonClampingDistance * maxNonClampingDistance;
        }
        if (distanceSq >= maxNonClampingDistanceSq) {
            continue;
        }

        const centerDistance = Math.sqrt(distanceSq);
        const clearanceGap = Math.max(0, centerDistance - clearanceRadius);
        const maxAllowedWeight =
            clearanceGap * clearanceGap + realSite.weight - epsilon;
        clampedWeight = Math.min(clampedWeight, maxAllowedWeight);
        if (clampedWeight <= 0) {
            return 0;
        }
    }

    return clampedWeight;
}
