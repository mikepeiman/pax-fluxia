// ============================================================================
// Pax Fluxia - Combat Logic (Shared between client and server)
// ============================================================================

import type { Star, CombatResult } from './types';

// === Combat Constants ===
export const COMBAT_CONFIG = {
    DAMAGE_PER_SHIP: 0.1,
    LETHALITY: 0.25,       // % of damage that kills
    DISABLED_RATIO: 0.75,  // % of damage that disables (1 - LETHALITY)
} as const;

/**
 * Calculate combat result between attacker and defender.
 * Does NOT mutate state - returns the damage to apply.
 */
export function calculateCombat(
    attackerShips: number,
    defenderShips: number
): CombatResult {
    const { DAMAGE_PER_SHIP, LETHALITY } = COMBAT_CONFIG;

    // Damage based on opposing force
    const damageToAttacker = defenderShips * DAMAGE_PER_SHIP;
    const damageToDefender = attackerShips * DAMAGE_PER_SHIP;

    return {
        attackerKills: Math.floor(damageToAttacker * LETHALITY),
        attackerDisabled: Math.floor(damageToAttacker * (1 - LETHALITY)),
        defenderKills: Math.floor(damageToDefender * LETHALITY),
        defenderDisabled: Math.floor(damageToDefender * (1 - LETHALITY)),
    };
}

/**
 * Check if attacker would win instant conquest (defender has no ships).
 */
export function isInstantConquest(defenderShips: number): boolean {
    return defenderShips <= 0;
}

/**
 * Check if star is attacked and would be conquered after combat.
 */
export function wouldBeConquered(
    defenderShips: number,
    damageReceived: number
): boolean {
    return defenderShips - damageReceived <= 0;
}
