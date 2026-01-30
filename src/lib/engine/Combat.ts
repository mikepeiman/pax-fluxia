// ============================================================================
// Combat Resolution - Pure functions for battle calculations
// ============================================================================

import type { CombatResult, PlayerId } from '$lib/types/game.types';

/**
 * Combat exchange ratio
 * 1:1 means both sides lose equal ships
 */
export const COMBAT_RATIO = 1;

/**
 * Resolve combat between attackers and defenders
 * 
 * Uses simultaneous 1:1 exchange:
 * - Both sides take losses equal to the smaller force
 * - If attackers > defenders, attackers win and capture
 * - If defenders >= attackers, defenders win
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
    // Both sides take losses equal to the smaller force
    const losses = Math.min(attackerCount, defenderCount) * COMBAT_RATIO;

    const attackerSurvivors = attackerCount - losses;
    const defenderSurvivors = defenderCount - losses;

    // Capture occurs when all defenders are destroyed AND attackers remain
    const captured = defenderSurvivors <= 0 && attackerSurvivors > 0;

    return {
        attackerLoss: Math.floor(losses),
        defenderLoss: Math.floor(losses),
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
    defenderCount: number,
    threshold: number = 1.5
): boolean {
    return attackerCount >= defenderCount * threshold;
}
