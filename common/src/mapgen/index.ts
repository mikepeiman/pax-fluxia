// ============================================================================
// Map Generation — Entry Point
// Single source of truth for map generation, consumed by both client and server.
// ============================================================================

export type {
    MapPosition,
    MapConnection,
    Connectable,
    MapGenConfig,
    MapGenResult,
    LanePathKind,
    LaneAdjustmentStyle,
    LaneConstraintStatus,
} from './types';
export type {
    MapLaneMode,
    LaneBuildMode,
    LaneBuildPerfStats,
    BuildLaneAwareOptions,
    LaneDecisionTrace,
    LaneAttemptTrace,
} from './lanePolylines';
export {
    computeLaneWaypoints,
    attachLaneWaypointsToConnections,
    buildLaneAwareConnections,
    debugResolveLaneConnection,
    effectiveLaneClearanceForChord,
} from './lanePolylines';
export { generateHexGrid, selectPositions, generateStarPositions } from './placement';
export { generateConnections, listDelaunayConnections, pointToSegmentDistance } from './connections';

import type { MapGenConfig, MapGenResult } from './types';
import { generateStarPositions } from './placement';
import { generateConnections, listDelaunayConnections } from './connections';
import { buildLaneAwareConnections } from './lanePolylines';
import type { MapLaneMode } from './lanePolylines';

/**
 * Generate a complete map: positions + connections.
 * Returns pure data — consumer converts to Star/StarSchema instances.
 *
 * @param config - Map generation parameters
 * @returns Positions, connections, and metadata
 */
export function generateMap(config: MapGenConfig): MapGenResult {
    const totalStars = config.playerCount * config.starsPerPlayer + (config.extraNeutralStars ?? 0);

    const { positions, hexRadius, width, height, paddingX, paddingY } = generateStarPositions({
        width: config.width,
        height: config.height,
        totalStars,
        spacingMultiplier: config.spacingMultiplier,
        hexRadius: config.hexRadius,
        boardFit: config.boardFit,
    });

    // Create connectable nodes with sequential IDs
    const nodes = positions.map((pos, i) => ({
        id: `star-${i}`,
        x: pos.x,
        y: pos.y,
    }));

    const laneMarginPx = Math.max(0, config.mapgenLaneMarginPx ?? 75);
    const curveVsPruneBias = Math.min(1, Math.max(0, config.mapgenLaneCurveVsPruneBias ?? 0));

    const preferredConnections = generateConnections(
        nodes,
        Infinity,
        config.minLinksPerStar ?? 1,
        config.maxLinksPerStar ?? 6,
        laneMarginPx,
        curveVsPruneBias,
    );

    const laneMode: MapLaneMode = config.mapLaneMode ?? 'curved';
    const laneAdjustmentStyle = config.mapgenLaneAdjustedPathStyle ?? 'curved';
    const connections = buildLaneAwareConnections(
        nodes,
        preferredConnections,
        listDelaunayConnections(nodes, Infinity),
        laneMode,
        laneMarginPx,
        curveVsPruneBias,
        laneAdjustmentStyle,
    );

    return { positions, connections, hexRadius, width, height, paddingX, paddingY };
}
