// ============================================================================
// Pax Fluxia - Combat Logic (Shared between client and server)
// ============================================================================
// 
// This module contains the authoritative combat calculation used by both
// the server (for actual game state) and client (for predictions/UI).
//
// ════════════════════════════════════════════════════════════════════════════
// DATA FLOW:
//   INPUTS:  Ship counts, isAttacking flags, star types (future)
//   PROCESS: Apply aggressor advantage, force ratio, split damage
//   OUTPUTS: Kills and disabled counts for both sides
// ════════════════════════════════════════════════════════════════════════════

import type { CombatResult, StarType } from './types';

// ============================================================================
// Combat Configuration
// ============================================================================
// All tunable combat variables in one place.
// These should be exposed in the in-game "Combat Tuning" UI panel.
// ============================================================================

export const COMBAT_CONFIG = {
    // ────────────────────────────────────────────────────────────────────────
    // BASE DAMAGE
    // Each ship deals this much damage per tick to the enemy
    // ────────────────────────────────────────────────────────────────────────
    DAMAGE_PER_SHIP: 0.075,          // Base damage per ship per tick

    // ────────────────────────────────────────────────────────────────────────
    // LETHALITY
    // Fraction of damage that permanently destroys ships.
    // Remainder goes to damagedShips pool (can be repaired).
    // ────────────────────────────────────────────────────────────────────────
    LETHALITY: 0.25,                // 25% of damage kills, 75% disables

    // ────────────────────────────────────────────────────────────────────────
    // AGGRESSOR ADVANTAGE
    // Multiplier applied to damage output when a side is actively attacking.
    // > 1.0 = attackers deal MORE damage
    // < 1.0 = attackers deal LESS damage (defenders advantage)
    // = 1.0 = symmetric (no advantage)
    // ────────────────────────────────────────────────────────────────────────
    AGGRESSOR_ADVANTAGE: 0.8333333333333334,  // Slight defender advantage

    // ────────────────────────────────────────────────────────────────────────
    // FORCE RATIO EFFECT
    // How much numerical superiority matters.
    // Uses log2(ratio) so 8:1 gives 3× the bonus of 2:1.
    // 0 = disabled, 1 = dominant effect
    // ────────────────────────────────────────────────────────────────────────
    FORCE_RATIO_EFFECT: 0,          // Disabled by default

    // ────────────────────────────────────────────────────────────────────────
    // DAMAGED SHIP EFFECTIVENESS
    // How much damaged ships contribute to defense.
    // 1.0 = full strength, 0.0 = useless, 0.14 (1/7) = original value
    // ────────────────────────────────────────────────────────────────────────
    DAMAGED_SHIP_EFFECTIVENESS: 0.5,   // 50% effectiveness

    // ────────────────────────────────────────────────────────────────────────
    // CONQUEST THRESHOLD
    // Ratio of attacker:defender ships needed for conquest.
    // Conquest occurs when defender.activeShips <= totalAttackers / threshold
    // Higher = harder to conquer, lower = easier
    // ────────────────────────────────────────────────────────────────────────
    CONQUEST_THRESHOLD: 20,          // Need 20× ships to instantly conquer

    // ────────────────────────────────────────────────────────────────────────
    // MINIMUM DAMAGE
    // Ensures at least this much damage is dealt per combat tick.
    // Prevents stalemates at low ship counts.
    // ────────────────────────────────────────────────────────────────────────
    MINIMUM_DAMAGE: 1,              // At least 1 damage per tick
} as const;

// ============================================================================
// Combat Calculation (Full Model)
// ============================================================================
// 
// ┌─────────────────────────────────────────────────────────────────────────┐
// │ FUNCTION: calculateCombat                                               │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ INPUTS:                                                                 │
// │   • sideAShips: number        Ships on side A (typically defender)      │
// │   • sideBShips: number        Ships on side B (typically attacker)      │
// │   • sideAIsAttacking: bool    Does side A have an attack order?         │
// │   • sideBIsAttacking: bool    Does side B have an attack order?         │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ PROCESS:                                                                │
// │   1. Base damage = ships × DAMAGE_PER_SHIP                              │
// │   2. Apply AGGRESSOR_ADVANTAGE if attacking                             │
// │   3. Apply FORCE_RATIO_EFFECT (log2 bonus for larger force)             │
// │   4. Ensure MINIMUM_DAMAGE                                              │
// │   5. Split by LETHALITY (kills vs disabled)                             │
// ├─────────────────────────────────────────────────────────────────────────┤
// │ OUTPUTS:                                                                │
// │   • damageToA, damageToB: Total damage to each side                     │
// │   • killsOnA, killsOnB: Ships permanently destroyed                     │
// │   • disabledOnA, disabledOnB: Ships moved to damaged pool               │
// └─────────────────────────────────────────────────────────────────────────┘

export interface CombatResultFull {
    damageToA: number;
    damageToB: number;
    killsOnA: number;
    killsOnB: number;
    disabledOnA: number;
    disabledOnB: number;
}

/** Optional overrides for combat variables (client UI panel passes these) */
export interface CombatConfigOverride {
    DAMAGE_PER_SHIP?: number;
    LETHALITY?: number;
    AGGRESSOR_ADVANTAGE?: number;
    FORCE_RATIO_EFFECT?: number;
    MINIMUM_DAMAGE?: number;
    CONQUEST_THRESHOLD?: number;
}

