// ============================================================================
// Pax Fluxia - Order Logic (Shared)
// ============================================================================
// 
// Transfer rate is sourced from EngineConfig.TRANSFER_RATE (passed via config).
// There is no separate ORDER_CONFIG — that was removed as dead code (2026-02-12).
// ============================================================================

import type { Star, Connection, PlayerId } from './types';

/**
 * Validate that an order can be issued.
 * @returns null if valid, error message if invalid
 */
export function validateOrder(
    source: Star,
    target: Star,
    playerId: PlayerId,
    connections: Connection[]
): string | null {
    // Must own source
    if (source.ownerId !== playerId) {
        return 'You do not own this star';
    }

    // Must be connected
    const isConnected = connections.some(
        c =>
            (c.sourceId === source.id && c.targetId === target.id) ||
            (c.sourceId === target.id && c.targetId === source.id)
    );
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
 * Check if this order would be an attack (different owner).
 */
export function isAttackOrder(source: Star, target: Star): boolean {
    return source.ownerId !== target.ownerId;
}

