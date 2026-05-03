// ============================================================================
// Pax Fluxia - Conquest Logic (Shared between client and server)
// ============================================================================
// Stateless conquest function — ported from client's GameEngine.executeConquest.
// Handles scatter/retreat/capture mechanics without importing any client stores.
// Returns a result object; caller is responsible for animations/logging.
// ============================================================================

import type { Star } from './types';
import type { EngineConfig } from './config';

// ============================================================================
// Types
// ============================================================================

/** Provides neighbor/star lookup — implemented differently by client vs server */
export interface ConquestContext {
    /** Return IDs of all stars connected to this star */
    getNeighborIds(starId: string): string[];
    /** Look up a star by ID */
    getStar(id: string): Star | undefined;
}

/** Outcome of a conquest event */
export interface ConquestResult {
    previousOwner: string;
    shipsCaptured: number;
    shipsEscaped: number;
    shipsDestroyed: number;
    defenderTotalAtConquest: number;
    /** Conquest type — determined at source in applyConquest() */
    conquestType: 'retreat' | 'scatter' | 'complete';
    /** If defender retreated, the target star ID */
    retreatTargetId?: string;
    /** If defender scattered, the IDs ships scattered to */
    scatterTargetIds?: string[];
    /** Per-route ship counts for scatter visualization */
    scatterShipCounts?: number[];
    /** Total number of attacker ships transferred to conquered star */
    shipsTransferred: number;
    /** Per-star transfer breakdown: { starId, shipsTransferred } */
    perStarTransfers: { starId: string; shipsTransferred: number }[];
}

// ============================================================================
// applyConquest — Stateless conquest resolution
// ============================================================================

/**
 * Execute star conquest with scatter/retreat logic.
 * 
 * Capture rates:
 * - Retreating (order to friendly): RETREAT_CAPTURE_RATE captured, rest escape
 * - Escape routes exist: SCATTER_CAPTURE_RATE captured, SCATTER_DESTROY_RATE of rest destroyed
 * - No escape: 100% captured
 * 
 * Mutates attacker and defender star objects directly.
 * Returns ConquestResult for logging/animation.
 * 
 * @param attacker Primary victor star (determines new ownership)
 * @param defender The conquered star
 * @param ctx Conquest context for neighbor lookups
 * @param cfg Engine config
 * @param allAttackers All attacking stars of the winning player (for proportional transfer)
 */
