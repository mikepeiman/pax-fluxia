// ============================================================================
// Combat Resolution - Pure functions for battle calculations
// ============================================================================

import type { CombatResult, PlayerId } from '$lib/types/game.types';
import { GAME_CONFIG } from '$lib/config/game.config';

/**
 * Resolve combat between attackers and defenders
 * 
 * RULES:
 * 1. Larger force always wins
 * 2. Defenders have DEFENSE_MULTIPLIER advantage
 * 3. Capture occurs when attackers > defenders * CONQUEST_THRESHOLD
 *    OR when defenders reach 0
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
    const defenseMultiplier = GAME_CONFIG.DEFENSE_MULTIPLIER as number;
    const damageRate = GAME_CONFIG.DAMAGE_RATE as number;
    const minDamage = GAME_CONFIG.MIN_DAMAGE as number;
    const conquestThreshold = GAME_CONFIG.CONQUEST_THRESHOLD as number;

    // Effective defender strength (with defense bonus)
    const effectiveDefense = defenderCount * defenseMultiplier;

    // Calculate raw exchange
    const rawExchange = Math.min(attackerCount, defenderCount);

    // Attacker losses (defenders hit harder due to multiplier)
    const attackerLoss = Math.max(
        minDamage,
        Math.floor(rawExchange * damageRate * defenseMultiplier)
    );

    // Defender losses (attackers at base rate)
    const defenderLoss = Math.max(
        minDamage,
        Math.floor(rawExchange * damageRate)
    );

    // Clamp losses to not exceed counts
    const actualAttackerLoss = Math.min(attackerLoss, attackerCount);
    const actualDefenderLoss = Math.min(defenderLoss, defenderCount);

    const attackerSurvivors = attackerCount - actualAttackerLoss;
    const defenderSurvivors = defenderCount - actualDefenderLoss;

    // Capture occurs when:
    // 1. All defenders eliminated AND attackers remain, OR
    // 2. Attackers outnumber defenders by CONQUEST_THRESHOLD ratio
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
    const threshold = GAME_CONFIG.CONQUEST_THRESHOLD as number;
    return attackerCount >= defenderCount * threshold;
}
