import { GAME_CONFIG } from '$lib/config/game.config';
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

    return {
        version: 'render-family-live',
        starOwners,
        contestedLaneIds: [],
        conquestEvents: [],
        virtualStars: [],
    };
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

    return compileVectorGeometry({
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
        (territory, index) => ({
            regionId: `pfield-region:${territory.ownerId}:${index}`,
            ownerId: territory.ownerId,
            starIds: [...territory.starIds],
            points: territory.points,
            confidence: 1,
        }),
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
        params.geometry.worldBorderPolylines.map((polyline, index) => ({
            frontierId: `pfield-world:${polyline.ownerPairKey}:${index}`,
            ownerA: polyline.ownerPairKey,
            ownerB: 'world',
            ownerPairKey: `${polyline.ownerPairKey}|world`,
            points: polyline.points,
            confidence: 1,
        }));

    const shells: CanonicalShell[] = params.geometry.mergedTerritories.map(
        (territory, index) => {
            const area = computePolygonArea(territory.points);
            return {
                shellId: `pfield-shell:${territory.ownerId}:${index}`,
                ownerId: territory.ownerId,
                starIds: [...territory.starIds],
                points: territory.points,
                area,
                absArea: Math.abs(area),
                confidence: 1,
                holeLoopIds: [],
            };
        },
    );

    const shellLoops: CanonicalShellLoop[] = shells.map((shell) => ({
        shellLoopId: `${shell.shellId}:outer`,
        shellId: shell.shellId,
        ownerId: shell.ownerId,
        starIds: [...(shell.starIds ?? [])],
        points: shell.points,
        classification: 'outer',
        confidence: shell.confidence,
    }));
    const closureReliable = territoryRegions.every((region) => {
        if (region.points.length < 3) return false;
        const first = region.points[0];
        const last = region.points[region.points.length - 1];
        return (
            Math.abs(first[0] - last[0]) <= 6 &&
            Math.abs(first[1] - last[1]) <= 6
        );
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
        frontierTopology: {
            version: `${params.geometry.fingerprint}:pfield-topology`,
            ownershipVersion: params.ownershipVersion,
            worldBounds: {
                width: params.worldWidth,
                height: params.worldHeight,
            },
            vertices: new Map(),
            sections: new Map(),
            loops: [],
            sectionsByOwnerPair: new Map(),
            sectionsByVertex: new Map(),
            sectionsByOwner: new Map(),
        },
        shells,
        shellLoops,
        provenance: {
            derivedFromField: false,
            notes: ['Adapted from Geometry_0319 / Power-Voronoi merged territories for perimeter-field sampling'],
        },
        diagnostics: {
            topologyReliable: false,
            identityReliable: false,
            closureReliable,
            notes: [
                'Perimeter-field base geometry synthesized from Power-Voronoi render-layer geometry',
                closureReliable
                    ? 'All adapted territory loops satisfied closure tolerance'
                    : 'At least one adapted territory loop failed closure tolerance',
            ],
        },
    };
}

function buildPowerVoronoi0319RenderFamilyGeometry(params: {
    stars: ReadonlyArray<StarState>;
    lanes: ReadonlyArray<StarConnection>;
    worldWidth: number;
    worldHeight: number;
    ownershipVersion: string;
    sourceStyle: CanonicalGeometrySnapshot['sourceStyle'];
}): CanonicalGeometrySnapshot | null {
    const settings = buildPowerVoronoi0319Settings({
        lanes: params.lanes,
        worldWidth: params.worldWidth,
        worldHeight: params.worldHeight,
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

export function buildPowerVoronoi0319Settings(params: {
    lanes: ReadonlyArray<StarConnection>;
    worldWidth: number;
    worldHeight: number;
}): TerritoryGeneratorSettings {
    return {
        starMargin: GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN ?? 45,
        corridorEnabled:
            Boolean(GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED) &&
            params.lanes.length > 0,
        corridorSpacing: GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING ?? 60,
        cxCount: GAME_CONFIG.TERRITORY_CX_COUNT ?? 0,
        cxWeight: GAME_CONFIG.TERRITORY_CX_WEIGHT ?? 0.5,
        disconnectEnabled:
            Boolean(GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED) &&
            params.lanes.length > 0,
        disconnectDistance:
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ?? 400,
        dxWeight: GAME_CONFIG.TERRITORY_DX_WEIGHT ?? 0.3,
        clusterSplit: Boolean(GAME_CONFIG.TERRITORY_CLUSTER_SPLIT),
        chaikinPasses: Math.max(
            0,
            Math.min(5, Math.round(GAME_CONFIG.VORONOI_BORDER_SMOOTH ?? 3)),
        ),
        frontierResolution: 0,
        boundaryPad: GAME_CONFIG.CHAIKIN_BOUNDARY_PAD ?? 50,
        boundaryEps: GAME_CONFIG.CHAIKIN_BOUNDARY_EPS ?? 6,
        worldWidth: params.worldWidth,
        worldHeight: params.worldHeight,
    };
}

export function buildPerimeterFieldRenderFamilyGeometry(params: {
    stars: ReadonlyArray<StarState>;
    lanes: ReadonlyArray<StarConnection>;
    worldWidth: number;
    worldHeight: number;
    nowMs: number;
    ownership?: OwnershipSnapshot | null;
    geometrySource?: string | null;
}): CanonicalGeometrySnapshot {
    const runtimeSettings = readTerritoryRuntimeSettings(
        GAME_CONFIG as unknown as Record<string, unknown>,
    );
    const ownership =
        params.ownership ?? buildOwnershipSnapshotFromStars(params.stars);
    const geometrySource = (params.geometrySource ??
        GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE ??
        'power_voronoi_0319') as PerimeterFieldGeometrySourceId;

    if (geometrySource === 'power_voronoi_0319') {
        const adapted = buildPowerVoronoi0319RenderFamilyGeometry({
            stars: params.stars,
            lanes: params.lanes,
            worldWidth: params.worldWidth,
            worldHeight: params.worldHeight,
            ownershipVersion: ownership.version,
            sourceStyle: runtimeSettings.selection.styleMode,
        });
        if (adapted) return adapted;
    }

    return compileVectorGeometry({
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
}
