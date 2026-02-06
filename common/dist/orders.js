// ============================================================================
// Pax Fluxia - Order Logic (Shared)
// ============================================================================
// === Transfer Constants ===
export const ORDER_CONFIG = {
    TRANSFER_RATE: 0.25,
    MIN_TRANSFER: 1,
};
/**
 * Validate that an order can be issued.
 * @returns null if valid, error message if invalid
 */
export function validateOrder(source, target, playerId, connections) {
    // Must own source
    if (source.ownerId !== playerId) {
        return 'You do not own this star';
    }
    // Must be connected
    const isConnected = connections.some(c => (c.sourceId === source.id && c.targetId === target.id) ||
        (c.sourceId === target.id && c.targetId === source.id));
    if (!isConnected) {
        return 'Stars are not connected';
    }
    // Cannot target self
    if (source.id === target.id) {
        return 'Cannot target same star';
    }
    return null; // Valid
}
/**
 * Calculate how many ships would be transferred this tick.
 */
export function calculateTransfer(source) {
    const { TRANSFER_RATE, MIN_TRANSFER } = ORDER_CONFIG;
    if (source.activeShips <= 0) {
        return 0;
    }
    return Math.min(source.activeShips, Math.max(MIN_TRANSFER, Math.floor(source.activeShips * TRANSFER_RATE)));
}
/**
 * Check if this order would be an attack (different owner).
 */
export function isAttackOrder(source, target) {
    return source.ownerId !== target.ownerId;
}
