import { GAME_CONFIG } from '$lib/config/game.config';
import {
    logPipelineStage,
    summarizeGeometry,
    summarizeOwnership,
    summarizeStars,
    summarizeConnections,
} from '$lib/perf/pipelineTelemetry';
import type { StarConnection, StarState } from '$lib/types/game.types';
import { log } from '$lib/utils/logger';
import type {
    CanonicalFrontierPolyline,
    CanonicalGeometrySnapshot,
    CanonicalShell,
    CanonicalShellLoop,
    SharedFrontierMap,
    TerritoryRegionShape,
} from '../contracts/GeometryContracts';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import { computeGeometry0319 } from '../compiler/Geometry_0319';
import type {
    TerritoryGeometryData,
    TerritoryGeneratorSettings,
} from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import { readTerritoryRuntimeSettings } from '../integration/TerritorySettingsBridge';
import { compileVectorGeometry } from '../layers/geometry/compiler_UnifiedVectorGeometry';
import { buildPowerVoronoiFrontierTopology } from './buildPowerVoronoiFrontierTopology';
import { buildTerritoryGeneratorSettingsFromTunables } from '../geometry/geometryTuning';
import {
    deriveStableRegionId,
    splitRegionSiteIds,
} from '../geometry/regionIdentity';

type PerimeterFieldGeometrySourceId = 'canonical_vector' | 'power_voronoi_0319';

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
    logPipelineStage({
        channel: 'state',
        context: 'RenderFamilyGeometry',
        stage: 'ownership_snapshot',
        from: 'Live stars',
        to: 'OwnershipSnapshot',
        purpose: 'Normalize owner assignments for geometry and scene builders',
        summary: `${summarizeStars(stars)} ${summarizeOwnership(snapshot)}`,
        perfEventName: 'territory.ownership.snapshotBuilt',
        perfDetail: {
            starCount: stars.length,
            ownedStarCount: snapshot.starOwners.size,
        },
        logDetail: {
            stars,
            starOwners: Object.fromEntries(snapshot.starOwners.entries()),
            contestedLaneIds: snapshot.contestedLaneIds,
            conquestEvents: snapshot.conquestEvents,
            virtualStars: snapshot.virtualStars,
        },
    });
    return snapshot;
}

export function buildCanonicalRenderFamilyGeometry(params: {
    stars: ReadonlyArray<StarState>;
    lanes: ReadonlyArray<StarConnection>;
    worldWidth: number;
    worldHeight: number;
    nowMs: number;
    ownership?: OwnershipSnapshot | null;
}): CanonicalGeometrySnapshot {
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
    logPipelineStage({
        channel: 'renderer',
        context: 'RenderFamilyGeometry',
        stage: 'canonical_geometry',
        from: 'Ownership snapshot + live topology',
        to: 'CanonicalGeometrySnapshot',
        purpose: 'Build render-family geometry for vector-driven territory families',
        summary:
            `${summarizeStars(params.stars)} ${summarizeConnections(params.lanes)} ` +
            summarizeGeometry(geometry),
        perfEventName: 'territory.geometry.canonicalBuilt',
        perfDetail: {
            starCount: params.stars.length,
            laneCount: params.lanes.length,
            regionCount: geometry.territoryRegions.length,
            frontierCount: geometry.frontierPolylines.length,
            shellLoopCount: geometry.shellLoops.length,
        },
        logDetail: {
            stars: params.stars,
            lanes: params.lanes,
            ownership:
                params.ownership == null
                    ? null
                    : {
                          version: params.ownership.version,
                          starOwners: Object.fromEntries(
                              params.ownership.starOwners.entries(),
                          ),
                          contestedLaneIds: params.ownership.contestedLaneIds,
                          conquestEvents: params.ownership.conquestEvents,
                          virtualStars: params.ownership.virtualStars,
                      },
            geometry,
        },
    });
    return geometry;
}

function computePolygonArea(points: ReadonlyArray<[number, number]>): number {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i]!;
        const [bx, by] = points[(i + 1) % points.length]!;
        area += ax * by - bx * ay;
    }
    return area * 0.5;
}

function buildSharedFrontierMapFromPolylines(
    polylines: ReadonlyArray<CanonicalFrontierPolyline>,
): SharedFrontierMap {
    const grouped = new Map<string, CanonicalFrontierPolyline[]>();
    for (const polyline of polylines) {
        const bucket = grouped.get(polyline.ownerPairKey);
        if (bucket) {
            bucket.push(polyline);
        } else {
            grouped.set(polyline.ownerPairKey, [polyline]);
        }
    }
    return grouped;
}

