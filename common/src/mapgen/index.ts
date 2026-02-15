// ============================================================================
// Map Generation — Entry Point
// Single source of truth for map generation, consumed by both client and server.
// ============================================================================

export type { MapPosition, MapConnection, Connectable, MapGenConfig, MapGenResult } from './types';
export { generateHexGrid, selectPositions, generateStarPositions } from './placement';
export { generateConnections, pointToSegmentDistance } from './connections';

import type { MapGenConfig, MapGenResult } from './types';
import { generateStarPositions } from './placement';
import { generateConnections } from './connections';

/**
 * Generate a complete map: positions + connections.
 * Returns pure data — consumer converts to Star/StarSchema instances.
 *
 * @param config - Map generation parameters
 * @returns Positions, connections, and metadata
 */
export function generateMap(config: MapGenConfig): MapGenResult {
    const totalStars = config.playerCount * config.starsPerPlayer;

    const { positions, hexRadius, width, height } = generateStarPositions({
        width: config.width,
        height: config.height,
        totalStars,
        spacingMultiplier: config.spacingMultiplier,
        hexRadius: config.hexRadius,
    });

    // Create connectable nodes with sequential IDs
    const nodes = positions.map((pos, i) => ({
        id: `star-${i}`,
        x: pos.x,
        y: pos.y,
    }));

    const connections = generateConnections(
        nodes,
        Infinity,
        config.minLinksPerStar ?? 1,
        config.maxLinksPerStar ?? 6,
    );

    return { positions, connections, hexRadius, width, height };
}
