/**
 * Conquest Transfer Strategies
 * 
 * Each strategy function selects and prepares ships from the attacker star
 * for travel to the conquered star. Strategies are registered by name and
 * selected via GAME_CONFIG.CONQUEST_ANIMATION_MODE.
 * 
 * To add a new strategy:
 * 1. Write a function conforming to ConquestTransferStrategy
 * 2. Register it in CONQUEST_STRATEGIES
 * 3. Add its key to the CONQUEST_ANIMATION_MODE type in game.config.ts
 * 4. Add a dropdown option in the debug panel
 */

import type { VisualShipState } from '$lib/utils/render.utils';
import { getOrbitSlot, getOuterOrbitRadius } from '$lib/utils/render.utils';
import { GAME_CONFIG } from '$lib/config/game.config';

// ============================================================================
// Strategy Interface
// ============================================================================

/** Minimal star info needed by strategies */
export interface StarRef {
    x: number;
    y: number;
    radius: number;
}

/** Context passed to every conquest strategy */
export interface ConquestTransferContext {
    /** All visual ships currently at the attacker star */
    ships: VisualShipState[];
    /** Attacker star position/radius */
    attackerStar: StarRef;
    /** Conquered star position/radius */
    conqueredStar: StarRef;
    /** How many ships to transfer */
    transferCount: number;
    /** New owner player ID */
    newOwner: string;
    /** performance.now() at time of conquest */
    now: number;
    /** Effective tick duration in ms (for timing calculations) */
    effectiveTickMs: number;
    /** Attacker star ID (for ship routing) */
    attackerStarId: string;
    /** Conquered star ID (for ship routing) */
    conqueredStarId: string;
}

/** Result returned by every conquest strategy */
export interface ConquestTransferResult {
    /** Ships entering the travel pipeline (pushed to travelingShips[]) */
    departing: VisualShipState[];
    /** Ships that go directly to conquered star orbit (for immediate/surge modes) */
    arriving: VisualShipState[];
    /** Ships remaining at attacker star (already re-indexed) */
    remaining: VisualShipState[];
}

/** A function that selects and prepares ships for conquest transfer */
export type ConquestTransferStrategy = (ctx: ConquestTransferContext) => ConquestTransferResult;

// ============================================================================
// Strategy: Immediate (legacy — pop into orbit)
// ============================================================================

function conquestImmediate(ctx: ConquestTransferContext): ConquestTransferResult {
    const { ships, conqueredStar, transferCount, newOwner, now, attackerStar } = ctx;

    // Score ships by proximity to conquered star direction
    const sorted = sortByProjection(ships, attackerStar, conqueredStar);
    const conquestShips = sorted.splice(0, transferCount);
    reindexShips(sorted);

    // Place ships directly at conquered star orbit
    const arriving: VisualShipState[] = [];
    for (let i = 0; i < conquestShips.length; i++) {
        const ship = conquestShips[i];
        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnR = conqueredStar.radius + 8;
        ship.x = conqueredStar.x + Math.cos(spawnAngle) * spawnR;
        ship.y = conqueredStar.y + Math.sin(spawnAngle) * spawnR;
        ship.state = 'orbiting';
        ship.targetIndex = i;
        ship.fromStarId = null;
        ship.toStarId = null;
        ship.ownerId = newOwner;
        ship.settleStartTime = now;
        ship.settleStartAngle = spawnAngle;
        ship.settleStartRadius = spawnR;
        arriving.push(ship);
    }

    return { departing: [], arriving, remaining: sorted };
}

// ============================================================================
// Strategy: Surge (settle from above, attacker direction)
// ============================================================================

function conquestSurge(ctx: ConquestTransferContext): ConquestTransferResult {
    const { ships, attackerStar, conqueredStar, transferCount, newOwner, now } = ctx;

    const sorted = sortByProjection(ships, attackerStar, conqueredStar);
    const conquestShips = sorted.splice(0, transferCount);
    reindexShips(sorted);

    const surgeRadius = conqueredStar.radius + (GAME_CONFIG.CONQUEST_SURGE_RADIUS ?? 40);
    const staggerMs = GAME_CONFIG.CONQUEST_SURGE_STAGGER_MS ?? 30;
    const arrivalAngle = Math.atan2(
        conqueredStar.y - attackerStar.y,
        conqueredStar.x - attackerStar.x,
    );
    const fanSpread = Math.PI * 0.6;

    const arriving: VisualShipState[] = [];
    for (let i = 0; i < conquestShips.length; i++) {
        const ship = conquestShips[i];
        const fanT = conquestShips.length > 1 ? i / (conquestShips.length - 1) - 0.5 : 0;
        const spawnAngle = arrivalAngle + fanT * fanSpread + (Math.random() - 0.5) * 0.15;

        ship.x = conqueredStar.x + Math.cos(spawnAngle) * surgeRadius;
        ship.y = conqueredStar.y + Math.sin(spawnAngle) * surgeRadius;
        ship.state = 'orbiting';
        ship.targetIndex = i;
        ship.fromStarId = null;
        ship.toStarId = null;
        ship.ownerId = newOwner;
        ship.settleStartTime = now + i * staggerMs;
        ship.settleStartAngle = spawnAngle;
        ship.settleStartRadius = surgeRadius;
        (ship as any).conquestSettle = true;
        arriving.push(ship);
    }

    return { departing: [], arriving, remaining: sorted };
}

