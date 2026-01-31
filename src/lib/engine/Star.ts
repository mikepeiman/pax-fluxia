// ============================================================================
// Star Entity - Represents a star/planet in the game
// ============================================================================

import type { StarId, PlayerId, StarState, StarConfig } from '$lib/types/game.types';
import { GAME_CONFIG } from '$lib/config/game.config';

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
    readonly icon: string;

    private _activeShips: number;
    private _damagedShips: number;
    private _ownerId: PlayerId;
    private _targetId: StarId | null;
    private _lastCombatTick: number = -1; // Track when combat last occurred for generic pinning

    // Queued order to execute when this star is captured by a specific player
    private _queuedOrder: { ownerId: PlayerId, targetId: StarId } | null = null;

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

        // Random icon based on ID hash
        const icons = ['🌟', '⭐', '☀️', '☄️', '🌎', '🪐', '🌑', '🌕', '🌌', '🌋', '🏔️', '🏝️'];
        const seed = this.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
        this.icon = icons[seed % icons.length];
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
    repair(currentTick: number): void {
        if (this._damagedShips > 0) {
            let rate = REPAIR_RATE;

            // Apply Pinning Penalty
            // If combat happened this tick (or very recently), slash repair
            if (this._lastCombatTick >= currentTick - 1) {
                rate *= GAME_CONFIG.REPAIR_COMBAT_PENALTY;
            }

            const repaired = Math.min(this._damagedShips, rate);
            this._damagedShips -= repaired;
            this._activeShips += repaired;
        }
    }

    /**
     * Mark star as engaged in combat (prevents repair)
     */
    markCombat(tick: number): void {
        this._lastCombatTick = tick;
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
     * Take damage
     * Logic:
     * 1. Damage hits Active Ships first -> Converts them to Damaged.
     * 2. Overflow damage hits Damaged Ships -> Destroys them.
     * 3. Returns { converted: number, destroyed: number }
     */
    takeDamage(damage: number): { converted: number, destroyed: number } {
        // 1. Convert Active -> Damaged
        const converted = Math.min(this._activeShips, damage);
        this._activeShips -= converted;
        this._damagedShips += converted;

        let remainingDamage = damage - converted;
        let destroyed = 0;

        // 2. Destroy Damaged (Only if active are wiped out or overflow?)
        // Standard Attrition: If damage exceeds active capacity, it starts killing the wounded.
        if (remainingDamage > 0 && this._damagedShips > 0) {
            destroyed = Math.min(this._damagedShips, remainingDamage);
            this._damagedShips -= destroyed;
        }

        return { converted, destroyed };
    }

    /**
     * Change ownership of this star
     */
    setOwner(newOwnerId: PlayerId): void {
        this._ownerId = newOwnerId;
        // Clear any outgoing attack when captured
        this._targetId = null;

        // Check for queued order
        if (this._queuedOrder && this._queuedOrder.ownerId === newOwnerId) {
            this._targetId = this._queuedOrder.targetId;
            this._queuedOrder = null; // Clear queue
        } else {
            this._queuedOrder = null; // Clear invalid queue
        }
    }

    /**
     * Set a queued order to execute upon capture
     */
    setQueuedOrder(ownerId: PlayerId, targetId: StarId): void {
        this._queuedOrder = { ownerId, targetId };
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
            targetId: this._targetId,
            icon: this.icon
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
