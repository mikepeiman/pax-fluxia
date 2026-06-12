import type { TerritoryGeneratorSettings } from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import { deriveLegacyTerritoryMsrStarBias } from '../compiler/powerVoronoiWeights';

export interface TerritoryGeometryTunables {
    geometrySmoothingPasses: number;
    frontierResolution: number;
    boundaryPad: number;
    boundaryEps: number;
    starCoreGuardRadius: number;
    starMargin: number;
    msrStarBias: number;
    corridorEnabled: boolean;
    corridorSpacing: number;
    corridorCount: number;
    corridorWeight: number;
    cxContestMidpointVstars: boolean;
    cxContestPairCount: number;
    cxContestPairSpacing: number;
    cxContestPairWeight: number;
    disconnectEnabled: boolean;
    disconnectDistance: number;
    disconnectWeight: number;
    clusterSplitThreshold: number;
}

export const TERRITORY_GEOMETRY_LIMITS = {
    starMargin: { min: 0, max: 500 },
    msrStarBias: { min: 0, max: 2 },
    frontierResolution: { min: 1, max: 32 },
    corridorSpacing: { min: 10, max: 200 },
    corridorCount: { min: 0, max: 20 },
    corridorWeight: { min: 0, max: 2 },
    cxContestPairCount: { min: 1, max: 10 },
    cxContestPairSpacing: { min: 10, max: 500 },
    cxContestPairWeight: { min: 0, max: 2 },
    disconnectDistance: { min: 0, max: 1000 },
    disconnectWeight: { min: 0, max: 5 },
} as const;

const DEFAULT_STAR_CORE_GUARD_RADIUS = 20;
const DEFAULT_STAR_MARGIN = 0;
const DEFAULT_MSR_STAR_BIAS = 0;
const DEFAULT_CORRIDOR_SPACING = 10;
const DEFAULT_CX_CONTEST_PAIR_SPACING = 75;
const DEFAULT_DISCONNECT_DISTANCE = 295;
const DEFAULT_DISCONNECT_WEIGHT = 3;

function deriveMsrStarBias(config: Record<string, unknown>): number {
    const directBias = config.TERRITORY_MSR_STAR_BIAS;
    if (typeof directBias === 'number' && Number.isFinite(directBias)) {
        return directBias;
    }

    if (config.TERRITORY_MSR_STAR_POWER_ENABLED === true) {
        return deriveLegacyTerritoryMsrStarBias({
            enabled: true,
            mode:
                config.TERRITORY_MSR_STAR_POWER_MODE === 'linear' ||
                config.TERRITORY_MSR_STAR_POWER_MODE === 'squared' ||
                config.TERRITORY_MSR_STAR_POWER_MODE === 'exponent'
                    ? config.TERRITORY_MSR_STAR_POWER_MODE
                    : 'squared',
            gain: asNumber(config.TERRITORY_MSR_STAR_POWER_GAIN, 1),
            exponent: asNumber(config.TERRITORY_MSR_STAR_POWER_EXPONENT, 2),
            capPx: asNumber(config.TERRITORY_MSR_STAR_POWER_CAP_PX, 500),
        });
    }

    return DEFAULT_MSR_STAR_BIAS;
}

function asNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

