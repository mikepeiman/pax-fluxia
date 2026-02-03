// ============================================================================
// Combat Resolution - Pure functions for battle calculations
// ============================================================================
// 
// COMBAT V4: Symmetric Damage Model
// Both sides take damage from the same base formula. See game.config.ts for
// the authoritative calculateCombatV4 function.
// 
// This file provides backwards-compatible wrappers for legacy code.
// ============================================================================

import type { CombatResult, PlayerId } from '$lib/types/game.types';
import { GAME_CONFIG, calculateCombatV4 } from '$lib/config/game.config';

/**
 * Resolve combat between attackers and defenders (Legacy wrapper)
 * 
 * NOTE: This is a backwards-compatible wrapper around calculateCombatV4.
 * New code should use calculateCombatV4 directly from game.config.ts.
 * 
 * @param attackerCount - Number of attacking ships
 * @param defenderCount - Number of defending ships (active only)
 * @param attackerOwner - Player ID of attacker
 * @returns CombatResult with losses and capture status
 */
export function resolveCombat(
    attackerCount: number,
    defenderCount: number,
    attackerOwner: PlayerId
): CombatResult {
    // Use V4 symmetric formula
    const { killsOnA, disabledOnA, killsOnB, disabledOnB } = calculateCombatV4(
        defenderCount,      // Side A = Defender
        attackerCount,      // Side B = Attacker
        false,              // Defender not counter-attacking (legacy assumption)
        true                // Attacker is attacking
    );

    const actualDefenderLoss = Math.min(killsOnA + disabledOnA, defenderCount);
    const actualAttackerLoss = Math.min(killsOnB + disabledOnB, attackerCount);

    const attackerSurvivors = attackerCount - actualAttackerLoss;
    const defenderSurvivors = defenderCount - actualDefenderLoss;

    // Capture occurs when:
    // 1. All defenders eliminated AND attackers remain, OR
    // 2. Attackers outnumber defenders by CONQUEST_THRESHOLD ratio
    const conquestThreshold = GAME_CONFIG.CONQUEST_THRESHOLD;
    const captured = (
        (defenderSurvivors <= 0 && attackerSurvivors > 0) ||
        (attackerCount >= defenderCount * conquestThreshold && attackerSurvivors > 0)
    );

    return {
        attackerLoss: actualAttackerLoss,
        defenderLoss: actualDefenderLoss,
        captured,
        newOwnerId: captured ? attackerOwner : undefined
    };
}

/**
 * Calculate attrition damage for a given force size
 * Used for special damage calculations
 */
export function calculateAttrition(
    forceSize: number,
    attritionRate: number = 0.1
): number {
    return Math.floor(forceSize * attritionRate);
}

/**
 * Determine if a force can successfully assault a target
 * Requires significant numerical superiority
 */
export function canOverwhelm(
    attackerCount: number,
    defenderCount: number
): boolean {
    const threshold = GAME_CONFIG.CONQUEST_THRESHOLD;
    return attackerCount >= defenderCount * threshold;
}
