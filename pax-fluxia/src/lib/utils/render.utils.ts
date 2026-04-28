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
 * Ship lifecycle state
 */
export type ShipLifecycleState = 'orbiting' | 'departing' | 'traveling' | 'arriving';

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
    // Lifecycle fields
    state: ShipLifecycleState;
    fromStarId: string | null;    // Source star (for traveling)
    toStarId: string | null;      // Destination star (for traveling/arriving)
    departTime: number;           // performance.now() when transition started
    travelDuration: number;       // ms for travel phase
    departDuration: number;       // ms for departure phase
    // Lane endpoints (cached for performance)
    laneStartX: number;
    laneStartY: number;
    laneEndX: number;
    laneEndY: number;
    /** When set (≥2 points), travel uses arc-length along this polyline. */
    lanePolyline?: [number, number][];
    // Departure origin (captured when ship starts departing)
    departFromX: number;
    departFromY: number;
    // Arrival target orbit slot (calculated when arriving phase starts)
    arriveToX: number;
    arriveToY: number;
    arriveStarId: string | null;
    // Per-ship perpendicular offset for organic variation near lane center
    laneOffset: number;
    // Stagger offset for stream formation
    staggerDelay: number;
    // Owner color (needed when ship is in transit between stars)
    ownerId: string;
    // Time-based arc settle (polar interpolation, never crosses star)
    settleStartTime: number;       // performance.now() when orbiting started
    settleStartAngle: number;      // Initial polar angle relative to star center
    settleStartRadius: number;     // Initial radius from star center
    // Arrowhead conquest animation (optional — set by conquestArrowhead strategy)
    arrowWedgeOffset?: number;     // Perpendicular offset in wedge formation (px)
    arrowSpiralDeg?: number;       // Degrees to spiral on arrival (per-ship, can exceed 360)
}

/**
 * Animation timing constants
 */
export const SHIP_ANIM = {
    /** Time to ease out of orbit toward lane (ms) */
    DEPART_DURATION: 350,
    /** Base travel time (ms) — scaled by distance */
    TRAVEL_BASE_DURATION: 350,
    /** Travel time per 100px distance (ms) */
    TRAVEL_PER_100PX: 150,
    /** Time to ease from lane end into orbit slot (ms) */
    ARRIVE_DURATION: 400,
    /** Stagger delay between ships in a stream (ms) */
    STREAM_STAGGER: 40,
    /** Max stagger so large fleets don't take forever to depart */
    MAX_STREAM_STAGGER: 400,
};

/**
 * Maximum number of orbit layers before stacking begins.
 * After this, ships wrap to layer 0 with a 2x multiplier, then 4x, etc.
 */
const MAX_ORBIT_LAYERS = 5;

interface OrbitCapacityMetrics {
    baseSize: number;
    padding: number;
    ringSpacing: number;
    firstLayerRadius: number;
    layerCapacities: number[];
    totalCapacity: number;
}

interface OrbitCapacityConfigState {
    baseSize: number;
    orbitBaseRadius: number;
    orbitRingMult: number;
    orbitDensity: number;
    padding: number;
    ringSpacing: number;
}

let orbitCapacityConfigState: OrbitCapacityConfigState | null = null;
const orbitCapacityCache = new Map<number, OrbitCapacityMetrics>();

function getOrbitCapacityConfigState(): OrbitCapacityConfigState {
    const baseSize = GAME_CONFIG.SHIP_BASE_SIZE || 4;
    const orbitBaseRadius = GAME_CONFIG.ORBIT_BASE_RADIUS || 0;
    const orbitRingMult = GAME_CONFIG.ORBIT_RING_MULT || 1.4;
    const orbitDensity = GAME_CONFIG.ORBIT_DENSITY || 1.5;
    const currentState = orbitCapacityConfigState;
    if (
        currentState &&
        currentState.baseSize === baseSize &&
        currentState.orbitBaseRadius === orbitBaseRadius &&
        currentState.orbitRingMult === orbitRingMult &&
        currentState.orbitDensity === orbitDensity
    ) {
        return currentState;
    }

    const nextState: OrbitCapacityConfigState = {
        baseSize,
        orbitBaseRadius,
        orbitRingMult,
        orbitDensity,
        padding: 2 + orbitBaseRadius,
        ringSpacing: baseSize * orbitRingMult,
    };
    orbitCapacityConfigState = nextState;
    orbitCapacityCache.clear();
    return nextState;
}

/**
 * Calculate the total capacity of layers 0 through maxLayer
 */
function calculateTotalCapacity(starRadius: number): OrbitCapacityMetrics {
    const config = getOrbitCapacityConfigState();

    const cached = orbitCapacityCache.get(starRadius);
    if (cached) {
        return cached;
    }

    const layerCapacities: number[] = [];
    let totalCapacity = 0;
    let currentRadius = starRadius + config.padding + config.baseSize;
    const firstLayerRadius = currentRadius;

    for (let layer = 0; layer < MAX_ORBIT_LAYERS; layer++) {
        const circumference = 2 * Math.PI * currentRadius;
        const capacity = Math.max(
            1,
            Math.floor(circumference / (config.baseSize * config.orbitDensity)),
        );
        layerCapacities.push(capacity);
        totalCapacity += capacity;
        currentRadius += config.ringSpacing;
    }

    const metrics: OrbitCapacityMetrics = {
        baseSize: config.baseSize,
        padding: config.padding,
        ringSpacing: config.ringSpacing,
        firstLayerRadius,
        layerCapacities,
        totalCapacity,
    };
    orbitCapacityCache.set(starRadius, metrics);
    return metrics;
}

