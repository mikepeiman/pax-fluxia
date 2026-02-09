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
import { Delaunay } from 'd3-delaunay';

/**
 * Compute the shortest distance from point (px, py) to line segment (ax, ay)–(bx, by).
 * Used to detect connections that pass too close to intermediate stars.
 */
function pointToSegmentDistance(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number
): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.sqrt((px - ax) ** 2 + (py - ay) ** 2);

    // Project point onto line, clamped to [0, 1]
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const projX = ax + t * dx;
    const projY = ay + t * dy;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

/**
 * Generate connections between stars using Delaunay Triangulation
 * This ensures a planar graph (no crossing lines) and natural proximity connections.
 * 
 * @param stars - Array of stars with id, x, y
 * @param maxDistance - Optional maximum distance to prune extremely long edges
 * @param minLinksPerStar - Minimum links each star should have (default 1)
 * @param maxLinksPerStar - Maximum links each star should have (default 6)
 * @returns Array of bi-directional connections
 */
export function generateStarConnections<T extends { id: string; x: number; y: number }>(
    stars: T[],
    maxDistance: number = Infinity,
    minLinksPerStar: number = 1,
    maxLinksPerStar: number = 6
): StarConnection[] {
    if (stars.length < 2) return [];

    // Create Delaunay triangulation
    const points = stars.map(s => [s.x, s.y] as [number, number]);
    const delaunay = Delaunay.from(points);

    // Build adjacency with distances for each star
    const starEdges = new Map<string, { targetId: string; distance: number }[]>();
    stars.forEach(s => starEdges.set(s.id, []));

    // Collect all potential edges from Delaunay
    for (let i = 0; i < stars.length; i++) {
        const neighbors = delaunay.neighbors(i);
        for (const neighborIndex of neighbors) {
            if (i < neighborIndex) {
                const a = stars[i];
                const b = stars[neighborIndex];

                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= maxDistance) {
                    starEdges.get(a.id)!.push({ targetId: b.id, distance: dist });
                    starEdges.get(b.id)!.push({ targetId: a.id, distance: dist });
                }
            }
        }
    }

    // Sort each star's edges by distance (shortest first)
    starEdges.forEach(edges => edges.sort((a, b) => a.distance - b.distance));

    // Build final connection set, respecting min/max constraints
    const finalConnections = new Set<string>();
    const linkCount = new Map<string, number>();
    stars.forEach(s => linkCount.set(s.id, 0));

    // Helper to make canonical edge key
    const edgeKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`;

    // Phase 1: Ensure minimum links for each star
    stars.forEach(star => {
        const edges = starEdges.get(star.id)!;
        for (const edge of edges) {
            const currentCount = linkCount.get(star.id)!;
            if (currentCount >= minLinksPerStar) break;

            const targetCount = linkCount.get(edge.targetId)!;
            if (targetCount >= maxLinksPerStar) continue; // Target already at max

            const key = edgeKey(star.id, edge.targetId);
            if (!finalConnections.has(key)) {
                finalConnections.add(key);
                linkCount.set(star.id, currentCount + 1);
                linkCount.set(edge.targetId, targetCount + 1);
            }
        }
    });

    // Phase 2: Add more connections where both stars are below max
    stars.forEach(star => {
        const edges = starEdges.get(star.id)!;
        for (const edge of edges) {
            const currentCount = linkCount.get(star.id)!;
            const targetCount = linkCount.get(edge.targetId)!;

            if (currentCount >= maxLinksPerStar || targetCount >= maxLinksPerStar) continue;

            const key = edgeKey(star.id, edge.targetId);
            if (!finalConnections.has(key)) {
                finalConnections.add(key);
                linkCount.set(star.id, currentCount + 1);
                linkCount.set(edge.targetId, targetCount + 1);
            }
        }
    });
    // Phase 3: Remove lanes with near-zero angle between them at a star
    // For each star, compute angles to all connected neighbors.
    // If two lanes are within MIN_ANGLE_DEG of each other, remove the longer one.
    const MIN_ANGLE_RAD = (15 * Math.PI) / 180; // 15° minimum angle

    const starPositions = new Map(stars.map(s => [s.id, s]));

    // Iterate until no more removals needed
    let changed = true;
    while (changed) {
        changed = false;
        for (const star of stars) {
            // Get all current connections for this star
            const connectedEdges: { key: string; targetId: string; angle: number; dist: number }[] = [];
            finalConnections.forEach(key => {
                const [aId, bId] = key.split('|');
                let targetId: string | null = null;
                if (aId === star.id) targetId = bId;
                else if (bId === star.id) targetId = aId;
                if (!targetId) return;

                const target = starPositions.get(targetId)!;
                const dxe = target.x - star.x;
                const dye = target.y - star.y;
                const angle = Math.atan2(dye, dxe);
                const dist = Math.sqrt(dxe * dxe + dye * dye);
                connectedEdges.push({ key, targetId, angle, dist });
            });

            if (connectedEdges.length < 2) continue;

            // Sort by angle
            connectedEdges.sort((a, b) => a.angle - b.angle);

            // Check adjacent pairs (including wraparound)
            for (let i = 0; i < connectedEdges.length; i++) {
                const curr = connectedEdges[i];
                const next = connectedEdges[(i + 1) % connectedEdges.length];

                let angleDiff = next.angle - curr.angle;
                if (angleDiff < 0) angleDiff += 2 * Math.PI;

                if (angleDiff < MIN_ANGLE_RAD) {
                    // Remove the longer edge (keep shorter for tighter connectivity)
                    const toRemove = curr.dist > next.dist ? curr : next;

                    // Only remove if both stars would keep at least minLinksPerStar connections
                    const sourceCount = linkCount.get(star.id)!;
                    const targetCount = linkCount.get(toRemove.targetId)!;
                    if (sourceCount > minLinksPerStar && targetCount > minLinksPerStar) {
                        finalConnections.delete(toRemove.key);
                        linkCount.set(star.id, sourceCount - 1);
                        linkCount.set(toRemove.targetId, targetCount - 1);
                        changed = true;
                        break; // Restart inner loop for this star
                    }
                }
            }
        }
    }

    // Phase 4: Remove connections that pass too close to intermediate stars
    // (lanes visually passing "under" unconnected stars)
    const CLEARANCE_RADIUS = 35; // star radius (25) + padding (10)

    changed = true;
    while (changed) {
        changed = false;
        for (const key of Array.from(finalConnections)) {
            const [aId, bId] = key.split('|');
            const starA = starPositions.get(aId)!;
            const starB = starPositions.get(bId)!;

            // Check every other star for pass-through
            let passesThrough = false;
            for (const other of stars) {
                if (other.id === aId || other.id === bId) continue;

                const dist = pointToSegmentDistance(
                    other.x, other.y,
                    starA.x, starA.y,
                    starB.x, starB.y
                );
                if (dist < CLEARANCE_RADIUS) {
                    passesThrough = true;
                    break;
                }
            }

            if (passesThrough) {
                // Only remove if both endpoints keep minimum links
                const aCount = linkCount.get(aId)!;
                const bCount = linkCount.get(bId)!;
                if (aCount > minLinksPerStar && bCount > minLinksPerStar) {
                    finalConnections.delete(key);
                    linkCount.set(aId, aCount - 1);
                    linkCount.set(bId, bCount - 1);
                    changed = true;
                }
            }
        }
    }

    // Convert to connection array
    const connections: StarConnection[] = [];
    finalConnections.forEach(key => {
        const [sourceId, targetId] = key.split('|');
        const source = stars.find(s => s.id === sourceId)!;
        const target = stars.find(s => s.id === targetId)!;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        connections.push({ sourceId, targetId, distance: dist });
    });

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