export function applyConquest(
    attacker: Star,
    defender: Star,
    ctx: ConquestContext,
    cfg: EngineConfig,
    allAttackers?: Star[]
): ConquestResult {
    const previousOwner = defender.ownerId;
    const defenderActive = Math.floor(defender.activeShips ?? 0);
    const defenderDamaged = Math.floor(defender.damagedShips ?? 0);
    const defenderTotal = defenderActive + defenderDamaged;

    // ========================================================================
    // SCATTER / RETREAT LOGIC
    // ========================================================================

    let isRetreating = false;
    let retreatTarget: Star | undefined;

    // Check if defender is retreating (has order to friendly star)
    if (defender.targetId) {
        const targetStar = ctx.getStar(defender.targetId);
        if (targetStar && targetStar.ownerId === previousOwner) {
            isRetreating = true;
            retreatTarget = targetStar;
        }
    }

    // Find escape routes (friendly neighbors via connections)
    const escapeRoutes: Star[] = [];
    if (!isRetreating) {
        const neighborIds = ctx.getNeighborIds(defender.id);
        for (const nId of neighborIds) {
            const neighbor = ctx.getStar(nId);
            if (neighbor && neighbor.ownerId === previousOwner) {
                escapeRoutes.push(neighbor);
            }
        }
    }

    // Calculate capture rate based on situation
    let captureRate: number;
    let shipsDestroyed = 0;
    let shipsEscaping = 0;
    const result: ConquestResult = {
        previousOwner,
        shipsCaptured: 0,
        shipsEscaped: 0,
        shipsDestroyed: 0,
        defenderTotalAtConquest: defenderTotal,
        conquestType: 'complete', // default, overridden below
        shipsTransferred: 0,
        perStarTransfers: [],
    };

    if (isRetreating && retreatTarget) {
        // Retreating: lower capture rate, rest escape to target
        captureRate = cfg.RETREAT_CAPTURE_RATE;
        const shipsCaptured = Math.floor(defenderTotal * captureRate);
        shipsEscaping = defenderTotal - shipsCaptured;
        result.shipsCaptured = shipsCaptured;

        // Split escaping ships by their original status (active vs damaged)
        const activeRatio = defenderTotal > 0 ? defenderActive / defenderTotal : 1;
        const escapingActive = Math.round(shipsEscaping * activeRatio);
        const escapingDamaged = shipsEscaping - escapingActive;

        // Damaged ships may activate based on config (0 = stay damaged, 1 = all activate)
        const activationRate = cfg.RETREAT_DAMAGED_ACTIVATION_RATE ?? 0;
        const damagedActivated = Math.floor(escapingDamaged * activationRate);
        const damagedStayDamaged = escapingDamaged - damagedActivated;

        retreatTarget.activeShips = (retreatTarget.activeShips ?? 0) + escapingActive + damagedActivated;
        retreatTarget.damagedShips = (retreatTarget.damagedShips ?? 0) + damagedStayDamaged;

        result.retreatTargetId = retreatTarget.id;
        result.shipsEscaped = shipsEscaping;
        result.conquestType = 'retreat';

    } else if (escapeRoutes.length > 0) {
        // Scatter: some captured, some destroyed, some escape
        captureRate = cfg.SCATTER_CAPTURE_RATE;
        // First, capture a percentage of all defender ships (active+damaged) at the moment of capture 
        // (capture = when the attacking forces exceed 24:1 power ratio)
        const shipsCaptured = Math.floor(defenderTotal * captureRate);
        // remaining ships are either destroyed or escape. How many of each is determined by SCATTER_DESTROY_RATE
        // 
        const remaining = defenderTotal - shipsCaptured;
        shipsDestroyed = Math.floor(remaining * cfg.SCATTER_DESTROY_RATE);
        shipsEscaping = remaining - shipsDestroyed;
        result.shipsCaptured = shipsCaptured;
        result.shipsDestroyed = shipsDestroyed;

        // Split escaping ships by original status (active vs damaged)
        const activeRatio = defenderTotal > 0 ? defenderActive / defenderTotal : 1;
        const activationRate = cfg.RETREAT_DAMAGED_ACTIVATION_RATE ?? 0;

        // Distribute escaping ships evenly to friendly neighbors
        if (shipsEscaping > 0) {
            const perRoute = Math.floor(shipsEscaping / escapeRoutes.length);
            let remainder = shipsEscaping % escapeRoutes.length;
            const scatterCounts: number[] = [];

            escapeRoutes.forEach(route => {
                const toAdd = perRoute + (remainder > 0 ? 1 : 0);
                remainder = Math.max(0, remainder - 1);

                // Split this route's ships into active/damaged
                const activeToAdd = Math.round(toAdd * activeRatio);
                const damagedToAdd = toAdd - activeToAdd;
                const damagedActivated = Math.floor(damagedToAdd * activationRate);
                const damagedStayDamaged = damagedToAdd - damagedActivated;

                route.activeShips = (route.activeShips ?? 0) + activeToAdd + damagedActivated;
                route.damagedShips = (route.damagedShips ?? 0) + damagedStayDamaged;
                scatterCounts.push(toAdd);
            });

            result.scatterTargetIds = escapeRoutes.map(r => r.id);
            result.scatterShipCounts = scatterCounts;
        }

        result.shipsEscaped = shipsEscaping;
        result.conquestType = 'scatter';

    } else {
        // No escape: 100% captured
        result.shipsCaptured = defenderTotal;
    }

    // ========================================================================
    // EXECUTE CONQUEST
    // ========================================================================

    // Clear defender ships
    defender.activeShips = 0;
    defender.damagedShips = 0;
    defender.productionOverflow = 0;
    defender.repairOverflow = 0;
    defender.lastCombatTick = -1;

    // Transfer ownership
    defender.ownerId = attacker.ownerId;

    // Split captured ships by their original status (active vs damaged)
    // Captured active ships become active on conquered star
    // Captured damaged ships: some captured (stay damaged), some destroyed, rest stay damaged
    const capturedTotal = result.shipsCaptured;
    const activeRatio = defenderTotal > 0 ? defenderActive / defenderTotal : 1;
    const capturedActive = Math.round(capturedTotal * activeRatio);
    const capturedDamaged = capturedTotal - capturedActive;

    // Apply conquest damaged rates
    const damagedCaptureRate = cfg.CONQUEST_DAMAGED_CAPTURE_RATE ?? 1.0;
    const damagedDestroyRate = cfg.CONQUEST_DAMAGED_DESTROY_RATE ?? 0;
    const damagedKept = Math.floor(capturedDamaged * damagedCaptureRate);
    const damagedDestroyed = Math.floor(capturedDamaged * damagedDestroyRate);
    const damagedOnStar = Math.max(0, damagedKept - damagedDestroyed);

    defender.activeShips = capturedActive;
    defender.damagedShips = damagedOnStar;

    // Transfer attacker ships to newly conquered star — proportional across all attackers
    const transferPercentage = cfg.CONQUEST_TRANSFER_PERCENTAGE / 100;
    const transferStars = allAttackers ?? [attacker];
    let totalTransferred = 0;
    const perStarTransfers: { starId: string; shipsTransferred: number }[] = [];

    for (const atkStar of transferStars) {
        const toTransfer = Math.floor((atkStar.activeShips ?? 0) * transferPercentage);
        if (toTransfer > 0) {
            atkStar.activeShips = (atkStar.activeShips ?? 0) - toTransfer;
            defender.activeShips += toTransfer;
            totalTransferred += toTransfer;
            perStarTransfers.push({ starId: atkStar.id, shipsTransferred: toTransfer });
        }
    }

    result.shipsTransferred = totalTransferred;
    result.perStarTransfers = perStarTransfers;

    // Chained orders are always preserved after conquest.
    if (defender.queuedOrderTargetId) {
        defender.targetId = defender.queuedOrderTargetId;
        defender.queuedOrderTargetId = '';
        const targetStar = ctx.getStar(defender.targetId);
        if (targetStar && targetStar.ownerId === defender.ownerId) {
            if (targetStar.targetId === defender.id) {
                targetStar.targetId = '';
            }
            if (targetStar.queuedOrderTargetId === defender.id) {
                targetStar.queuedOrderTargetId = '';
            }
        }
    } else {
        defender.targetId = '';
        defender.queuedOrderTargetId = '';
    }

    return result;
}

