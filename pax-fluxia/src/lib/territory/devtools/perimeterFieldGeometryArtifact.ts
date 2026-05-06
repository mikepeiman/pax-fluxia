import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarConnection, StarState } from '$lib/types/game.types';
import { log } from '$lib/utils/logger';
import { computeCorridorVirtuals, computeDisconnectVirtuals } from '$lib/renderers/territoryFeatures';
import { computeGeometry0319 } from '../compiler/Geometry_0319';
import type { TerritoryGeometryData, TerritoryGeneratorSettings } from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import type { ResolvedGeometrySnapshot } from '../contracts/GeometryContracts';
import type { PerimeterFieldDebugSnapshot } from '../families/perimeterField/buildPerimeterFieldScene';
import { compactPerimeterFieldDebugSnapshot } from '../families/perimeterField/perimeterFieldDiagnostics';
import { buildPowerVoronoi0319Settings } from '../families/buildFamilyGeometry';

function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }, 100);
}

function buildIsoFilenameTimestamp(iso: string): string {
    return iso.replace(/[:.]/g, '-');
}

function serializeResolvedGeometry(geometry: ResolvedGeometrySnapshot): Record<string, unknown> {
    return {
        version: geometry.version,
        sourceMode: geometry.sourceMode,
        sourceStyle: geometry.sourceStyle,
        ownershipVersion: geometry.ownershipVersion,
        geometryFamily: geometry.geometryFamily,
        sourceMethod: geometry.sourceMethod,
        territoryRegions: geometry.territoryRegions.map((region) => ({
            regionId: region.regionId,
            ownerId: region.ownerId,
            starIds: [...(region.starIds ?? [])].sort(),
            confidence: region.confidence,
            points: region.points,
        })),
        frontierPolylines: geometry.frontierPolylines.map((frontier) => ({
            frontierId: frontier.frontierId,
            ownerPairKey: frontier.ownerPairKey,
            ownerA: frontier.ownerA,
            ownerB: frontier.ownerB,
            confidence: frontier.confidence,
            closed: frontier.closed ?? false,
            points: frontier.points,
        })),
        worldBorderPolylines: geometry.worldBorderPolylines.map((frontier) => ({
            frontierId: frontier.frontierId,
            ownerPairKey: frontier.ownerPairKey,
            ownerA: frontier.ownerA,
            ownerB: frontier.ownerB,
            confidence: frontier.confidence,
            closed: frontier.closed ?? false,
            points: frontier.points,
        })),
        shells: geometry.shells.map((shell) => ({
            shellId: shell.shellId,
            ownerId: shell.ownerId,
            starIds: [...(shell.starIds ?? [])].sort(),
            area: shell.area,
            absArea: shell.absArea,
            confidence: shell.confidence,
            holeLoopIds: [...shell.holeLoopIds],
            points: shell.points,
        })),
        shellLoops: geometry.shellLoops.map((loop) => ({
            shellLoopId: loop.shellLoopId,
            shellId: loop.shellId,
            ownerId: loop.ownerId,
            starIds: [...(loop.starIds ?? [])].sort(),
            classification: loop.classification,
            confidence: loop.confidence,
            points: loop.points,
        })),
        provenance: geometry.provenance,
        diagnostics: geometry.diagnostics,
    };
}

function serializeTerritoryGeometryData(geometry: TerritoryGeometryData): Record<string, unknown> {
    return {
        fingerprint: geometry.fingerprint,
        cellCount: geometry.cells.length,
        mergedTerritoryCount: geometry.mergedTerritories.length,
        sharedEdgeCount: geometry.sharedEdges.length,
        rawSharedPolylineCount: geometry.rawSharedPolylines.length,
        sharedPolylineCount: geometry.sharedPolylines.length,
        worldBorderPolylineCount: geometry.worldBorderPolylines.length,
        cells: geometry.cells.map((cell) => ({
            ownerId: cell.ownerId,
            siteId: cell.siteId,
            points: cell.points,
        })),
        mergedTerritories: geometry.mergedTerritories.map((territory) => ({
            ownerId: territory.ownerId,
            starIds: [...territory.starIds].sort(),
            points: territory.points,
        })),
        sharedEdges: geometry.sharedEdges.map((edge) => ({
            x1: edge.x1,
            y1: edge.y1,
            x2: edge.x2,
            y2: edge.y2,
            ownerA: edge.ownerA,
            ownerB: edge.ownerB,
            siteIdA: edge.siteIdA,
            siteIdB: edge.siteIdB,
        })),
        rawSharedPolylines: geometry.rawSharedPolylines.map((polyline) => ({
            ownerPairKey: polyline.ownerPairKey,
            points: polyline.points,
        })),
        sharedPolylines: geometry.sharedPolylines.map((polyline) => ({
            ownerPairKey: polyline.ownerPairKey,
            points: polyline.points,
        })),
        worldBorderPolylines: geometry.worldBorderPolylines.map((polyline) => ({
            ownerPairKey: polyline.ownerPairKey,
            points: polyline.points,
        })),
    };
}

