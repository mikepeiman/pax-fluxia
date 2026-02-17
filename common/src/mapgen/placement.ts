// ============================================================================
// Map Generation — Hex Grid Placement
// Extracted from pax-fluxia/src/lib/engine/HexGrid.ts
//                + pax-fluxia/src/lib/utils/hex.utils.ts (selectRandomHexPositions)
// ============================================================================

import type { MapPosition } from './types';

// ---------------------------------------------------------------------------
// Hex Grid Generation
// ---------------------------------------------------------------------------

interface HexCoord {
    x: number;
    y: number;
}

/**
 * Generate a regular hexagonal grid of positions.
 * Uses pointy-top hex packing for even distribution.
 *
 * @param width  - Available width in pixels
 * @param height - Available height in pixels
 * @param radius - Hex cell radius (center to vertex)
 * @returns Array of hex center positions
 */
export function generateHexGrid(width: number, height: number, radius: number): HexCoord[] {
    const hexWidth = radius * 2;
    const hexHeight = Math.sqrt(3) * radius;
    const xStep = hexWidth * 0.75;
    const yStep = hexHeight;

    const cols = Math.floor(width / xStep);
    const rows = Math.floor(height / yStep);
    const coords: HexCoord[] = [];

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = col * xStep + radius;
            let y = row * yStep + hexHeight / 2;
            if (col % 2 === 1) y += hexHeight / 2;

            if (x + radius <= width && y + radius <= height) {
                coords.push({ x: Math.round(x), y: Math.round(y) });
            }
        }
    }
    return coords;
}

// ---------------------------------------------------------------------------
// Position Selection with Spacing
// ---------------------------------------------------------------------------

function dist(a: HexCoord, b: HexCoord): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Select `count` positions from a hex grid with minimum spacing.
 * Uses adaptive retry: if spacing is too tight, reduces by 20% per attempt.
 *
 * @param hexes            - Candidate hex positions
 * @param count            - Number to select
 * @param minSpacing       - Desired minimum pixel spacing
 * @param absoluteMinSpacing - Hard floor (default 50)
 * @returns Selected positions (may be fewer than count if grid is too small)
 */
export function selectPositions(
    hexes: HexCoord[],
    count: number,
    minSpacing: number,
    absoluteMinSpacing: number = 50,
): MapPosition[] {
    const floor = Math.max(absoluteMinSpacing, 50);
    let spacing = minSpacing;

    while (spacing >= floor) {
        const selected: HexCoord[] = [];
        const available = shuffled(hexes);

        for (const hex of available) {
            if (selected.length >= count) break;
            if (!selected.some(s => dist(s, hex) < spacing)) {
                selected.push(hex);
            }
        }

        if (selected.length >= count) return selected;
        spacing *= 0.8;
    }

    // Absolute fallback: random pick, no spacing constraint
    return shuffled(hexes).slice(0, count);
}

function shuffled<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

// ---------------------------------------------------------------------------
// High-Level: Generate Star Positions from Config
// ---------------------------------------------------------------------------

/**
 * Physics-aware spacing constants (must match render.utils.ts).
 */
const STAR_RADIUS = 20;
const SHIP_BASE_SIZE = 4;
const RING_SPACING = SHIP_BASE_SIZE * 1.4;
const MAX_ORBIT_LAYERS = 5;
const SPACING_BUFFER = 20;

/**
 * Generate star positions for a map.
 * Handles adaptive hex radius, physics-aware spacing, and padding.
 *
 * @returns { positions, hexRadius, width, height }
 */
export function generateStarPositions(config: {
    width: number;
    height: number;
    totalStars: number;
    spacingMultiplier?: number;
    hexRadius?: number;
}): { positions: MapPosition[]; hexRadius: number; width: number; height: number; paddingX: number; paddingY: number } {
    const { totalStars, spacingMultiplier = 1.0 } = config;
    const scaleFactor = Math.max(1, spacingMultiplier);
    const width = Math.round(config.width * scaleFactor);
    const height = Math.round(config.height * scaleFactor);

    // Dynamic padding
    const basePaddingX = totalStars > 50 ? 80 : totalStars > 20 ? 120 : 150;
    const basePaddingY = totalStars > 50 ? 60 : totalStars > 20 ? 80 : 100;
    const paddingX = Math.round(basePaddingX * scaleFactor);
    const paddingY = Math.round(basePaddingY * scaleFactor);

    // Adaptive hex radius
    let hexRadius = config.hexRadius ?? 60;
    const gridArea = (width - paddingX * 2) * (height - paddingY * 2);
    const neededPositions = totalStars * 3;
    const maxHexArea = gridArea / neededPositions;
    const maxHexRadius = Math.sqrt(maxHexArea / (1.5 * Math.sqrt(3)));
    hexRadius = Math.max(20, Math.min(hexRadius, Math.floor(maxHexRadius)));

    // Generate hex grid within padded area
    const gridWidth = width - paddingX * 2;
    const gridHeight = height - paddingY * 2;
    const rawHexes = generateHexGrid(gridWidth, gridHeight, hexRadius);
    const hexes = rawHexes.map(h => ({ x: h.x + paddingX, y: h.y + paddingY }));

    // Physics-aware minimum spacing
    const physicsMinSpacing = (STAR_RADIUS * 2) + (RING_SPACING * MAX_ORBIT_LAYERS * 2) + SPACING_BUFFER;
    const minSpacing = physicsMinSpacing * spacingMultiplier;

    const positions = selectPositions(hexes, totalStars, minSpacing, physicsMinSpacing);

    return { positions, hexRadius, width, height, paddingX, paddingY };
}
