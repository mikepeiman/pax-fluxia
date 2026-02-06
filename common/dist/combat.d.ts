export declare const COMBAT_CONFIG: {
    readonly DAMAGE_PER_SHIP: 0.1;
    readonly LETHALITY: 0.25;
    readonly AGGRESSOR_ADVANTAGE: 1.5;
    readonly FORCE_RATIO_EFFECT: 0;
    readonly DAMAGED_SHIP_EFFECTIVENESS: 0.14;
    readonly CONQUEST_THRESHOLD: 8;
    readonly MINIMUM_DAMAGE: 1;
};
export interface CombatResultFull {
    damageToA: number;
    damageToB: number;
    killsOnA: number;
    killsOnB: number;
    disabledOnA: number;
    disabledOnB: number;
}
export declare function calculateCombat(sideAShips: number, sideBShips: number, sideAIsAttacking?: boolean, sideBIsAttacking?: boolean): CombatResultFull;
/**
 * Calculate effective defender force including damaged ships.
 * Damaged ships fight at reduced effectiveness.
 */
export declare function getEffectiveDefenderForce(activeShips: number, damagedShips: number): number;
/**
 * Check if defender would be conquered based on threshold.
 */
export declare function checkConquestThreshold(defenderShips: number, totalAttackerShips: number): boolean;
/**
 * Check if attacker would win instant conquest (defender has no ships).
 */
export declare function isInstantConquest(defenderShips: number): boolean;
