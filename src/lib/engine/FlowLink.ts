// ============================================================================
// FlowLink - Represents a flow connection between two stars
// ============================================================================

import type { LinkId, StarId, PlayerId, FlowLinkState } from '$lib/types/game.types';

/** Flow rate as fraction of active ships per tick */
export const FLOW_RATE = 0.5;

/**
 * FlowLink class - A directional connection for ship transfer
 * 
 * Ships flow from source to target each tick.
 * The flow amount depends on available active ships at source.
 */
export class FlowLink {
    readonly id: LinkId;
    readonly sourceId: StarId;
    readonly targetId: StarId;
    readonly ownerId: PlayerId;

    private _active: boolean;

    constructor(
        sourceId: StarId,
        targetId: StarId,
        ownerId: PlayerId,
        id?: LinkId
    ) {
        this.id = id ?? `link-${sourceId}-${targetId}`;
        this.sourceId = sourceId;
        this.targetId = targetId;
        this.ownerId = ownerId;
        this._active = true;
    }

    // ============================================================================
    // Getters
    // ============================================================================

    get isActive(): boolean {
        return this._active;
    }

    // ============================================================================
    // Actions
    // ============================================================================

    /**
     * Calculate how many ships should flow this tick
     * Based on source star's active ship count
     */
    calculateFlowAmount(sourceActiveShips: number): number {
        if (!this._active) return 0;

        // Flow half of active ships (minimum 1 if any available)
        const flow = Math.floor(sourceActiveShips * FLOW_RATE);
        return Math.max(flow, sourceActiveShips > 0 ? 1 : 0);
    }

    /**
     * Deactivate this link
     */
    deactivate(): void {
        this._active = false;
    }

    /**
     * Reactivate this link
     */
    activate(): void {
        this._active = true;
    }

    /**
     * Get serializable state for UI
     */
    getState(): FlowLinkState {
        return {
            id: this.id,
            sourceId: this.sourceId,
            targetId: this.targetId,
            ownerId: this.ownerId
        };
    }
}

/**
 * Factory function to create a FlowLink
 */
export function createFlowLink(
    sourceId: StarId,
    targetId: StarId,
    ownerId: PlayerId
): FlowLink {
    return new FlowLink(sourceId, targetId, ownerId);
}
