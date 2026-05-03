import type { TerritoryGeneratorSettings } from '../compiler/powerVoronoiTerritoryGeometryGenerator';

export interface TerritoryGeometryTunables {
    geometrySmoothingPasses: number;
    frontierResolution: number;
    boundaryPad: number;
    boundaryEps: number;
    starMargin: number;
    corridorEnabled: boolean;
    corridorSpacing: number;
    corridorCount: number;
    corridorWeight: number;
    cxContestMidpointVstars: boolean;
    cxContestPairCount: number;
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
        starMargin: asNumber(config.MODIFIED_VORONOI_STAR_MARGIN, 45),
        corridorEnabled: asBoolean(
            config.MODIFIED_VORONOI_CORRIDOR_ENABLED,
            true,
        ),
        corridorSpacing: asNumber(config.MODIFIED_VORONOI_CORRIDOR_SPACING, 60),
        corridorCount: asNumber(config.TERRITORY_CX_COUNT, 0),
        corridorWeight: asNumber(config.TERRITORY_CX_WEIGHT, 0.5),
        cxContestMidpointVstars: asBoolean(
            config.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS,
            true,
        ),
        cxContestPairCount: asNumber(config.TERRITORY_CX_CONTEST_PAIR_COUNT, 1),
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
            400,
        ),
        disconnectWeight: asNumber(config.TERRITORY_DX_WEIGHT, 0.3),
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
        starMargin: Math.max(0, Math.min(500, tunables.starMargin ?? 45)),
        corridorEnabled: tunables.corridorEnabled ?? true,
        corridorSpacing: Math.max(
            10,
            Math.min(200, tunables.corridorSpacing ?? 60),
        ),
        corridorCount: Math.max(
            0,
            Math.min(10, Math.round(tunables.corridorCount ?? 0)),
        ),
        corridorWeight: Math.max(
            0,
            Math.min(1, tunables.corridorWeight ?? 0.5),
        ),
        cxContestMidpointVstars: tunables.cxContestMidpointVstars ?? true,
        cxContestPairCount: Math.max(
            1,
            Math.min(10, Math.round(tunables.cxContestPairCount ?? 1)),
        ),
        cxContestPairWeight: Math.max(
            0,
            Math.min(1, tunables.cxContestPairWeight ?? 0.5),
        ),
        disconnectEnabled: tunables.disconnectEnabled ?? false,
        disconnectDistance: Math.max(
            0,
            Math.min(1000, tunables.disconnectDistance ?? 400),
        ),
        disconnectWeight: Math.max(
            0,
            Math.min(1, tunables.disconnectWeight ?? 0.3),
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
        starMargin: tunables.starMargin,
        corridorEnabled: tunables.corridorEnabled,
        corridorSpacing: tunables.corridorSpacing,
        cxCount: tunables.corridorCount,
        cxWeight: tunables.corridorWeight,
        cxContestMidpointVstars: tunables.cxContestMidpointVstars,
        cxContestPairCount: tunables.cxContestPairCount,
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
        normalized.starMargin,
        normalized.corridorEnabled,
        normalized.corridorSpacing,
        normalized.corridorCount,
        normalized.corridorWeight,
        normalized.cxContestMidpointVstars,
        normalized.cxContestPairCount,
        normalized.cxContestPairWeight,
        normalized.disconnectEnabled,
        normalized.disconnectDistance,
        normalized.disconnectWeight,
        normalized.clusterSplitThreshold,
        normalized.boundaryPad,
        normalized.boundaryEps,
    ];
}
