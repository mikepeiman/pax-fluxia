// ============================================================================
// Combat Resolution - Pure functions for battle calculations
// ============================================================================

import type { CombatResult, PlayerId } from '$lib/types/game.types';
import { GAME_CONFIG } from '$lib/config/game.config';

/**
 * Resolve combat between attackers and defenders
 * 
 * Defense advantage model:
 * - Defenders deal DEFENSE_MULTIPLIER times more damage
 * - Combat takes multiple ticks (DAMAGE_RATE controls pace)
 * - Capture requires eliminating ALL defenders
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
    // Both sides deal damage based on DAMAGE_RATE
    // Defenders deal more damage due to DEFENSE_MULTIPLIER

    const rawExchange = Math.min(attackerCount, defenderCount);

    // Attacker losses (defenders hit harder)
    const attackerLoss = Math.max(
        GAME_CONFIG.MIN_DAMAGE,
        Math.floor(rawExchange * GAME_CONFIG.DAMAGE_RATE * GAME_CONFIG.DEFENSE_MULTIPLIER)
    );

    // Defender losses (attackers at base rate)
    const defenderLoss = Math.max(
        GAME_CONFIG.MIN_DAMAGE,
        Math.floor(rawExchange * GAME_CONFIG.DAMAGE_RATE)
    );

    const attackerSurvivors = attackerCount - attackerLoss;
    const defenderSurvivors = defenderCount - defenderLoss;

    // Capture occurs when all defenders are destroyed AND attackers remain
    const captured = defenderSurvivors <= 0 && attackerSurvivors > 0;

    return {
        attackerLoss: Math.min(attackerLoss, attackerCount),  // Can't lose more than you have
        defenderLoss: Math.min(defenderLoss, defenderCount),
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
    threshold: number = 2.0  // Raised from 1.5 to account for defense bonus
): boolean {
    return attackerCount >= defenderCount * threshold * GAME_CONFIG.DEFENSE_MULTIPLIER;
}
