import type { TerritoryGeneratorSettings } from '../compiler/powerVoronoiTerritoryGeometryGenerator';

export interface TerritoryGeometryTunables {
    geometrySmoothingPasses: number;
    frontierResolution: number;
    boundaryPad: number;
    boundaryEps: number;
    starMargin: number;
    /** Legacy no-op. Retained only to avoid breaking the current panel surface. */
    msrStarBias?: number;
    corridorEnabled: boolean;
    corridorSpacing: number;
    corridorCount: number;
    corridorWeight: number;
    cxContestMidpointVstars: boolean;
    cxContestPairCount: number;
    cxContestPairSpacing?: number;
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

const DEFAULT_STAR_MARGIN = 45;
const DEFAULT_MSR_STAR_BIAS = 0;
const DEFAULT_CORRIDOR_SPACING = 60;
const DEFAULT_CX_CONTEST_PAIR_SPACING = 75;
const DEFAULT_DISCONNECT_DISTANCE = 400;
const DEFAULT_DISCONNECT_WEIGHT = 0.3;

function asNumber(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function readMsrStarBias(config: Record<string, unknown>): number {
    return asNumber(config.TERRITORY_MSR_STAR_BIAS, DEFAULT_MSR_STAR_BIAS);
}

export function readTerritoryGeometryTunables(
    config: Record<string, unknown>,
): TerritoryGeometryTunables {
    return {
        geometrySmoothingPasses: asNumber(config.VORONOI_BORDER_SMOOTH, 2),
        frontierResolution: asNumber(config.FRONTIER_RESOLUTION, 5),
        boundaryPad: asNumber(config.CHAIKIN_BOUNDARY_PAD, 50),
        boundaryEps: asNumber(config.CHAIKIN_BOUNDARY_EPS, 6),
        starMargin: asNumber(config.MODIFIED_VORONOI_STAR_MARGIN, DEFAULT_STAR_MARGIN),
        msrStarBias: readMsrStarBias(config),
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
            false,
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
            TERRITORY_GEOMETRY_LIMITS.frontierResolution.min,
            Math.min(
                TERRITORY_GEOMETRY_LIMITS.frontierResolution.max,
                Math.round(tunables.frontierResolution),
            ),
        ),
        boundaryPad: Math.max(0, Math.round(tunables.boundaryPad)),
        boundaryEps: Math.max(0, Math.round(tunables.boundaryEps)),
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
        disconnectEnabled: tunables.disconnectEnabled ?? false,
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
        starWeight: tunables.starMargin,
        msrPx: tunables.starMargin,
        cxEnabled: tunables.corridorEnabled,
        cxSpacingPx: tunables.corridorSpacing,
        cxPointCount: tunables.corridorCount,
        cxWeight: tunables.corridorWeight,
        lpMidpointPairEnabled: tunables.cxContestMidpointVstars,
        lpPairCount: tunables.cxContestPairCount,
        lpPairSpacingPx:
            tunables.cxContestPairSpacing ?? DEFAULT_CX_CONTEST_PAIR_SPACING,
        lpPairWeight: tunables.cxContestPairWeight,
        dxEnabled: tunables.disconnectEnabled,
        dxMaxDistancePx: tunables.disconnectDistance,
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
        normalized.starMargin,
        normalized.starMargin,
        normalized.corridorEnabled,
        normalized.corridorSpacing,
        normalized.corridorCount,
        normalized.corridorWeight,
        normalized.cxContestMidpointVstars,
        normalized.cxContestPairCount,
        normalized.cxContestPairSpacing ??
        DEFAULT_CX_CONTEST_PAIR_SPACING,
        normalized.cxContestPairWeight,
        normalized.disconnectEnabled,
        normalized.disconnectDistance,
        normalized.disconnectWeight,
        normalized.clusterSplitThreshold,
        normalized.boundaryPad,
        normalized.boundaryEps,
    ];
}
