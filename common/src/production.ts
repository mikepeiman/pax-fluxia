// ============================================================================
// Pax Fluxia - Production & Repair Logic (Shared)
// ============================================================================
// Stateless functions that operate on the Star interface.
// Used by both client (SP prediction) and server (authoritative MP).
// ============================================================================

import type { Star, StarType } from './types';
import type { EngineConfig } from './config';
import { STAR_TYPE_STATS } from './config';

// ============================================================================
// Production
// ============================================================================

/**
 * Apply production to a star. Mutates star in place.
 * Fractional production accumulates in overflow; whole ships added when >= 1.
 *
 * Formula: productionRate × BASE_PRODUCTION × starType.prod
 *   - Grey:   1 × 0.5 × 1 = 0.5 → 1 ship every 2 ticks
 *   - Yellow: 1 × 0.5 × 2 = 1.0 → 1 ship every tick
 */
export function applyProduction(star: Star, cfg: EngineConfig): void {
    if (!star.ownerId || star.ownerId === 'neutral') return;

    const typeMult = STAR_TYPE_STATS[star.starType as StarType]?.prod ?? 1.0;
    star.productionOverflow += star.productionRate * cfg.BASE_PRODUCTION * typeMult;

    if (star.productionOverflow >= 1) {
        const newShips = Math.floor(star.productionOverflow);
        star.activeShips += newShips;
        star.productionOverflow -= newShips;
    }
}

// ============================================================================
// Repair
// ============================================================================

/**
 * Apply repair to a star. Mutates star in place.
 * Fractional repair accumulates in overflow; whole ships repaired when >= 1.
 *
 * Features:
 *   - Star type multiplier (Purple = 2x repair)
 *   - Pinning penalty: repair reduced when in active combat (lastCombatTick)
 *   - Integer invariant: only whole ships transition from damaged → active
 */
export function applyRepair(star: Star, currentTick: number, cfg: EngineConfig): { repaired: number; amount: number; isPinned: boolean; typeMult: number } {
    if (star.damagedShips <= 0) return { repaired: 0, amount: 0, isPinned: false, typeMult: 1 };

    const typeMult = STAR_TYPE_STATS[star.starType as StarType]?.repair ?? 1.0;
    let amount = Math.max(cfg.MIN_REPAIR, star.damagedShips * (cfg.REPAIR_RATE / 100) * typeMult);

    // Split suppression: independent penalties for attacking vs defending
    const isDefending = star.lastCombatTick >= currentTick - 1;
    const isAttacking = (star.lastAttackTick ?? -1) >= currentTick - 1;
    const isPinned = isDefending || isAttacking;

    if (isDefending) {
        amount *= cfg.REPAIR_SUPPRESS_DEFENDER ?? cfg.REPAIR_COMBAT_PENALTY;
    }
    if (isAttacking) {
        amount *= cfg.REPAIR_SUPPRESS_ATTACKER ?? cfg.REPAIR_COMBAT_PENALTY;
    }

    star.repairOverflow += amount;
    let repaired = 0;
    if (star.repairOverflow >= 1) {
        repaired = Math.min(star.damagedShips, Math.floor(star.repairOverflow));
        star.damagedShips -= repaired;
        star.activeShips += repaired;
        star.repairOverflow -= repaired;
    }

    return { repaired, amount, isPinned, typeMult };
}

// ============================================================================
// Legacy exports (kept for backward compatibility during migration)
// ============================================================================

/** @deprecated Use applyProduction instead */
export function calculateProduction(star: Star): number {
    if (!star.ownerId || star.ownerId === 'neutral') return 0;
    return star.productionRate;
}

/** @deprecated Use applyRepair instead */
export function calculateRepair(star: Star): number {
    if (star.damagedShips <= 0) return 0;
    return Math.max(1, Math.floor(star.damagedShips * (star.repairRate / 100)));
}