export function readTerritoryGeometryTunables(
    config: Record<string, unknown>,
): TerritoryGeometryTunables {
    return {
        geometrySmoothingPasses: asNumber(config.VORONOI_BORDER_SMOOTH, 2),
        frontierResolution: asNumber(config.FRONTIER_RESOLUTION, 5),
        boundaryPad: asNumber(config.CHAIKIN_BOUNDARY_PAD, 50),
        boundaryEps: asNumber(config.CHAIKIN_BOUNDARY_EPS, 6),
        starCoreGuardRadius: DEFAULT_STAR_CORE_GUARD_RADIUS,
        starMargin: asNumber(config.MODIFIED_VORONOI_STAR_MARGIN, DEFAULT_STAR_MARGIN),
        msrStarBias: deriveMsrStarBias(config),
        corridorEnabled: asBoolean(
            config.MODIFIED_VORONOI_CORRIDOR_ENABLED,
            true,
        ),
        corridorSpacing: asNumber(
            config.MODIFIED_VORONOI_CORRIDOR_SPACING,
            DEFAULT_CORRIDOR_SPACING,
        ),
        corridorCount: asNumber(config.TERRITORY_CX_COUNT, 0),
        corridorWeight: asNumber(config.TERRITORY_CX_WEIGHT, 0.5),
        cxContestMidpointVstars: asBoolean(
            config.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS,
            true,
        ),
        cxContestPairCount: asNumber(config.TERRITORY_CX_CONTEST_PAIR_COUNT, 1),
        cxContestPairSpacing: asNumber(
            config.TERRITORY_CX_CONTEST_PAIR_SPACING,
            DEFAULT_CX_CONTEST_PAIR_SPACING,
        ),
        cxContestPairWeight: asNumber(
            config.TERRITORY_CX_CONTEST_PAIR_WEIGHT,
            0.5,
        ),
        disconnectEnabled: asBoolean(
            config.MODIFIED_VORONOI_DISCONNECT_ENABLED,
            true,
        ),
        disconnectDistance: asNumber(
            config.MODIFIED_VORONOI_DISCONNECT_DISTANCE,
            DEFAULT_DISCONNECT_DISTANCE,
        ),
        disconnectWeight: asNumber(
            config.TERRITORY_DX_WEIGHT,
            DEFAULT_DISCONNECT_WEIGHT,
        ),
        clusterSplitThreshold: config.TERRITORY_CLUSTER_SPLIT ? 1 : 0,
    };
}

export function normalizeTerritoryGeometryTunables(
    tunables: TerritoryGeometryTunables,
): TerritoryGeometryTunables {
    return {
        geometrySmoothingPasses: Math.max(
            0,
            Math.min(5, Math.round(tunables.geometrySmoothingPasses)),
        ),
        frontierResolution: Math.max(
            1,
            Math.min(32, Math.round(tunables.frontierResolution)),
        ),
        boundaryPad: Math.max(0, Math.round(tunables.boundaryPad)),
        boundaryEps: Math.max(0, Math.round(tunables.boundaryEps)),
        starCoreGuardRadius: Math.max(
            0,
            Math.round(
                tunables.starCoreGuardRadius ?? DEFAULT_STAR_CORE_GUARD_RADIUS,
            ),
        ),
        starMargin: Math.max(
            TERRITORY_GEOMETRY_LIMITS.starMargin.min,
            Math.min(
                TERRITORY_GEOMETRY_LIMITS.starMargin.max,
                tunables.starMargin ?? DEFAULT_STAR_MARGIN,
            ),
        ),
        msrStarBias: Math.max(
            TERRITORY_GEOMETRY_LIMITS.msrStarBias.min,
            Math.min(
                TERRITORY_GEOMETRY_LIMITS.msrStarBias.max,
                tunables.msrStarBias ?? DEFAULT_MSR_STAR_BIAS,
            ),
        ),
        corridorEnabled: tunables.corridorEnabled ?? true,
        corridorSpacing: Math.max(
            TERRITORY_GEOMETRY_LIMITS.corridorSpacing.min,
            Math.min(
                TERRITORY_GEOMETRY_LIMITS.corridorSpacing.max,
                tunables.corridorSpacing ?? DEFAULT_CORRIDOR_SPACING,
            ),
        ),
        corridorCount: Math.max(
            TERRITORY_GEOMETRY_LIMITS.corridorCount.min,
            Math.min(
                TERRITORY_GEOMETRY_LIMITS.corridorCount.max,
                Math.round(tunables.corridorCount ?? 0),
            ),
        ),
        corridorWeight: Math.max(
            TERRITORY_GEOMETRY_LIMITS.corridorWeight.min,
            Math.min(
                TERRITORY_GEOMETRY_LIMITS.corridorWeight.max,
                tunables.corridorWeight ?? 0.5,
            ),
        ),
        cxContestMidpointVstars: tunables.cxContestMidpointVstars ?? true,
        cxContestPairCount: Math.max(
            TERRITORY_GEOMETRY_LIMITS.cxContestPairCount.min,
            Math.min(
                TERRITORY_GEOMETRY_LIMITS.cxContestPairCount.max,
                Math.round(tunables.cxContestPairCount ?? 1),
            ),
        ),
        cxContestPairSpacing: Math.max(
            TERRITORY_GEOMETRY_LIMITS.cxContestPairSpacing.min,
            Math.min(
                TERRITORY_GEOMETRY_LIMITS.cxContestPairSpacing.max,
                tunables.cxContestPairSpacing ??
                    DEFAULT_CX_CONTEST_PAIR_SPACING,
            ),
        ),
        cxContestPairWeight: Math.max(
            TERRITORY_GEOMETRY_LIMITS.cxContestPairWeight.min,
            Math.min(
                TERRITORY_GEOMETRY_LIMITS.cxContestPairWeight.max,
                tunables.cxContestPairWeight ?? 0.5,
            ),
        ),
        disconnectEnabled: tunables.disconnectEnabled ?? true,
        disconnectDistance: Math.max(
            TERRITORY_GEOMETRY_LIMITS.disconnectDistance.min,
            Math.min(
                TERRITORY_GEOMETRY_LIMITS.disconnectDistance.max,
                tunables.disconnectDistance ?? DEFAULT_DISCONNECT_DISTANCE,
            ),
        ),
        disconnectWeight: Math.max(
            TERRITORY_GEOMETRY_LIMITS.disconnectWeight.min,
            Math.min(
                TERRITORY_GEOMETRY_LIMITS.disconnectWeight.max,
                tunables.disconnectWeight ?? DEFAULT_DISCONNECT_WEIGHT,
            ),
        ),
        clusterSplitThreshold: Math.max(
            0,
            Math.min(1, tunables.clusterSplitThreshold ?? 0),
        ),
    };
}

