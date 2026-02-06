import type { Star } from './types';
export declare const PRODUCTION_CONFIG: {
    readonly BASE_PRODUCTION_RATE: 1;
    readonly BASE_REPAIR_RATE: 0.2;
    readonly MIN_REPAIR: 1;
};
/**
 * Calculate ships produced this tick for a star.
 */
export declare function calculateProduction(star: Star): number;
/**
 * Calculate ships repaired this tick for a star.
 */
export declare function calculateRepair(star: Star): number;
