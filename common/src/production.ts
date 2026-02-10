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
export function applyRepair(star: Star, currentTick: number, cfg: EngineConfig): void {
    if (star.damagedShips <= 0) return;

    const typeMult = STAR_TYPE_STATS[star.starType as StarType]?.repair ?? 1.0;
    let amount = Math.max(cfg.MIN_REPAIR, star.damagedShips * cfg.REPAIR_RATE * typeMult);

    // Pinning penalty: reduced repair when in combat
    const isPinned = star.lastCombatTick >= currentTick - 1;
    if (isPinned) {
        amount *= cfg.REPAIR_COMBAT_PENALTY;
    }

    star.repairOverflow += amount;
    let repaired = 0;
    if (star.repairOverflow >= 1) {
        repaired = Math.min(star.damagedShips, Math.floor(star.repairOverflow));
        star.damagedShips -= repaired;
        star.activeShips += repaired;
        star.repairOverflow -= repaired;
    }

    // Dataflow debug log (will be visible in browser console)
    if (repaired > 0 || isPinned) {
        console.log(
            `%c[REPAIR] %c${star.starType}%c star(${(star as any).id ?? '?'}) | ` +
            `dmg=${star.damagedShips + repaired}→${star.damagedShips} | ` +
            `rate=${cfg.REPAIR_RATE} × typeMult=${typeMult} = ${(cfg.REPAIR_RATE * typeMult).toFixed(3)} | ` +
            `rawAmt=${Math.max(cfg.MIN_REPAIR, (star.damagedShips + repaired) * cfg.REPAIR_RATE * typeMult).toFixed(1)} | ` +
            `${isPinned ? `PINNED(×${cfg.REPAIR_COMBAT_PENALTY})→${amount.toFixed(1)}` : `amt=${amount.toFixed(1)}`} | ` +
            `repaired=${repaired} | overflow=${star.repairOverflow.toFixed(2)}`,
            'color: #a855f7; font-weight: bold',
            `color: ${star.starType === 'purple' ? '#a855f7' : star.starType === 'yellow' ? '#fbbf24' : '#8899aa'}; font-weight: bold`,
            'color: inherit'
        );
    }
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
    return Math.max(1, Math.floor(star.damagedShips * star.repairRate));
}