// ============================================================================
// Strategy: Travel (fly through lane — user's 6-step approach)
// ============================================================================

function conquestTravel(ctx: ConquestTransferContext): ConquestTransferResult {
    const {
        ships, attackerStar, conqueredStar, transferCount, newOwner, now,
        effectiveTickMs, attackerStarId, conqueredStarId,
    } = ctx;

    // Step 1: All ships at attacker as array (already provided)
    // Step 2: Vector from attacker center → conquered center
    const dx = conqueredStar.x - attackerStar.x;
    const dy = conqueredStar.y - attackerStar.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const ndx = dx / dist;
    const ndy = dy / dist;

    // Step 3: Sort by projection onto vector (nearest to target first)
    sortByActualPosition(ships, attackerStar, ndx, ndy);

    // Step 4-5: Splice the conquest fleet
    const conquestShips = ships.splice(0, transferCount);
    reindexShips(ships);

    // Step 6: Animate from exact present coordinates
    // Lane convergence
    const convergence = GAME_CONFIG.LANE_CONVERGENCE ?? 1.0;
    const convergencePointFrac = (GAME_CONFIG.LANE_CONVERGENCE_POINT ?? 0) / 100;

    const baseLaneStartX = attackerStar.x + ndx * (attackerStar.radius + 5);
    const baseLaneStartY = attackerStar.y + ndy * (attackerStar.radius + 5);
    const baseLaneEndX = conqueredStar.x - ndx * (conqueredStar.radius + 5);
    const baseLaneEndY = conqueredStar.y - ndy * (conqueredStar.radius + 5);

    const convStartX = attackerStar.x + (conqueredStar.x - attackerStar.x) * convergencePointFrac;
    const convStartY = attackerStar.y + (conqueredStar.y - attackerStar.y) * convergencePointFrac;
    const effectiveLaneStartX = baseLaneStartX + (convStartX - baseLaneStartX) * convergencePointFrac;
    const effectiveLaneStartY = baseLaneStartY + (convStartY - baseLaneStartY) * convergencePointFrac;

    const halfTick = effectiveTickMs / 2;
    const departFraction = GAME_CONFIG.DEPART_FRACTION ?? 0.3;
    const departDuration = halfTick * departFraction;
    const travelDuration = halfTick * (1 - departFraction);
    const jitterMax = GAME_CONFIG.DEPART_JITTER_MS ?? 80;
    const laneOffsetPx = GAME_CONFIG.LANE_OFFSET_PX ?? 8;

    const departing: VisualShipState[] = [];
    const n = conquestShips.length;
    for (let i = 0; i < n; i++) {
        const ship = conquestShips[i];

        // Compute this ship's orbit slot at the conquered star (evenly distributed)
        const slot = getOrbitSlot(i, conqueredStar.x, conqueredStar.y,
            conqueredStar.radius, 0, undefined, 0, n);
        const slotEndX = slot.x;
        const slotEndY = slot.y;

        ship.departFromX = ship.x;
        ship.departFromY = ship.y;
        ship.state = 'departing';
        ship.fromStarId = attackerStarId;
        ship.toStarId = conqueredStarId;
        // Minimal stagger for orderly arrival (not random jitter)
        ship.departTime = now + i * Math.min(20, 300 / Math.max(1, n));
        ship.travelDuration = travelDuration;
        ship.departDuration = departDuration;

        if (convergence >= 1) {
            ship.laneStartX = effectiveLaneStartX;
            ship.laneStartY = effectiveLaneStartY;
        } else {
            ship.laneStartX = effectiveLaneStartX * convergence + ship.departFromX * (1 - convergence);
            ship.laneStartY = effectiveLaneStartY * convergence + ship.departFromY * (1 - convergence);
        }

        // Lane end = this ship's unique orbit slot at the conquered star
        ship.laneEndX = slotEndX;
        ship.laneEndY = slotEndY;

        ship.laneOffset = 0; // No random offset — slots handle distribution
        ship.staggerDelay = 0;
        ship.ownerId = newOwner;
        ship.targetIndex = i; // Pre-assign orbit index for direct landing
        (ship as any).conquestSettle = true;
        departing.push(ship);
    }

    return { departing, arriving: [], remaining: ships };
}

