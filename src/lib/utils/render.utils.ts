// ============================================================================
// Render Utilities - Animation interpolation for ships
// ============================================================================

import { GAME_CONFIG } from '$lib/config/game.config';

/**
 * Ship visual state for rendering
 */
/**
 * Persistent visual state for a single ship
 */
export interface VisualShipState {
    id: number; // Unique ID for tracking
    x: number;
    y: number;
    vx: number; // Velocity X
    vy: number; // Velocity Y
    targetIndex: number; // Which slot it's trying to reach
    scale: number;
    alpha: number;
    spawnTime: number;
}

/**
 * Calculate stable target slot for a ship in orbit
 * 
 * Performance Note: This is pure math (trig), no allocations if called individually.
 * To optimize large fleets, we calculate the specific slot needed for a ship index,
 * rather than regenerating the whole array every frame.
 */
export function getOrbitSlot(
    index: number,
    cx: number,
    cy: number,
    starRadius: number,
    time: number
): { x: number, y: number } {
    const BASE_SIZE = GAME_CONFIG.SHIP_BASE_SIZE || 4;
    const PADDING = 2;
    const RING_SPACING = BASE_SIZE * 1.4;

    // Determine which layer (ring) this index belongs to
    // We solve for layer by filling inner rings first

    // Ring 0 capacity: ~ (2 * PI * r) / size
    // This is iterative, but for < 500 ships it's fast enough.
    // For O(1), we'd need an approximation or lookup table.

    let layer = 0;
    let currentRadius = starRadius + PADDING + BASE_SIZE;
    let countInInnerLayers = 0;

    // Fast-forward to correct layer
    // Optimization: Hardcode first few layer capacities? 
    // Ring 0 (~60px circumference / 6px) ~= 10 ships
    // Ring 1 (~80px / 6px) ~= 13 ships
    // etc.

    while (true) {
        const circumference = 2 * Math.PI * currentRadius;
        const capacity = Math.max(1, Math.floor(circumference / (BASE_SIZE * 1.5)));

        if (index < countInInnerLayers + capacity) {
            // It's in this layer
            const indexInRing = index - countInInnerLayers;
            const angleStep = (2 * Math.PI) / capacity;

            // Rotate rings slowly
            const ringRotation = time * (0.2 / (layer + 1)) * (layer % 2 === 0 ? 1 : -1);
            const angle = indexInRing * angleStep + ringRotation;

            return {
                x: cx + Math.cos(angle) * currentRadius,
                y: cy + Math.sin(angle) * currentRadius
            };
        }

        countInInnerLayers += capacity;
        currentRadius += RING_SPACING;
        layer++;

        // Safety break for extreme counts
        if (layer > 20) {
            // Fallback for overcrowding
            return {
                x: cx + Math.cos(index) * (currentRadius + 20),
                y: cy + Math.sin(index) * (currentRadius + 20)
            };
        }
    }
}

/**
 * Calculate positions for ships in a traveling fleet
 * Ships are clustered around the fleet's current progress position
 */
export function getFleetPositions(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    shipCount: number,
    progress: number, // 0-1 fleet progress
    time: number // for animation
): ShipVisual[] {
    const ships: ShipVisual[] = [];
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const MAX_FLEET_VISIBLE = 50;
    const visibleCount = Math.min(shipCount, MAX_FLEET_VISIBLE);

    // Scale cloud size based on ship count, but cap it so it doesn't look like a swarm of bees unless massive
    const cloudRadius = Math.min(20, 5 + Math.sqrt(visibleCount) * 2);

    for (let i = 0; i < visibleCount; i++) {
        // Deterministic pseudo-random offsets based on index
        // This ensures ships stay in relative position as they travel
        const seed = i * 1337;
        const rndX = Math.sin(seed) * cloudRadius;
        const rndY = Math.cos(seed * 0.7) * cloudRadius;

        // Add some breathing animation
        const breath = Math.sin(time * 3 + i) * 2;

        // Calculate center position based on progress
        const centerX = sourceX + dx * progress;
        const centerY = sourceY + dy * progress;

        // Rotate offsets to align with travel direction? 
        // No, a cloud is usually amorphous. But maybe slightly elongated?
        // Let's keep it simple: cloud around center.

        ships.push({
            x: centerX + rndX + breath * 0.5,
            y: centerY + rndY + breath * 0.5,
            rotation: angle, // Face forward
            scale: 0.8 + Math.sin(seed) * 0.2, // Random sizes
            alpha: 1.0
        });
    }

    return ships;
}

/**
 * Convert screen coordinates to game world coordinates
 * (For now, 1:1 mapping with offset for centering)
 */
export function screenToWorld(
    screenX: number,
    screenY: number,
    canvasWidth: number,
    canvasHeight: number
): { x: number; y: number } {
    // Direct mapping for now
    return { x: screenX, y: screenY };
}

/**
 * Convert game world coordinates to screen coordinates
 */
export function worldToScreen(
    worldX: number,
    worldY: number,
    canvasWidth: number,
    canvasHeight: number
): { x: number; y: number } {
    // Direct mapping for now
    return { x: worldX, y: worldY };
}

/**
 * Linear interpolation for smooth number transitions
 */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}
