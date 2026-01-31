// ============================================================================
// Render Utilities - Animation interpolation for ships
// ============================================================================

import { GAME_CONFIG } from '$lib/config/game.config';

/**
 * Ship visual state for rendering
 */
export interface ShipVisual {
    x: number;
    y: number;
    rotation: number;
    scale: number;
    alpha: number;
}

/**
 * Calculate orbit positions for ships around a star
 * Ships orbit in concentric rings to show exact count
 * Uses multiple rings for large fleets, with scaling
 */
/**
 * Calculate packed ship positions in concentric rings
 * Ships pack densely around the star. After 10 layers, they visually enlarge.
 */
export function getPackedPositions(
    cx: number,
    cy: number,
    starRadius: number,
    count: number,
    time: number
): ShipVisual[] {
    const positions: ShipVisual[] = [];

    const BASE_SIZE = GAME_CONFIG.SHIP_BASE_SIZE; // e.g. 4
    const PADDING = 2; // Space between star and first ring
    const RING_SPACING = BASE_SIZE * 1.4; // Space between rings
    const SHIP_SPACING = BASE_SIZE * 1.4; // Space between ships in a ring

    let currentRadius = starRadius + PADDING + BASE_SIZE;
    let remaining = count;
    let layer = 0;

    // Pulse animation factor shared by all
    const pulse = Math.sin(time * 2) * 2;

    while (remaining > 0) {
        // Enlarge ships after layer 10 to represent aggregation
        // Actual limit: we STOP adding layers after MAX_LAYERS
        const MAX_LAYERS = 10;

        // If we are past the max layers, we simply stop rendering distinct ships
        // and assume the outer layer represents the "rest" via scaling or density.
        // HOWEVER, the requirement is "Aggregation: At high counts, outer ships scale up (2x)".
        // And "dispersed rings... should not exist".

        // Let's implement a hard cap on visual layers to prevent the "explosion"
        if (layer >= MAX_LAYERS) {
            // We have too many ships. 
            // We want to make the OUTERMOST rendered layer look "heavy".
            // But if we just stop, the user won't know there are 1000 ships vs 100.

            // Alternative strategy:
            // If count is huge, we increase the SCALE of the ships in the outer layers,
            // effectively fitting MORE value into the same visual space? 
            // Or just make them bigger.

            // For now, adhering to: "max 10 concentric rings".
            break;
        }

        const isDense = layer >= 8; // Start scaling a bit earlier to transition?
        const scale = isDense ? 2 : 1;

        const effectiveSpacing = SHIP_SPACING * scale;
        const circumference = 2 * Math.PI * currentRadius;

        // Calculate capacity of this ring
        let capacity = Math.floor(circumference / effectiveSpacing);
        capacity = Math.max(1, capacity); // At least 1 ship

        const countInRing = Math.min(remaining, capacity);
        const angleStep = (2 * Math.PI) / countInRing;

        // Rotate rings slowly in alternating directions
        const ringRotation = time * (0.2 / (layer + 1)) * (layer % 2 === 0 ? 1 : -1);

        for (let i = 0; i < countInRing; i++) {
            const angle = i * angleStep + ringRotation;

            positions.push({
                x: cx + Math.cos(angle) * (currentRadius + pulse * 0.1),
                y: cy + Math.sin(angle) * (currentRadius + pulse * 0.1),
                rotation: angle + Math.PI / 2,
                scale: 0.8 * scale,
                alpha: 1.0
            });
        }

        remaining -= countInRing;
        currentRadius += RING_SPACING * scale;
        layer++;
    }

    return positions;
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
