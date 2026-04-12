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

function minDistToSelected(hex: HexCoord, selected: HexCoord[]): number {
    let m = Infinity;
    for (const s of selected) {
        const d = dist(s, hex);
        if (d < m) m = d;
    }
    return m;
}

function pickBoardFitCornerSeeds(
    width: number,
    height: number,
    paddingX: number,
    paddingY: number,
): HexCoord[] {
    return [
        { x: paddingX + BOARD_FIT_INSET, y: paddingY + BOARD_FIT_INSET },
        { x: width - paddingX - BOARD_FIT_INSET, y: paddingY + BOARD_FIT_INSET },
        { x: paddingX + BOARD_FIT_INSET, y: height - paddingY - BOARD_FIT_INSET },
        { x: width - paddingX - BOARD_FIT_INSET, y: height - paddingY - BOARD_FIT_INSET },
    ];
}

/**
 * Select `count` positions from a hex grid with minimum spacing.
 * `placementUniformity` blends farthest-point (maximin) picks vs random valid picks: 1 = even spread,
 * 0 = organic / asymmetric clusters (similar to legacy shuffle+greedy).
 *
 * @param hexes            - Candidate hex positions
 * @param count            - Number to select
 * @param minSpacing       - Desired minimum pixel spacing
 * @param absoluteMinSpacing - Hard floor (default 50)
 * @param placementUniformity - 0..1, same knob as map board-fit (high = uniform placement)
 * @returns Selected positions (may be fewer than count if grid is too small)
 */
export function selectPositions(
    hexes: HexCoord[],
    count: number,
    minSpacing: number,
    absoluteMinSpacing: number = 50,
    placementUniformity: number = 1,
    seedPositions: HexCoord[] = [],
): MapPosition[] {
    const u = Math.max(0, Math.min(1, placementUniformity));
    const floor = Math.max(absoluteMinSpacing, 50);
    let spacing = minSpacing;

    while (spacing >= floor) {
        const pool = shuffled(hexes);
        const selected: HexCoord[] = [];
        const seeded = new Set<string>();

        if (pool.length === 0) break;

        for (const seed of seedPositions) {
            if (selected.length >= count) break;
            const key = `${seed.x},${seed.y}`;
            if (seeded.has(key)) continue;
            selected.push(seed);
            seeded.add(key);
            const idx = pool.findIndex((hex) => hex.x === seed.x && hex.y === seed.y);
            if (idx >= 0) pool.splice(idx, 1);
        }

        if (selected.length === 0) {
            const seedIdx = Math.floor(Math.random() * pool.length);
            selected.push(pool[seedIdx]!);
            pool.splice(seedIdx, 1);
        }

        while (selected.length < count && pool.length > 0) {
            const candidates = pool.filter(h => selected.every(s => dist(s, h) >= spacing));
            if (candidates.length === 0) break;

            let best = candidates[0]!;
            let bestScore = minDistToSelected(best, selected);
            for (let i = 1; i < candidates.length; i++) {
                const h = candidates[i]!;
                const score = minDistToSelected(h, selected);
                if (score > bestScore) {
                    bestScore = score;
                    best = h;
                }
            }
            const chosen = Math.random() < u ? best : candidates[Math.floor(Math.random() * candidates.length)]!;
            selected.push(chosen);
            const ri = pool.indexOf(chosen);
            if (ri >= 0) pool.splice(ri, 1);
        }

        if (selected.length >= count) return selected;
        spacing *= 0.8;
    }

    // Absolute fallback: random pick, no spacing constraint
    return shuffled(hexes).slice(0, count);
}

/** Inset from padded edge when fitting bbox (matches typical star draw radius). */
const BOARD_FIT_INSET = 25;

/**
 * Blend from raw placement (t=0) to uniform scale+translate that centers the bbox in the map and
 * fills the inner padded rect (t=1). Preserves relative directions — safe for Delaunay connections.
 */
function applyBoardFit(
    positions: MapPosition[],
    width: number,
    height: number,
    paddingX: number,
    paddingY: number,
    boardFit: number,
): MapPosition[] {
    const t = Math.max(0, Math.min(1, boardFit));
    if (t <= 0 || positions.length < 2) return positions;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of positions) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
    }
    const bboxW = maxX - minX;
    const bboxH = maxY - minY;
    if (bboxW <= 0 || bboxH <= 0) return positions;

    const innerW = width - 2 * paddingX - 2 * BOARD_FIT_INSET;
    const innerH = height - 2 * paddingY - 2 * BOARD_FIT_INSET;
    if (innerW <= 0 || innerH <= 0) return positions;

    const scaleFull = Math.min(innerW / bboxW, innerH / bboxH);
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    const targetX = width / 2;
    const targetY = height / 2;

    return positions.map(p => {
        const fx = (p.x - midX) * scaleFull + targetX;
        const fy = (p.y - midY) * scaleFull + targetY;
        return {
            x: p.x + (fx - p.x) * t,
            y: p.y + (fy - p.y) * t,
        };
    });
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
    boardFit?: number;
}): { positions: MapPosition[]; hexRadius: number; width: number; height: number; paddingX: number; paddingY: number } {
    const { totalStars, spacingMultiplier = 1.0, boardFit = 0 } = config;
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

    let positions: MapPosition[];
    if (boardFit >= 0.999) {
        const cornerSeeds = totalStars >= 4
            ? pickBoardFitCornerSeeds(width, height, paddingX, paddingY)
            : [];
        positions = selectPositions(
            hexes,
            totalStars,
            minSpacing,
            physicsMinSpacing,
            1,
            cornerSeeds,
        );
    } else {
        const raw = selectPositions(
            hexes,
            totalStars,
            minSpacing,
            physicsMinSpacing,
            boardFit,
        );
        positions = applyBoardFit(raw, width, height, paddingX, paddingY, boardFit);
    }

    return { positions, hexRadius, width, height, paddingX, paddingY };
}
