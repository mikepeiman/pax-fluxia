// ============================================================================
// Star Entity - Represents a star/planet in the game
// ============================================================================

import type { StarId, PlayerId, StarState, StarConfig } from '$lib/types/game.types';

/** Constants */
export const PRODUCTION_PER_TICK = 1;
export const REPAIR_RATE = 0.5; // Damaged ships repaired per tick

/**
 * Star class - A territory node that produces ships
 * 
 * Ships exist in two pools:
 * - Active (solid dots): Can attack, participate in flow
 * - Damaged (hollow rings): Repairing, cannot attack, defend at reduced rate
 */
export class Star {
    readonly id: StarId;
    readonly x: number;
    readonly y: number;
    readonly radius: number;
    readonly productionRate: number;

    private _activeShips: number;
    private _damagedShips: number;
    private _ownerId: PlayerId;
    private _targetId: StarId | null;

    constructor(config: StarConfig & { id: StarId }) {
        this.id = config.id;
        this.x = config.x;
        this.y = config.y;
        this.radius = config.radius;
        this.productionRate = config.productionRate;
        this._ownerId = config.ownerId;
        this._activeShips = 10; // Starting ships
        this._damagedShips = 0;
        this._targetId = null;
    }

    // ============================================================================
    // Getters
    // ============================================================================

    get activeShips(): number {
        return this._activeShips;
    }

    get damagedShips(): number {
        return this._damagedShips;
    }

    get ownerId(): PlayerId {
        return this._ownerId;
    }

    get targetId(): StarId | null {
        return this._targetId;
    }

    /** Total ships at this star */
    get totalShips(): number {
        return this._activeShips + this._damagedShips;
    }

    /** Is this star currently sending ships somewhere? */
    get isAttacking(): boolean {
        return this._targetId !== null;
    }

    // ============================================================================
    // Actions
    // ============================================================================

    /**
     * Produce new ships each tick
     * Only produces if star has an owner
     */
    produce(): void {
        if (this._ownerId) {
            this._activeShips += this.productionRate * PRODUCTION_PER_TICK;
        }
    }

    /**
     * Repair damaged ships each tick
     * Converts damaged ships back to active
     */
    repair(): void {
        if (this._damagedShips > 0) {
            const repaired = Math.min(this._damagedShips, REPAIR_RATE);
            this._damagedShips -= repaired;
            this._activeShips += repaired;
        }
    }

    /**
     * Set attack target (creates flow link intention)
     */
    setTarget(targetId: StarId | null): void {
        this._targetId = targetId;
    }

    /**
     * Remove active ships for attack/transfer
     * Returns the number of ships actually removed
     */
    removeActiveShips(count: number): number {
        const removed = Math.min(this._activeShips, count);
        this._activeShips -= removed;
        return removed;
    }

    /**
     * Add ships (from reinforcement or capture)
     */
    addActiveShips(count: number): void {
        this._activeShips += count;
    }

    /**
     * Add damaged ships (from combat survivors)
     */
    addDamagedShips(count: number): void {
        this._damagedShips += count;
    }

    /**
     * Take damage - converts active ships to destroyed
     * Returns the number of ships destroyed
     */
    takeDamage(damage: number): number {
        const destroyed = Math.min(this._activeShips, damage);
        this._activeShips -= destroyed;
        return destroyed;
    }

    /**
     * Change ownership of this star
     */
    setOwner(newOwnerId: PlayerId): void {
        this._ownerId = newOwnerId;
        // Clear any outgoing attack when captured
        this._targetId = null;
    }

    /**
     * Get serializable state for UI
     */
    getState(): StarState {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            radius: this.radius,
            productionRate: this.productionRate,
            activeShips: Math.floor(this._activeShips),
            damagedShips: Math.floor(this._damagedShips),
            ownerId: this._ownerId,
            targetId: this._targetId
        };
    }
}

/**
 * Factory function to create a Star with auto-generated ID
 */
export function createStar(
    config: StarConfig,
    index: number
): Star {
    return new Star({
        ...config,
        id: `star-${index}`
    });
}
