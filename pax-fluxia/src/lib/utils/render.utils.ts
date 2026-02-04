// ============================================================================
// Render Utilities - Animation interpolation for ships
// ============================================================================

import { GAME_CONFIG } from '$lib/config/game.config';

/**
 * Ship visual state for rendering
 */
/**
 * Ship visual state for rendering (Legacy/Stateless)
 */
export interface ShipVisual {
    x: number;
    y: number;
    rotation: number;
    scale: number;
    alpha: number;
}

/**
 * Persistent visual state for a single ship (Orbit/Physics)
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
 * Maximum number of orbit layers before stacking begins.
 * After this, ships wrap to layer 0 with a 2x multiplier, then 4x, etc.
 */
const MAX_ORBIT_LAYERS = 10;

/**
 * Calculate the total capacity of layers 0 through maxLayer
 */
function calculateTotalCapacity(starRadius: number): { layerCapacities: number[], totalCapacity: number } {
    const BASE_SIZE = GAME_CONFIG.SHIP_BASE_SIZE || 4;
    const PADDING = 2;
    const RING_SPACING = BASE_SIZE * 1.4;

    const layerCapacities: number[] = [];
    let totalCapacity = 0;
    let currentRadius = starRadius + PADDING + BASE_SIZE;

    for (let layer = 0; layer < MAX_ORBIT_LAYERS; layer++) {
        const circumference = 2 * Math.PI * currentRadius;
        const capacity = Math.max(1, Math.floor(circumference / (BASE_SIZE * 1.5)));
        layerCapacities.push(capacity);
        totalCapacity += capacity;
        currentRadius += RING_SPACING;
    }

    return { layerCapacities, totalCapacity };
}

/**
 * Calculate stable target slot for a ship in orbit
 * 
 * Now with stacking: after 10 layers, ships wrap to layer 0 with 2x multiplier.
 * Returns { x, y, multiplier } where multiplier is 1, 2, 4, 8, etc.
 */
export function getOrbitSlot(
    index: number,
    cx: number,
    cy: number,
    starRadius: number,
    time: number
): { x: number, y: number, multiplier: number } {
    const BASE_SIZE = GAME_CONFIG.SHIP_BASE_SIZE || 4;
    const PADDING = 2;
    const RING_SPACING = BASE_SIZE * 1.4;

    // Calculate total capacity for 10 layers
    const { layerCapacities, totalCapacity } = calculateTotalCapacity(starRadius);

    // Calculate which "wrap cycle" we're in and the effective index within that cycle
    const wrapCycle = Math.floor(index / totalCapacity);
    const effectiveIndex = index % totalCapacity;
    const multiplier = Math.pow(2, wrapCycle); // 1, 2, 4, 8, ...

    // Find which layer this effective index belongs to
    let layer = 0;
    let countInInnerLayers = 0;
    let currentRadius = starRadius + PADDING + BASE_SIZE;

    for (layer = 0; layer < MAX_ORBIT_LAYERS; layer++) {
        const capacity = layerCapacities[layer];

        if (effectiveIndex < countInInnerLayers + capacity) {
            // It's in this layer
            const indexInRing = effectiveIndex - countInInnerLayers;
            const angleStep = (2 * Math.PI) / capacity;

            // Rotate rings slowly, alternating direction
            const ringRotation = time * (0.2 / (layer + 1)) * (layer % 2 === 0 ? 1 : -1);
            const angle = indexInRing * angleStep + ringRotation;

            return {
                x: cx + Math.cos(angle) * currentRadius,
                y: cy + Math.sin(angle) * currentRadius,
                multiplier
            };
        }

        countInInnerLayers += capacity;
        currentRadius += RING_SPACING;
    }

    // Fallback (shouldn't reach here due to modulo)
    return {
        x: cx + Math.cos(effectiveIndex) * currentRadius,
        y: cy + Math.sin(effectiveIndex) * currentRadius,
        multiplier
    };
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