/**
 * Calculate stable target slot for a ship in orbit
 * 
 * Now with stacking: after 10 layers, ships wrap to layer 0 with 2x multiplier.
 * Returns { x, y, multiplier } where multiplier is 1, 2, 4, 8, etc.
 * 
 * biasAngle (radians) — direction to bias ships toward (e.g. toward target star)
 * biasStrength (0-1) — how strongly ships cluster toward biasAngle (0=uniform, 1=fully clustered)
 */
export function getOrbitSlot(
    index: number,
    cx: number,
    cy: number,
    starRadius: number,
    time: number,
    biasAngle?: number,
    biasStrength: number = 0,
    totalShips?: number
): {
    x: number;
    y: number;
    multiplier: number;
    layer: number;
    angle: number;
    radius: number;
    ndx: number;
    ndy: number;
} {
    // Orbit starts at ownership-ring edge (visual radius), not game-logic starRadius
    const orbitBase = GAME_CONFIG.STAR_RING_RADIUS ?? starRadius;

    const { ringSpacing, firstLayerRadius, layerCapacities, totalCapacity } =
        calculateTotalCapacity(orbitBase);

    // Calculate which "wrap cycle" we're in and the effective index within that cycle
    const wrapCycle = Math.floor(index / totalCapacity);
    const effectiveIndex = index % totalCapacity;
    const multiplier = Math.pow(2, wrapCycle); // 1, 2, 4, 8, ...

    // Find which layer this effective index belongs to
    let layer = 0;
    let countInInnerLayers = 0;
    let currentRadius = firstLayerRadius;

    for (layer = 0; layer < MAX_ORBIT_LAYERS; layer++) {
        const capacity = layerCapacities[layer];

        if (effectiveIndex < countInInnerLayers + capacity) {
            // It's in this layer
            const indexInRing = effectiveIndex - countInInnerLayers;

            // When totalShips is provided, distribute evenly around full 2π
            // instead of using ring capacity (which leaves a gap when partially filled)
            let actualInRing = capacity;
            if (totalShips !== undefined) {
                const totalEffective = totalShips > totalCapacity
                    ? totalCapacity
                    : totalShips;
                const shipsBeforeThisRing = Math.min(totalEffective, countInInnerLayers);
                actualInRing = Math.min(totalEffective - shipsBeforeThisRing, capacity);
                actualInRing = Math.max(actualInRing, 1);
            }
            const angleStep = (2 * Math.PI) / actualInRing;

            // Rotate rings slowly, alternating direction
            const ringRotation = time * (0.2 / (layer + 1)) * (layer % 2 === 0 ? 1 : -1);
            let angle = indexInRing * angleStep + ringRotation;

            // Apply directional bias — compress angles toward biasAngle
            if (biasAngle !== undefined && biasStrength > 0) {
                // Normalize angle relative to bias direction
                let delta = angle - biasAngle;
                // Wrap to [-PI, PI]
                delta = ((delta + Math.PI) % (2 * Math.PI) + (2 * Math.PI)) % (2 * Math.PI) - Math.PI;
                // Compress: reduce delta by biasStrength (ships cluster toward biasAngle)
                // At strength 1.0, all ships compress to a ~60° arc centered on biasAngle
                const compressed = delta * (1 - biasStrength * 0.7);
                angle = biasAngle + compressed;
            }

            const ndx = Math.cos(angle);
            const ndy = Math.sin(angle);
            return {
                x: cx + ndx * currentRadius,
                y: cy + ndy * currentRadius,
                multiplier,
                layer,
                angle,
                radius: currentRadius,
                ndx,
                ndy,
            };
        }

        countInInnerLayers += capacity;
        currentRadius += ringSpacing;
    }

    // Fallback (shouldn't reach here due to modulo)
    const angle = effectiveIndex;
    const ndx = Math.cos(angle);
    const ndy = Math.sin(angle);
    return {
        x: cx + ndx * currentRadius,
        y: cy + ndy * currentRadius,
        multiplier,
        layer: MAX_ORBIT_LAYERS - 1,
        angle,
        radius: currentRadius,
        ndx,
        ndy,
    };
}

/**
 * Get the number of occupied orbit layers for a given ship count.
 * Used for density tier calculation (inner rings = higher tier).
 */
export function getTotalOccupiedLayers(starRadius: number, shipCount: number): number {
    if (shipCount <= 0) return 0;
    const { layerCapacities } = calculateTotalCapacity(starRadius);
    let remaining = shipCount;
    for (let layer = 0; layer < MAX_ORBIT_LAYERS; layer++) {
        remaining -= layerCapacities[layer];
        if (remaining <= 0) return layer + 1;
    }
    return MAX_ORBIT_LAYERS;
}

/**
 * Get the radius of the outermost occupied orbit ring for a star with N ships.
 * Used to place the orb fragmentation boundary just outside this ring.
 */
export function getOuterOrbitRadius(starRadius: number, shipCount: number): number {
    const { baseSize, padding, ringSpacing, layerCapacities } =
        calculateTotalCapacity(starRadius);

    if (shipCount <= 0) return starRadius + padding + baseSize;

    let currentRadius = starRadius + padding + baseSize;
    let remaining = shipCount;

    for (let layer = 0; layer < MAX_ORBIT_LAYERS; layer++) {
        remaining -= layerCapacities[layer];
        if (remaining <= 0) return currentRadius;
        currentRadius += ringSpacing;
    }
    return currentRadius;
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