function buildRelevantConfigSnapshot(
    settings: TerritoryGeneratorSettings,
): Record<string, unknown> {
    return {
        PERIMETER_FIELD_GEOMETRY_SOURCE:
            GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE ?? 'power_voronoi_0319',
        MODIFIED_VORONOI_STAR_MARGIN: GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN,
        MODIFIED_VORONOI_CORRIDOR_ENABLED:
            GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_ENABLED,
        MODIFIED_VORONOI_CORRIDOR_SPACING:
            GAME_CONFIG.MODIFIED_VORONOI_CORRIDOR_SPACING,
        TERRITORY_CX_COUNT: GAME_CONFIG.TERRITORY_CX_COUNT,
        TERRITORY_CX_WEIGHT: GAME_CONFIG.TERRITORY_CX_WEIGHT,
        TERRITORY_CX_CONTEST_MIDPOINT_VSTARS:
            GAME_CONFIG.TERRITORY_CX_CONTEST_MIDPOINT_VSTARS,
        TERRITORY_CX_CONTEST_PAIR_COUNT:
            GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_COUNT,
        TERRITORY_CX_CONTEST_PAIR_WEIGHT:
            GAME_CONFIG.TERRITORY_CX_CONTEST_PAIR_WEIGHT,
        MODIFIED_VORONOI_DISCONNECT_ENABLED:
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED,
        MODIFIED_VORONOI_DISCONNECT_DISTANCE:
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE,
        TERRITORY_DX_WEIGHT: GAME_CONFIG.TERRITORY_DX_WEIGHT,
        TERRITORY_CLUSTER_SPLIT: GAME_CONFIG.TERRITORY_CLUSTER_SPLIT,
        VORONOI_BORDER_SMOOTH: GAME_CONFIG.VORONOI_BORDER_SMOOTH,
        CHAIKIN_BOUNDARY_PAD: GAME_CONFIG.CHAIKIN_BOUNDARY_PAD,
        CHAIKIN_BOUNDARY_EPS: GAME_CONFIG.CHAIKIN_BOUNDARY_EPS,
        PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY:
            GAME_CONFIG.PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY,
        PERIMETER_FIELD_DEBUG_SCRUB_ENABLED:
            GAME_CONFIG.PERIMETER_FIELD_DEBUG_SCRUB_ENABLED,
        PERIMETER_FIELD_DEBUG_REPLAY_SLOT:
            GAME_CONFIG.PERIMETER_FIELD_DEBUG_REPLAY_SLOT,
        resolvedSettings: settings,
    };
}

export async function downloadPerimeterFieldGeometryArtifact(params: {
    snapshot: PerimeterFieldDebugSnapshot;
    stars: ReadonlyArray<StarState>;
    lanes: ReadonlyArray<StarConnection>;
    worldWidth: number;
    worldHeight: number;
    activeMode: string;
    replayOverrideActive: boolean;
}): Promise<void> {
    const capturedAt = new Date().toISOString();
    const geometrySource =
        (GAME_CONFIG.PERIMETER_FIELD_GEOMETRY_SOURCE ??
            'power_voronoi_0319') as string;
    const settings = buildPowerVoronoi0319Settings({
        lanes: params.lanes,
        worldWidth: params.worldWidth,
        worldHeight: params.worldHeight,
    });
    const ownedStars = params.stars.filter((star) => Boolean(star.ownerId));
    const corridorVirtuals = settings.corridorEnabled
        ? computeCorridorVirtuals(
              ownedStars,
              [...params.lanes],
              settings.corridorSpacing,
              settings.cxWeight,
              settings.cxCount || undefined,
          )
        : [];
    const disconnectVirtuals = settings.disconnectEnabled
        ? computeDisconnectVirtuals(
              ownedStars,
              [...params.stars],
              [...params.lanes],
              settings.disconnectDistance,
              settings.dxWeight,
          )
        : [];

    const recomputed0319 =
        geometrySource === 'power_voronoi_0319'
            ? computeGeometry0319([...params.stars], [...params.lanes], settings)
            : null;

    const artifact = {
        capturedAt,
        activeMode: params.activeMode,
        replayOverrideActive: params.replayOverrideActive,
        geometrySource,
        world: {
            width: params.worldWidth,
            height: params.worldHeight,
        },
        config: buildRelevantConfigSnapshot(settings),
        currentDisplaySnapshot: {
            compact: compactPerimeterFieldDebugSnapshot(params.snapshot),
            displayGeometry: serializeResolvedGeometry(
                params.snapshot.displayGeometry,
            ),
            transitionTargetGeometry: params.snapshot.transitionTargetGeometry
                ? serializeResolvedGeometry(
                      params.snapshot.transitionTargetGeometry,
                  )
                : null,
        },
        generatorInputs: {
            stars: params.stars.map((star) => ({
                id: star.id,
                ownerId: star.ownerId ?? null,
                x: star.x,
                y: star.y,
            })),
            lanes: params.lanes.map((lane) => ({
                sourceId: lane.sourceId,
                targetId: lane.targetId,
                distance: lane.distance ?? null,
            })),
            corridorVirtuals,
            disconnectVirtuals,
        },
        recomputed0319:
            recomputed0319 == null
                ? null
                : 'kind' in recomputed0319
                  ? {
                        kind: recomputed0319.kind,
                        stage: recomputed0319.stage,
                        message: recomputed0319.message,
                        recoverable: recomputed0319.recoverable,
                    }
                  : serializeTerritoryGeometryData(recomputed0319),
    };

    const json = JSON.stringify(artifact, null, 2);
    const filename = `pax-perimeter-field-geometry-artifact-${buildIsoFilenameTimestamp(capturedAt)}.json`;
    triggerDownload(new Blob([json], { type: 'application/json' }), filename);
    log.renderer(
        'PerimeterFieldArtifact',
        `downloaded ${filename} (${json.length} bytes)`,
    );
}
