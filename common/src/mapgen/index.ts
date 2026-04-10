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

    const msr = config.mapgenStarMarginPx ?? 45;
    const laneBuf = config.mapgenLaneBufferPx ?? 30;
    const passThroughClearancePx = Math.max(0, msr + laneBuf);
    /** Phase 4 prune: MSR only so topology is not over-tightened before lane geometry runs. */
    const connectionPruneClearancePx = Math.max(0, msr);

    const connections = generateConnections(
        nodes,
        Infinity,
        config.minLinksPerStar ?? 1,
        config.maxLinksPerStar ?? 6,
        connectionPruneClearancePx,
    );

    const laneMode: MapLaneMode = config.mapLaneMode ?? 'curved';
    // Lane centerlines enforce full D_clear (MSR + buffer); graph edges use looser prune above.
    attachLaneWaypointsToConnections(
        nodes,
        connections,
        laneMode,
        Math.max(0, passThroughClearancePx),
    );

    return { positions, connections, hexRadius, width, height, paddingX, paddingY };
}
