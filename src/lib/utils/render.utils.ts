// ============================================================================
// Render Utilities - Animation interpolation for ships
// ============================================================================

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
 * Uses multiple rings for large fleets
 */
export function getOrbitPositions(
    starX: number,
    starY: number,
    starRadius: number,
    shipCount: number,
    time: number,
    orbitSpeed: number = 0.5
): ShipVisual[] {
    const ships: ShipVisual[] = [];

    // Config for rings
    const SHIPS_PER_RING = 8;  // Ships per orbital ring
    const RING_SPACING = 8;   // Pixels between rings
    const BASE_ORBIT = starRadius + 10;
    const MAX_VISIBLE = 64;   // Max ships to render per star (performance)

    const visibleCount = Math.min(shipCount, MAX_VISIBLE);

    for (let i = 0; i < visibleCount; i++) {
        const ring = Math.floor(i / SHIPS_PER_RING);
        const slot = i % SHIPS_PER_RING;
        const shipsInThisRing = Math.min(SHIPS_PER_RING, visibleCount - ring * SHIPS_PER_RING);

        const orbitRadius = BASE_ORBIT + (ring * RING_SPACING);

        // Base angle for this ship slot
        const baseAngle = (slot / shipsInThisRing) * Math.PI * 2;
        // Add rotation over time (outer rings rotate slower)
        const ringSpeedMod = 1 / (1 + ring * 0.3);
        const angle = baseAngle + time * orbitSpeed * ringSpeedMod;

        ships.push({
            x: starX + Math.cos(angle) * orbitRadius,
            y: starY + Math.sin(angle) * orbitRadius,
            rotation: angle + Math.PI / 2, // Point tangent to orbit
            scale: 1 - ring * 0.1, // Outer rings slightly smaller
            alpha: 1 - ring * 0.1  // Outer rings slightly faded
        });
    }

    return ships;
}

/**
 * Calculate surge positions for ships traveling between stars
 * Ships move in a wave pattern along the flow line
 */
export function getSurgePositions(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    sourceRadius: number,
    targetRadius: number,
    shipCount: number,
    progress: number, // 0-1 tick progress
    waveOffset: number = 0
): ShipVisual[] {
    const ships: ShipVisual[] = [];
    const dx = targetX - sourceX;
    const dy = targetY - sourceY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    const MAX_SURGE_VISIBLE = 20;
    const visibleCount = Math.min(shipCount, MAX_SURGE_VISIBLE);

    // Ships are spread along the path, moving towards target
    for (let i = 0; i < visibleCount; i++) {
        // Each ship is offset along the path
        const spacing = 0.08;
        const baseT = (i * spacing + progress * spacing) % 1;

        // Clamp to valid range (not inside stars)
        const minT = sourceRadius / dist;
        const maxT = 1 - (targetRadius / dist);
        const t = minT + baseT * (maxT - minT);

        // Add a wave motion perpendicular to travel
        const perpOffset = Math.sin(t * Math.PI * 3 + waveOffset + i * 0.5) * 5;
        const perpAngle = angle + Math.PI / 2;

        ships.push({
            x: sourceX + dx * t + Math.cos(perpAngle) * perpOffset,
            y: sourceY + dy * t + Math.sin(perpAngle) * perpOffset,
            rotation: angle,
            scale: 0.8 + Math.sin(t * Math.PI) * 0.2, // Slightly bigger in middle
            alpha: 1
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