export function calculateCombat(
    sideAShips: number,
    sideBShips: number,
    sideAIsAttacking: boolean = false,
    sideBIsAttacking: boolean = true,
    configOverrides?: CombatConfigOverride
): CombatResultFull {
    // ────────────────────────────────────────────────────────────────────────
    // GUARD: Zero ships = no combat
    // ────────────────────────────────────────────────────────────────────────
    if (sideAShips <= 0 || sideBShips <= 0) {
        return {
            damageToA: 0,
            damageToB: 0,
            killsOnA: 0,
            killsOnB: 0,
            disabledOnA: 0,
            disabledOnB: 0
        };
    }

    // Merge overrides with defaults — allows UI panel to drive combat math
    const DAMAGE_PER_SHIP = configOverrides?.DAMAGE_PER_SHIP ?? COMBAT_CONFIG.DAMAGE_PER_SHIP;
    const AGGRESSOR_ADVANTAGE = configOverrides?.AGGRESSOR_ADVANTAGE ?? COMBAT_CONFIG.AGGRESSOR_ADVANTAGE;
    const FORCE_RATIO_EFFECT = configOverrides?.FORCE_RATIO_EFFECT ?? COMBAT_CONFIG.FORCE_RATIO_EFFECT;
    const MINIMUM_DAMAGE = configOverrides?.MINIMUM_DAMAGE ?? COMBAT_CONFIG.MINIMUM_DAMAGE;
    const LETHALITY = configOverrides?.LETHALITY ?? COMBAT_CONFIG.LETHALITY;

    // ────────────────────────────────────────────────────────────────────────
    // STEP 1: BASE DAMAGE OUTPUT
    // Each side's output = their ship count × damage per ship
    // ────────────────────────────────────────────────────────────────────────
    const baseOutputA = sideAShips * DAMAGE_PER_SHIP;
    const baseOutputB = sideBShips * DAMAGE_PER_SHIP;

    // ────────────────────────────────────────────────────────────────────────
    // STEP 2: AGGRESSOR ADVANTAGE
    // Attacking side deals MORE damage
    // Both sides attacking = both get the bonus (explosive battles)
    // ────────────────────────────────────────────────────────────────────────
    const aggressorA = sideAIsAttacking ? AGGRESSOR_ADVANTAGE : 1.0;
    const aggressorB = sideBIsAttacking ? AGGRESSOR_ADVANTAGE : 1.0;
    const outputA = baseOutputA * aggressorA;
    const outputB = baseOutputB * aggressorB;

    // ────────────────────────────────────────────────────────────────────────
    // STEP 3: FORCE RATIO MODIFIER
    // Larger force has advantage via logarithmic scaling
    // Prevents runaway advantage while still rewarding numerical superiority
    // ────────────────────────────────────────────────────────────────────────
    const ratio = Math.max(sideAShips, sideBShips) /
        Math.min(sideAShips, sideBShips);
    const forceBonus = 1 + (Math.log2(ratio) * FORCE_RATIO_EFFECT);
    const aIsLarger = sideAShips > sideBShips;
    const outputModA = aIsLarger ? forceBonus : (1 / forceBonus);
    const outputModB = aIsLarger ? (1 / forceBonus) : forceBonus;

    // ────────────────────────────────────────────────────────────────────────
    // STEP 4: FINAL DAMAGE (with minimum floor)
    // A's output damages B, B's output damages A
    // Minimum ensures progress even at low ship counts
    // ────────────────────────────────────────────────────────────────────────
    const damageToA = Math.max(MINIMUM_DAMAGE, outputB * outputModB);
    const damageToB = Math.max(MINIMUM_DAMAGE, outputA * outputModA);

    // ────────────────────────────────────────────────────────────────────────
    // STEP 5: SPLIT INTO KILLS VS DISABLED
    // Kills = permanently destroyed (removed from game)
    // Disabled = moved to damagedShips pool (can be repaired)
    // ────────────────────────────────────────────────────────────────────────
    const killsOnA = Math.floor(damageToA * LETHALITY);
    const disabledOnA = Math.floor(damageToA * (1 - LETHALITY));
    const killsOnB = Math.floor(damageToB * LETHALITY);
    const disabledOnB = Math.floor(damageToB * (1 - LETHALITY));

    return { damageToA, damageToB, killsOnA, killsOnB, disabledOnA, disabledOnB };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate effective defender force including damaged ships.
 * Damaged ships fight at reduced effectiveness.
 */
export function getEffectiveDefenderForce(
    activeShips: number,
    damagedShips: number
): number {
    return activeShips + Math.floor(damagedShips * COMBAT_CONFIG.DAMAGED_SHIP_EFFECTIVENESS);
}

/**
 * Check if defender would be conquered based on threshold.
 */
export function checkConquestThreshold(
    defenderShips: number,
    totalAttackerShips: number
): boolean {
    const threshold = totalAttackerShips / COMBAT_CONFIG.CONQUEST_THRESHOLD;
    return defenderShips <= threshold;
}

/**
 * Check if attacker would win instant conquest (defender has no ships).
 */
export function isInstantConquest(defenderShips: number): boolean {
    return defenderShips <= 0;
}
