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
    /** If defender retreated, the target star ID */
    retreatTargetId?: string;
    /** If defender scattered, the IDs ships scattered to */
    scatterTargetIds?: string[];
    /** Per-route ship counts for scatter visualization */
    scatterShipCounts?: number[];
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
 */
export function applyConquest(
    attacker: Star,
    defender: Star,
    ctx: ConquestContext,
    cfg: EngineConfig
): ConquestResult {
    const previousOwner = defender.ownerId;
    const defenderTotal = Math.floor(
        (defender.activeShips ?? 0) + (defender.damagedShips ?? 0)
    );

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
    };

    if (isRetreating && retreatTarget) {
        // Retreating: lower capture rate, rest escape to target
        captureRate = cfg.RETREAT_CAPTURE_RATE;
        const shipsCaptured = Math.floor(defenderTotal * captureRate);
        shipsEscaping = Math.floor(defenderTotal - shipsCaptured);

        // Transfer escaping ships to retreat target
        retreatTarget.activeShips = (retreatTarget.activeShips ?? 0) + shipsEscaping;

        result.retreatTargetId = retreatTarget.id;
        result.shipsEscaped = shipsEscaping;

    } else if (escapeRoutes.length > 0) {
        // Scatter: some captured, some destroyed, some escape
        captureRate = cfg.SCATTER_CAPTURE_RATE;
        const shipsCaptured = Math.floor(defenderTotal * captureRate);
        const remaining = defenderTotal - shipsCaptured;
        shipsDestroyed = Math.floor(remaining * cfg.SCATTER_DESTROY_RATE);
        shipsEscaping = Math.floor(remaining - shipsDestroyed);

        // Distribute escaping ships evenly to friendly neighbors
        if (shipsEscaping > 0) {
            const perRoute = Math.floor(shipsEscaping / escapeRoutes.length);
            let remainder = shipsEscaping % escapeRoutes.length;
            const scatterCounts: number[] = [];

            escapeRoutes.forEach(route => {
                const toAdd = perRoute + (remainder > 0 ? 1 : 0);
                remainder = Math.max(0, remainder - 1);
                route.activeShips = (route.activeShips ?? 0) + toAdd;
                scatterCounts.push(toAdd);
            });

            result.scatterTargetIds = escapeRoutes.map(r => r.id);
            result.scatterShipCounts = scatterCounts;
        }

        result.shipsEscaped = shipsEscaping;
        result.shipsDestroyed = shipsDestroyed;

    } else {
        // No escape: 100% captured
        captureRate = 1.0;
    }

    // Calculate captured ships
    const shipsCaptured = Math.floor(defenderTotal * captureRate);
    result.shipsCaptured = shipsCaptured;

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

    // Add captured ships to defender (now owned by attacker)
    defender.activeShips = shipsCaptured;

    // Transfer attacker ships to newly conquered star
    const transferPercentage = cfg.CONQUEST_TRANSFER_PERCENTAGE / 100;
    const shipsToTransfer = Math.floor((attacker.activeShips ?? 0) * transferPercentage);

    if (shipsToTransfer > 0) {
        attacker.activeShips = (attacker.activeShips ?? 0) - shipsToTransfer;
        defender.activeShips += shipsToTransfer;
    }

    // Handle queued orders
    if (defender.queuedOrderTargetId) {
        defender.targetId = defender.queuedOrderTargetId;
        defender.queuedOrderTargetId = '';
    } else {
        defender.targetId = '';
    }

    // Handle order retention
    if (!cfg.RETAIN_ORDER_ON_CONQUEST) {
        attacker.targetId = '';
    }

    return result;
}
