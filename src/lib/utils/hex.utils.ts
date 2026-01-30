// ============================================================================
// Hex Grid Utilities - Functional, type-safe hex coordinate system
// ============================================================================

/**
 * Axial hex coordinates (q, r) with screen position
 * Uses offset odd-q layout
 */
export interface HexCoord {
    q: number;           // Column (axial)
    r: number;           // Row (axial)
    x: number;           // Screen X
    y: number;           // Screen Y
}

/**
 * Generate a hex grid that fits within the given dimensions
 * 
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels  
 * @param hexRadius - Radius of each hex (center to vertex)
 * @param padding - Edge padding in pixels
 * @returns Array of hex coordinates with screen positions
 */
export function generateHexGrid(
    width: number,
    height: number,
    hexRadius: number,
    padding: number = 50
): HexCoord[] {
    // Hex geometry
    const hexWidth = hexRadius * 2;
    const hexHeight = hexRadius * Math.sqrt(3);
    const horizSpacing = hexWidth * 0.75;
    const vertSpacing = hexHeight;

    // Calculate grid bounds
    const cols = Math.floor((width - padding * 2) / horizSpacing);
    const rows = Math.floor((height - padding * 2) / vertSpacing);

    // Generate all hex positions
    const hexes: HexCoord[] = [];

    for (let q = 0; q < cols; q++) {
        for (let r = 0; r < rows; r++) {
            // Offset odd columns
            const xOffset = padding + hexRadius;
            const yOffset = padding + hexRadius + (q % 2 ? vertSpacing / 2 : 0);

            const x = xOffset + q * horizSpacing;
            const y = yOffset + r * vertSpacing;

            // Only include if within bounds
            if (x < width - padding && y < height - padding) {
                hexes.push({ q, r, x, y });
            }
        }
    }

    return hexes;
}

/**
 * Get hex neighbors (adjacent hexes)
 * Uses axial coordinate adjacency
 */
export function getHexNeighbors(hex: HexCoord, allHexes: HexCoord[]): HexCoord[] {
    // Offset odd-q neighbor directions
    const evenQDirections = [
        { dq: 1, dr: 0 },
        { dq: 1, dr: -1 },
        { dq: 0, dr: -1 },
        { dq: -1, dr: -1 },
        { dq: -1, dr: 0 },
        { dq: 0, dr: 1 },
    ];

    const oddQDirections = [
        { dq: 1, dr: 1 },
        { dq: 1, dr: 0 },
        { dq: 0, dr: -1 },
        { dq: -1, dr: 0 },
        { dq: -1, dr: 1 },
        { dq: 0, dr: 1 },
    ];

    const directions = hex.q % 2 === 0 ? evenQDirections : oddQDirections;

    return directions
        .map(d => ({ q: hex.q + d.dq, r: hex.r + d.dr }))
        .map(target => allHexes.find(h => h.q === target.q && h.r === target.r))
        .filter((h): h is HexCoord => h !== undefined);
}

/**
 * Distance between two hexes in screen coordinates
 */
export function hexDistance(a: HexCoord, b: HexCoord): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Select random unique hex positions from the grid
 * Ensures minimum spacing between selected positions
 */
export function selectRandomHexPositions(
    hexes: HexCoord[],
    count: number,
    minSpacing: number = 100
): HexCoord[] {
    const selected: HexCoord[] = [];
    const available = [...hexes];

    // Shuffle available hexes
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }

    for (const hex of available) {
        if (selected.length >= count) break;

        // Check minimum spacing from all already-selected
        const tooClose = selected.some(s => hexDistance(s, hex) < minSpacing);
        if (!tooClose) {
            selected.push(hex);
        }
    }

    return selected;
}

/**
 * Star connection representing a valid path between stars
 */
export interface StarConnection {
    sourceId: string;
    targetId: string;
    distance: number;
}

/**
 * Generate connections between stars based on proximity
 * Creates a connected graph with no isolated stars
 * 
 * @param stars - Array of stars with id, x, y
 * @param maxDistance - Maximum distance for auto-connection
 * @returns Array of bi-directional connections
 */
export function generateStarConnections<T extends { id: string; x: number; y: number }>(
    stars: T[],
    maxDistance: number
): StarConnection[] {
    const connections: StarConnection[] = [];
    const connected = new Set<string>();

    // First pass: connect all stars within max distance
    for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
            const a = stars[i];
            const b = stars[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= maxDistance) {
                connections.push({
                    sourceId: a.id,
                    targetId: b.id,
                    distance: dist
                });
                connected.add(a.id);
                connected.add(b.id);
            }
        }
    }

    // Second pass: ensure no isolated stars
    for (const star of stars) {
        if (!connected.has(star.id)) {
            // Find closest star to connect
            let closest: T | null = null;
            let closestDist = Infinity;

            for (const other of stars) {
                if (other.id === star.id) continue;
                const dx = other.x - star.x;
                const dy = other.y - star.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < closestDist) {
                    closest = other;
                    closestDist = dist;
                }
            }

            if (closest) {
                connections.push({
                    sourceId: star.id,
                    targetId: closest.id,
                    distance: closestDist
                });
                connected.add(star.id);
            }
        }
    }

    return connections;
}

/**
 * Check if two stars are connected (directly)
 */
export function areConnected(
    starAId: string,
    starBId: string,
    connections: StarConnection[]
): boolean {
    return connections.some(c =>
        (c.sourceId === starAId && c.targetId === starBId) ||
        (c.sourceId === starBId && c.targetId === starAId)
    );
}

/**
 * Get all stars connected to a given star
 */
export function getConnectedStars(
    starId: string,
    connections: StarConnection[]
): string[] {
    return connections
        .filter(c => c.sourceId === starId || c.targetId === starId)
        .map(c => c.sourceId === starId ? c.targetId : c.sourceId);
}

/**
 * Draw a hexagon path for rendering
 * Returns vertices as [x, y] pairs
 */
export function getHexVertices(
    cx: number,
    cy: number,
    radius: number
): [number, number][] {
    const vertices: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        vertices.push([
            cx + radius * Math.cos(angle),
            cy + radius * Math.sin(angle)
        ]);
    }
    return vertices;
}