// ============================================================================
// Strategy: Arrowhead (wedge formation → accelerating lane → engulf → spiral settle)
// ============================================================================

function conquestArrowhead(ctx: ConquestTransferContext): ConquestTransferResult {
    const {
        ships, attackerStar, conqueredStar, transferCount, newOwner, now,
        effectiveTickMs, attackerStarId, conqueredStarId,
    } = ctx;

    // ── Sort and splice fleet ──
    const dx = conqueredStar.x - attackerStar.x;
    const dy = conqueredStar.y - attackerStar.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const ndx = dx / dist;
    const ndy = dy / dist;

    sortByActualPosition(ships, attackerStar, ndx, ndy);
    const conquestShips = ships.splice(0, transferCount);
    reindexShips(ships);

    // ── Config ──
    const taper = GAME_CONFIG.ARROW_TAPER ?? 0.7;
    const autoWidth = getOuterOrbitRadius(attackerStar.radius, conquestShips.length) * 2;
    const baseWidth = (GAME_CONFIG.ARROW_WIDTH ?? 0) > 0 ? GAME_CONFIG.ARROW_WIDTH : autoWidth;
    const speed = GAME_CONFIG.ARROW_SPEED ?? 0.6;
    const staggerMs = GAME_CONFIG.ARROW_STAGGER_MS ?? 20;
    const engulfMode = GAME_CONFIG.ARROW_ENGULF_MODE ?? 'fan';
    const engulfRadius = GAME_CONFIG.ARROW_ENGULF_RADIUS ?? 50;
    const spiralMin = GAME_CONFIG.ARROW_SPIRAL_MIN_DEG ?? 180;
    const spiralMax = GAME_CONFIG.ARROW_SPIRAL_MAX_DEG ?? 720;
    const spiralRandom = GAME_CONFIG.ARROW_SPIRAL_RANDOM ?? true;

    // ── Perpendicular axis for wedge spread ──
    const perpX = -ndy;
    const perpY = ndx;

    // ── Timing ──
    const halfTick = effectiveTickMs / 2;
    const departFraction = GAME_CONFIG.DEPART_FRACTION ?? 0.3;
    const departDuration = halfTick * departFraction;
    const travelDuration = (halfTick * (1 - departFraction)) * speed;

    // ── Lane endpoints ──
    const laneStartX = attackerStar.x + ndx * (attackerStar.radius + 5);
    const laneStartY = attackerStar.y + ndy * (attackerStar.radius + 5);
    const laneEndX = conqueredStar.x - ndx * (conqueredStar.radius + 5);
    const laneEndY = conqueredStar.y - ndy * (conqueredStar.radius + 5);

    const departing: VisualShipState[] = [];
    const n = conquestShips.length;

    for (let i = 0; i < n; i++) {
        const ship = conquestShips[i];

        // ── Wedge position assignment ──
        // Index 0 = leader (center), subsequent ships fan outward
        // fracInFormation: 0 at center, ±1 at edges
        const fracInFormation = n > 1
            ? ((i % 2 === 0 ? 1 : -1) * Math.ceil(i / 2)) / Math.ceil(n / 2)
            : 0;

        // Perpendicular offset scales with taper: 0 = column, 1 = full V
        const wedgeOffset = fracInFormation * (baseWidth / 2) * taper;
        ship.arrowWedgeOffset = wedgeOffset;

        // ── Per-ship spiral degrees ──
        if (spiralRandom) {
            ship.arrowSpiralDeg = spiralMin + Math.random() * (spiralMax - spiralMin);
        } else {
            // Orderly: evenly distribute across range
            ship.arrowSpiralDeg = n > 1
                ? spiralMin + (i / (n - 1)) * (spiralMax - spiralMin)
                : (spiralMin + spiralMax) / 2;
        }
        // Random direction (CW or CCW)
        if (Math.random() < 0.5) {
            ship.arrowSpiralDeg = -ship.arrowSpiralDeg;
        }

        // ── Lane endpoints with wedge offset ──
        // Leader converges to lane center; trailing ships have perpendicular spread
        // Depth stagger: trailing ships start slightly behind the leader
        const depthOffset = Math.abs(fracInFormation) * taper;
        ship.laneStartX = laneStartX + perpX * wedgeOffset - ndx * depthOffset * 20;
        ship.laneStartY = laneStartY + perpY * wedgeOffset - ndy * depthOffset * 20;

        // End positions depend on engulf mode
        if (engulfMode === 'fan') {
            // Fan: ships arrive surrounding the target at engulfRadius
            const arrivalAngle = Math.atan2(-ndy, -ndx) + fracInFormation * Math.PI * 0.8;
            ship.laneEndX = conqueredStar.x + Math.cos(arrivalAngle) * engulfRadius;
            ship.laneEndY = conqueredStar.y + Math.sin(arrivalAngle) * engulfRadius;
        } else {
            // Collapse: all converge to the star edge from the lane direction
            ship.laneEndX = laneEndX + perpX * wedgeOffset * 0.3; // slight spread retained
            ship.laneEndY = laneEndY + perpY * wedgeOffset * 0.3;
        }

        ship.laneOffset = wedgeOffset * 0.5; // Minor wobble around wedge position
        ship.departFromX = ship.x;
        ship.departFromY = ship.y;
        ship.state = 'departing';
        ship.fromStarId = attackerStarId;
        ship.toStarId = conqueredStarId;
        ship.departTime = now + i * staggerMs;
        ship.travelDuration = travelDuration;
        ship.departDuration = departDuration;
        ship.staggerDelay = 0;
        ship.ownerId = newOwner;
        (ship as any).conquestSettle = true;
        departing.push(ship);
    }

    return { departing, arriving: [], remaining: ships };
}

