// ============================================================================
// Pax Fluxia - Production & Repair Logic (Shared)
// ============================================================================

import type { Star } from './types';

// === Production Constants ===
export const PRODUCTION_CONFIG = {
    BASE_PRODUCTION_RATE: 1,
    BASE_REPAIR_RATE: 0.2,
    MIN_REPAIR: 1,
} as const;

/**
 * Calculate ships produced this tick for a star.
 */
export function calculateProduction(star: Star): number {
    // Only owned stars produce
    if (!star.ownerId || star.ownerId === 'neutral') {
        return 0;
    }
    return star.productionRate;
}

/**
 * Calculate ships repaired this tick for a star.
 */
export function calculateRepair(star: Star): number {
    if (star.damagedShips <= 0) {
        return 0;
    }
    const { MIN_REPAIR } = PRODUCTION_CONFIG;
    return Math.max(MIN_REPAIR, Math.floor(star.damagedShips * star.repairRate));
}