export function readNormalizedTerritoryGeometryTunables(
    config: Record<string, unknown>,
): TerritoryGeometryTunables {
    return normalizeTerritoryGeometryTunables(
        readTerritoryGeometryTunables(config),
    );
}

export function buildTerritoryGeneratorSettingsFromTunables(params: {
    world: { width: number; height: number };
    tunables: TerritoryGeometryTunables;
}): TerritoryGeneratorSettings {
    const tunables = normalizeTerritoryGeometryTunables(params.tunables);
    return {
        starCoreGuardRadius: tunables.starCoreGuardRadius,
        starMargin: tunables.starMargin,
        msrStarBias: tunables.msrStarBias,
        corridorEnabled: tunables.corridorEnabled,
        corridorSpacing: tunables.corridorSpacing,
        cxCount: tunables.corridorCount,
        cxWeight: tunables.corridorWeight,
        cxContestMidpointVstars: tunables.cxContestMidpointVstars,
        cxContestPairCount: tunables.cxContestPairCount,
        cxContestPairSpacing: tunables.cxContestPairSpacing,
        cxContestPairWeight: tunables.cxContestPairWeight,
        disconnectEnabled: tunables.disconnectEnabled,
        disconnectDistance: tunables.disconnectDistance,
        dxWeight: tunables.disconnectWeight,
        clusterSplit: tunables.clusterSplitThreshold > 0,
        chaikinPasses: tunables.geometrySmoothingPasses,
        frontierResolution: tunables.frontierResolution,
        boundaryPad: tunables.boundaryPad,
        boundaryEps: tunables.boundaryEps,
        worldWidth: params.world.width,
        worldHeight: params.world.height,
    };
}

export function buildTerritoryGeometryCacheKeyParts(
    tunables: TerritoryGeometryTunables,
): Array<string | number | boolean> {
    const normalized = normalizeTerritoryGeometryTunables(tunables);
    return [
        normalized.geometrySmoothingPasses,
        normalized.frontierResolution,
        normalized.starCoreGuardRadius,
        normalized.starMargin,
        normalized.msrStarBias,
        normalized.corridorEnabled,
        normalized.corridorSpacing,
        normalized.corridorCount,
        normalized.corridorWeight,
        normalized.cxContestMidpointVstars,
        normalized.cxContestPairCount,
        normalized.cxContestPairSpacing,
        normalized.cxContestPairWeight,
        normalized.disconnectEnabled,
        normalized.disconnectDistance,
        normalized.disconnectWeight,
        normalized.clusterSplitThreshold,
        normalized.boundaryPad,
        normalized.boundaryEps,
    ];
}