// ============================================================================
// Shared Helpers
// ============================================================================

/**
 * Sort ships by their orbit slot's projection onto the target direction vector.
 * Used by 'immediate' and 'surge' modes which rely on orbit slot scoring.
 * Sorts in-place, highest projection first (nearest to target direction).
 */
function sortByProjection(ships: VisualShipState[], source: StarRef, target: StarRef): VisualShipState[] {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const ndx = dx / dist;
    const ndy = dy / dist;

    ships.forEach((s) => {
        const slot = getOrbitSlot(
            s.targetIndex,
            source.x,
            source.y,
            source.radius,
            0,
            Math.atan2(ndy, ndx),
            GAME_CONFIG.ORBIT_BIAS_STRENGTH ?? 0.6,
        );
        const slotDx = slot.x - source.x;
        const slotDy = slot.y - source.y;
        const dot = slotDx * ndx + slotDy * ndy;
        const layerWeight = 1 + s.targetIndex / Math.max(1, ships.length);
        (s as any)._departScore = dot * layerWeight;
    });
    ships.sort((a, b) => (b as any)._departScore - (a as any)._departScore);
    return ships;
}

/**
 * Sort ships by their ACTUAL current position's projection onto the target direction.
 * Used by 'travel' mode — respects where ships visually are, not where they should be.
 * Ships nearest to the target direction come first.
 */
function sortByActualPosition(ships: VisualShipState[], source: StarRef, ndx: number, ndy: number): void {
    ships.forEach((s) => {
        const relX = s.x - source.x;
        const relY = s.y - source.y;
        (s as any)._departScore = relX * ndx + relY * ndy;
    });
    ships.sort((a, b) => (b as any)._departScore - (a as any)._departScore);
}

/**
 * Re-index ships' targetIndex after splice (sequential 0..n-1)
 */
function reindexShips(ships: VisualShipState[]): void {
    for (let i = 0; i < ships.length; i++) {
        ships[i].targetIndex = i;
    }
}

// ============================================================================
// Strategy Registry
// ============================================================================

export const CONQUEST_STRATEGIES: Record<string, ConquestTransferStrategy> = {
    'immediate': conquestImmediate,
    'surge': conquestSurge,
    'travel': conquestTravel,
    'arrowhead': conquestArrowhead,
};

/**
 * Execute the currently configured conquest transfer strategy.
 * Falls back to 'travel' if the configured mode is not found.
 */
export function executeConquestTransfer(ctx: ConquestTransferContext): ConquestTransferResult {
    const mode = GAME_CONFIG.CONQUEST_ANIMATION_MODE ?? 'travel';
    const strategy = CONQUEST_STRATEGIES[mode] ?? CONQUEST_STRATEGIES['travel'];
    return strategy(ctx);
}
