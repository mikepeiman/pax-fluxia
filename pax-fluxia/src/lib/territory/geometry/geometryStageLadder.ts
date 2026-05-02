import type {
    CanonicalGeometrySnapshot,
    GeometryDebugStageId,
} from '../contracts/GeometryContracts';

export const GEOMETRY_DEBUG_STAGE_ORDER: readonly GeometryDebugStageId[] = [
    'raw_shared_frontiers',
    'raw_world_borders',
    'resolved_shared_boundary_frontiers',
    'resolved_regions',
    'display_borders',
] as const;

export const GEOMETRY_DEBUG_STAGE_LABELS: Readonly<
    Record<GeometryDebugStageId, string>
> = {
    raw_shared_frontiers: 'Raw Shared Frontiers',
    raw_world_borders: 'Raw World Borders',
    resolved_shared_boundary_frontiers: 'Resolved Shared-Boundary Frontiers',
    resolved_regions: 'Resolved Regions',
    display_borders: 'Display Borders',
};

export interface GeometryDebugOverlayLoop {
    readonly points: ReadonlyArray<[number, number]>;
    readonly closed: boolean;
}

function isClosedLoop(points: ReadonlyArray<[number, number]>): boolean {
    if (points.length < 3) return false;
    const first = points[0];
    const last = points[points.length - 1];
    return first?.[0] === last?.[0] && first?.[1] === last?.[1];
}

function mapPolylinesToLoops(
    polylines: ReadonlyArray<{
        points: ReadonlyArray<[number, number]>;
        closed?: boolean;
    }>,
): readonly GeometryDebugOverlayLoop[] {
    return polylines.map((polyline) => ({
        points: polyline.points,
        closed: polyline.closed ?? isClosedLoop(polyline.points),
    }));
}

function mapRegionsToLoops(
    regions: ReadonlyArray<{ points: ReadonlyArray<[number, number]> }>,
): readonly GeometryDebugOverlayLoop[] {
    return regions.map((region) => ({
        points: region.points,
        closed: true,
    }));
}

export function getGeometryDebugStageLabel(stageId: GeometryDebugStageId): string {
    return GEOMETRY_DEBUG_STAGE_LABELS[stageId];
}

export function getGeometryDebugStageSummary(
    geometry: CanonicalGeometrySnapshot,
    stageId: GeometryDebugStageId,
): string {
    const ladder = geometry.diagnostics.stageLadder;
    switch (stageId) {
        case 'raw_shared_frontiers':
            return `${ladder?.rawSharedFrontiers.length ?? geometry.frontierPolylines.length} shared frontier polylines`;
        case 'raw_world_borders':
            return `${ladder?.rawWorldBorders.length ?? geometry.worldBorderPolylines.length} owner-world border polylines`;
        case 'resolved_shared_boundary_frontiers':
            return `${ladder?.resolvedSharedBoundaryFrontiers.length ?? geometry.frontierPolylines.length} shared + ${ladder?.resolvedWorldBorders.length ?? geometry.worldBorderPolylines.length} world resolved frontiers`;
        case 'resolved_regions':
            return `${ladder?.resolvedRegions.length ?? geometry.territoryRegions.length} resolved territory regions`;
        case 'display_borders':
            return `${ladder?.displayFrontierPolylines.length ?? geometry.frontierPolylines.length} frontier + ${ladder?.displayWorldBorderPolylines.length ?? geometry.worldBorderPolylines.length} world display chains`;
    }
}

export function getGeometryDebugStageLoops(
    geometry: CanonicalGeometrySnapshot,
    stageId: GeometryDebugStageId,
): readonly GeometryDebugOverlayLoop[] {
    const ladder = geometry.diagnostics.stageLadder;
    switch (stageId) {
        case 'raw_shared_frontiers':
            return mapPolylinesToLoops(
                ladder?.rawSharedFrontiers ?? geometry.frontierPolylines,
            );
        case 'raw_world_borders':
            return mapPolylinesToLoops(
                ladder?.rawWorldBorders ?? geometry.worldBorderPolylines,
            );
        case 'resolved_shared_boundary_frontiers':
            return mapPolylinesToLoops([
                ...(ladder?.resolvedSharedBoundaryFrontiers ??
                    geometry.frontierPolylines),
                ...(ladder?.resolvedWorldBorders ?? geometry.worldBorderPolylines),
            ]);
        case 'resolved_regions':
            return mapRegionsToLoops(
                ladder?.resolvedRegions ?? geometry.territoryRegions,
            );
        case 'display_borders':
            return mapPolylinesToLoops(
                ladder
                    ? [
                          ...ladder.displayFrontierPolylines,
                          ...ladder.displayWorldBorderPolylines,
                      ]
                    : [
                          ...geometry.frontierPolylines,
                          ...geometry.worldBorderPolylines,
                      ],
            );
    }
}
