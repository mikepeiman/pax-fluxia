import type { Star, Connection, PlayerId } from './types';
export declare const ORDER_CONFIG: {
    readonly TRANSFER_RATE: 0.25;
    readonly MIN_TRANSFER: 1;
};
/**
 * Validate that an order can be issued.
 * @returns null if valid, error message if invalid
 */
export declare function validateOrder(source: Star, target: Star, playerId: PlayerId, connections: Connection[]): string | null;
/**
 * Calculate how many ships would be transferred this tick.
 */
export declare function calculateTransfer(source: Star): number;
/**
 * Check if this order would be an attack (different owner).
 */
export declare function isAttackOrder(source: Star, target: Star): boolean;
