import { GAME_CONFIG } from '$lib/config/game.config';

import type { StarConnection, StarState } from '$lib/types/game.types';
import { log } from '$lib/utils/logger';
import type { ResolvedGeometrySnapshot } from '../contracts/GeometryContracts';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import { computeGeometry0319 } from '../compiler/Geometry_0319';
import type { TerritoryGeneratorSettings } from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import { buildPowerVoronoi0319AuthoritySnapshot } from '../geometry/buildPowerVoronoi0319AuthoritySnapshot';
import { buildTerritoryGeneratorSettingsFromTunables } from '../geometry/geometryTuning';
import {
    normalizePerimeterFieldGeometrySource,
    POWER_CORE_GEOMETRY_SOURCE,
} from '../geometry/geometrySource';
import { buildPowerCoreAuthoritySnapshot } from '../geometry/powerCore/buildPowerCoreAuthoritySnapshot';
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

    const snapshot = {
        version: 'render-family-live',
        starOwners,
        contestedLaneIds: [],
        conquestEvents: [],
        virtualStars: [],
    };

    return snapshot;
}

export function buildVectorRenderFamilyGeometry(params: {
    stars: ReadonlyArray<StarState>;
    lanes: ReadonlyArray<StarConnection>;
    worldWidth: number;
    worldHeight: number;
    nowMs: number;
    ownership?: OwnershipSnapshot | null;
}): ResolvedGeometrySnapshot {
    const runtimeSettings = readTerritoryRuntimeSettings(
        GAME_CONFIG as unknown as Record<string, unknown>,
    );

    const geometry = compileVectorGeometry({
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

    return geometry;
}

export function buildPowerVoronoi0319Settings(params: {
    lanes: ReadonlyArray<StarConnection>;
    worldWidth: number;
    worldHeight: number;
    configSource?: Record<string, unknown>;
}): TerritoryGeneratorSettings {
    const runtimeSettings = readTerritoryRuntimeSettings(
        (params.configSource ??
            (GAME_CONFIG as unknown as Record<string, unknown>)) as Record<
            string,
            unknown
        >,
    );
    return buildTerritoryGeneratorSettingsFromTunables({
        world: {
            width: params.worldWidth,
            height: params.worldHeight,
        },
        tunables: {
            ...runtimeSettings.tunables,
            corridorEnabled:
                runtimeSettings.tunables.corridorEnabled &&
                params.lanes.length > 0,
            disconnectEnabled:
                runtimeSettings.tunables.disconnectEnabled &&
                params.lanes.length > 0,
        },
    });
}

function buildPowerVoronoi0319RenderFamilyGeometry(params: {
    stars: ReadonlyArray<StarState>;
    lanes: ReadonlyArray<StarConnection>;
    worldWidth: number;
    worldHeight: number;
    ownershipVersion: string;
    sourceStyle: ResolvedGeometrySnapshot['sourceStyle'];
    configSource?: Record<string, unknown>;
}): ResolvedGeometrySnapshot | null {
    const settings = buildPowerVoronoi0319Settings({
        lanes: params.lanes,
        worldWidth: params.worldWidth,
        worldHeight: params.worldHeight,
        configSource: params.configSource,
    });

    const result = computeGeometry0319(
        [...params.stars],
        [...params.lanes],
        settings,
    );
    if ('kind' in result) {
        log.error(
            'PerimeterFieldGeometry',
            `Geometry_0319 fallback to unified vector compiler: ${result.message}`,
        );
        return null;
    }

    return buildPowerVoronoi0319AuthoritySnapshot({
        geometry: result,
        stars: params.stars,
        ownershipVersion: params.ownershipVersion,
        sourceStyle: params.sourceStyle,
        worldWidth: params.worldWidth,
        worldHeight: params.worldHeight,
        requestedMarginPx: settings.starMargin,
    });
}

function buildPowerCoreRenderFamilyGeometry(params: {
    stars: ReadonlyArray<StarState>;
    lanes: ReadonlyArray<StarConnection>;
    worldWidth: number;
    worldHeight: number;
    ownershipVersion: string;
    sourceStyle: ResolvedGeometrySnapshot['sourceStyle'];
    configSource?: Record<string, unknown>;
}): ResolvedGeometrySnapshot | null {
    const settings = buildPowerVoronoi0319Settings({
        lanes: params.lanes,
        worldWidth: params.worldWidth,
        worldHeight: params.worldHeight,
        configSource: params.configSource,
    });
    const result = buildPowerCoreAuthoritySnapshot({
        stars: params.stars,
        connections: params.lanes,
        config: settings,
        ownershipVersion: params.ownershipVersion,
        sourceStyle: params.sourceStyle,
    });
    if ('kind' in result) {
        log.error(
            'PerimeterFieldGeometry',
            `PowerCore fallback to 0319 authority path: ${result.message}`,
        );
        return null;
    }
    return result;
}

export function buildPerimeterFieldRenderFamilyGeometry(params: {
    stars: ReadonlyArray<StarState>;
    lanes: ReadonlyArray<StarConnection>;
    worldWidth: number;
    worldHeight: number;
    nowMs: number;
    ownership?: OwnershipSnapshot | null;
    geometrySource?: string | null;
    configSource?: Record<string, unknown>;
}): ResolvedGeometrySnapshot {
    const configSource =
        params.configSource ??
        (GAME_CONFIG as unknown as Record<string, unknown>);
    const runtimeSettings = readTerritoryRuntimeSettings(configSource);
    const ownership =
        params.ownership ?? buildOwnershipSnapshotFromStars(params.stars);
    const requestedGeometrySource = params.geometrySource ??
        configSource.PERIMETER_FIELD_GEOMETRY_SOURCE ??
        'power_voronoi_0319';
    const geometrySource = normalizePerimeterFieldGeometrySource(
        requestedGeometrySource,
    );

    if (geometrySource === POWER_CORE_GEOMETRY_SOURCE) {
        const powerCore = buildPowerCoreRenderFamilyGeometry({
            stars: params.stars,
            lanes: params.lanes,
            worldWidth: params.worldWidth,
            worldHeight: params.worldHeight,
            ownershipVersion: ownership.version,
            sourceStyle: runtimeSettings.selection.styleMode,
            configSource,
        });
        if (powerCore) {
            return powerCore;
        }
        // CompileError inside PowerCore: fall through to the 0319 authority path.
    }

    const adapted = buildPowerVoronoi0319RenderFamilyGeometry({
        stars: params.stars,
        lanes: params.lanes,
        worldWidth: params.worldWidth,
        worldHeight: params.worldHeight,
        ownershipVersion: ownership.version,
        sourceStyle: runtimeSettings.selection.styleMode,
        configSource,
    });
    if (adapted) {

        return adapted;
    }

    const geometry = compileVectorGeometry({
        nowMs: params.nowMs,
        stars: [...params.stars],
        lanes: [...params.lanes],
        world: {
            width: params.worldWidth,
            height: params.worldHeight,
        },
        tunables: runtimeSettings.tunables,
        ownership,
        styleMode: runtimeSettings.selection.styleMode,
    });

    return geometry;
}