function adaptPowerVoronoiGeometryToSnapshot(params: {
    geometry: TerritoryGeometryData;
    ownershipVersion: string;
    sourceStyle: CanonicalGeometrySnapshot['sourceStyle'];
    worldWidth: number;
    worldHeight: number;
}): CanonicalGeometrySnapshot {
    const territoryRegions: TerritoryRegionShape[] = params.geometry.mergedTerritories.map(
        (territory) => {
            const starIds = [...territory.starIds];
            const { anchorStarIds, contributingSiteIds } =
                splitRegionSiteIds(starIds);
            return {
                regionId: deriveStableRegionId(territory.ownerId, starIds),
                ownerId: territory.ownerId,
                starIds,
                anchorStarIds,
                contributingSiteIds,
                points: territory.points,
                confidence: 1,
            } satisfies TerritoryRegionShape;
        },
    );

    const frontierPolylines: CanonicalFrontierPolyline[] =
        params.geometry.sharedPolylines.map((polyline, index) => {
            const [ownerA, ownerB] = polyline.ownerPairKey.split('|');
            return {
                frontierId: `pfield-frontier:${polyline.ownerPairKey}:${index}`,
                ownerA,
                ownerB,
                ownerPairKey: polyline.ownerPairKey,
                points: polyline.points,
                confidence: 1,
            };
        });

    const worldBorderPolylines: CanonicalFrontierPolyline[] =
        params.geometry.worldBorderPolylines.map((polyline, index) => {
            const [ownerA] = polyline.ownerPairKey.split('|');
            return {
                frontierId: `pfield-world:${polyline.ownerPairKey}:${index}`,
                ownerA,
                ownerB: 'world',
                ownerPairKey: polyline.ownerPairKey,
                points: polyline.points,
                confidence: 1,
            };
        });

    const shells: CanonicalShell[] = params.geometry.mergedTerritories.map(
        (territory) => {
            const area = computePolygonArea(territory.points);
            const starIds = [...territory.starIds];
            const { anchorStarIds, contributingSiteIds } =
                splitRegionSiteIds(starIds);
            const stableKey = [
                ...(anchorStarIds.length > 0
                    ? anchorStarIds
                    : contributingSiteIds),
            ].join('+');
            return {
                shellId: `shell:${territory.ownerId}:${stableKey}`,
                ownerId: territory.ownerId,
                starIds,
                anchorStarIds,
                contributingSiteIds,
                points: territory.points,
                area,
                absArea: Math.abs(area),
                confidence: 1,
                holeLoopIds: [],
            } satisfies CanonicalShell;
        },
    );

    const shellLoops: CanonicalShellLoop[] = shells.map((shell) => ({
        shellLoopId: `${shell.shellId}:outer`,
        shellId: shell.shellId,
        ownerId: shell.ownerId,
        starIds: [...(shell.starIds ?? [])],
        anchorStarIds: [...(shell.anchorStarIds ?? [])],
        contributingSiteIds: [...(shell.contributingSiteIds ?? [])],
        points: shell.points,
        classification: 'outer',
        confidence: shell.confidence,
    }));

    const topologyResult = buildPowerVoronoiFrontierTopology({
        sharedPolylines: params.geometry.sharedPolylines,
        worldBorderPolylines: params.geometry.worldBorderPolylines,
        ownershipVersion: params.ownershipVersion,
        worldWidth: params.worldWidth,
        worldHeight: params.worldHeight,
        fingerprint: params.geometry.fingerprint,
    });

    return {
        version: `${params.geometry.fingerprint}:pfield`,
        sourceMode: 'unified_vector',
        sourceStyle: params.sourceStyle,
        ownershipVersion: params.ownershipVersion,
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions,
        frontierPolylines,
        worldBorderPolylines,
        sharedFrontierMap: buildSharedFrontierMapFromPolylines(frontierPolylines),
        frontierTopology: topologyResult.topology,
        shells,
        shellLoops,
        provenance: {
            derivedFromField: false,
            notes: [
                'Adapted from Geometry_0319 / Power-Voronoi merged territories for perimeter-field sampling',
                ...topologyResult.notes,
            ],
        },
        diagnostics: {
            topologyReliable: topologyResult.topologyReliable,
            identityReliable: true,
            closureReliable: topologyResult.topologyReliable,
            notes: [
                'Perimeter-field base geometry synthesized from Power-Voronoi render-layer geometry',
                ...topologyResult.notes,
            ],
        },
    };
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
    sourceStyle: CanonicalGeometrySnapshot['sourceStyle'];
    configSource?: Record<string, unknown>;
}): CanonicalGeometrySnapshot | null {
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
            `Geometry_0319 fallback to canonical compiler: ${result.message}`,
        );
        return null;
    }

    return adaptPowerVoronoiGeometryToSnapshot({
        geometry: result,
        ownershipVersion: params.ownershipVersion,
        sourceStyle: params.sourceStyle,
        worldWidth: params.worldWidth,
        worldHeight: params.worldHeight,
    });
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
}): CanonicalGeometrySnapshot {
    const configSource =
        params.configSource ??
        (GAME_CONFIG as unknown as Record<string, unknown>);
    const runtimeSettings = readTerritoryRuntimeSettings(
        configSource,
    );
    const ownership =
        params.ownership ?? buildOwnershipSnapshotFromStars(params.stars);
    const geometrySource = (params.geometrySource ??
        configSource.PERIMETER_FIELD_GEOMETRY_SOURCE ??
        'power_voronoi_0319') as PerimeterFieldGeometrySourceId;

    if (geometrySource === 'power_voronoi_0319') {
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
            logPipelineStage({
                channel: 'renderer',
                context: 'RenderFamilyGeometry',
                stage: 'perimeter_geometry',
                from: 'Geometry_0319 output',
                to: 'CanonicalGeometrySnapshot',
                purpose: 'Adapt power-voronoi territory geometry for perimeter-field sampling',
                summary:
                    `${summarizeStars(params.stars)} ${summarizeConnections(params.lanes)} ` +
                    summarizeGeometry(adapted),
                perfEventName: 'territory.geometry.perimeterBuilt',
                detail: {
                    geometrySource,
                },
            });
            return adapted;
        }
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
    logPipelineStage({
        channel: 'renderer',
        context: 'RenderFamilyGeometry',
        stage: 'perimeter_geometry_fallback',
        from: 'Live topology',
        to: 'CanonicalGeometrySnapshot',
        purpose: 'Fallback perimeter-field geometry compilation path',
        summary:
            `${summarizeStars(params.stars)} ${summarizeConnections(params.lanes)} ` +
            summarizeGeometry(geometry),
        perfEventName: 'territory.geometry.perimeterFallbackBuilt',
        detail: {
            geometrySource,
        },
    });
    return geometry;
}
