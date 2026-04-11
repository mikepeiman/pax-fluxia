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
} from './types';
export type { MapLaneMode } from './lanePolylines';
export { computeLaneWaypoints, attachLaneWaypointsToConnections } from './lanePolylines';
export { generateHexGrid, selectPositions, generateStarPositions } from './placement';
export { generateConnections, pointToSegmentDistance } from './connections';

import type { MapGenConfig, MapGenResult } from './types';
import { generateStarPositions } from './placement';
import { generateConnections } from './connections';
import { attachLaneWaypointsToConnections } from './lanePolylines';
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

    const connections = generateConnections(
        nodes,
        Infinity,
        config.minLinksPerStar ?? 1,
        config.maxLinksPerStar ?? 6,
        laneMarginPx,
        curveVsPruneBias,
    );

    const laneMode: MapLaneMode = config.mapLaneMode ?? 'curved';
    attachLaneWaypointsToConnections(nodes, connections, laneMode, laneMarginPx);

    return { positions, connections, hexRadius, width, height, paddingX, paddingY };
}
