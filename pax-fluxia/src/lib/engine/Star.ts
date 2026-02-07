// ============================================================================
// Star Entity - Represents a star/planet in the game
// ============================================================================

import type { StarId, PlayerId, StarState, StarConfig, StarType } from '$lib/types/game.types';
import type { Star as IStar } from '@pax/common';
import { STAR_TYPE_STATS, applyProduction, applyRepair, DEFAULT_ENGINE_CONFIG } from '@pax/common';
import type { EngineConfig } from '@pax/common';
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
export class Star implements IStar {
    readonly id: StarId;
    readonly x: number;
    readonly y: number;
    readonly radius: number;
    readonly productionRate: number;
    readonly icon: string;
    readonly starType: string;

    // Combat V2 Properties
    readonly activationRate: number;
    readonly defensivePosture: number;
    readonly defenseStrength: number;
    readonly repairRate: number;
    readonly transferRate: number;

    // Public fields satisfying IStar interface
    activeShips: number;
    damagedShips: number;
    productionOverflow: number = 0;
    repairOverflow: number = 0;
    lastCombatTick: number = -1;
    private _ownerId: PlayerId;
    private _targetId: StarId | null;
    private _queuedOrder: { ownerId: PlayerId, targetId: StarId, persistAfterConquest: boolean } | null = null;

    // Current order's persistence flag (inverted by ctrl-click)
    private _orderPersistsAfterConquest: boolean = true;

    constructor(config: StarConfig & { id: StarId }) {
        this.id = config.id;
        this.x = config.x;
        this.y = config.y;
        this.radius = config.radius ?? 20;
        this.productionRate = config.productionRate ?? 1;
        this._ownerId = config.ownerId ?? '';
        this.starType = config.starType || 'grey';

        // Ships should be 0 by default - addActiveShips() is called separately with STARTING_SHIPS
        this.activeShips = config.activeShips ?? 0;
        this.damagedShips = config.damagedShips ?? 0;
        this._targetId = null;

        // Initialize V2 Stats from CONFIG or Defaults
        // Fallback to 'grey' if type not found (though types enforces it)
        const stats = STAR_TYPE_STATS[this.starType as StarType] || STAR_TYPE_STATS['grey'];

        this.activationRate = config.activationRate ?? stats.activationRate;
        this.defensivePosture = config.defensivePosture ?? stats.defensivePosture;
        this.defenseStrength = config.defenseStrength ?? stats.defenseStrength;
        this.repairRate = config.repairRate ?? stats.repairRate;
        this.transferRate = config.transferRate ?? stats.transferRate;

        // Random identity icon (as per PRD)
        const icons = ['�', '⭐', '☀️', '☄️', '🌎', '🪐', '🌑', '�', '�', '🌋', '�️', '�️'];
        const seed = this.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        this.icon = icons[seed % icons.length];
    }

    // ============================================================================
    // Getters
    // ============================================================================

    get ownerId(): PlayerId {
        return this._ownerId;
    }

    set ownerId(value: PlayerId) {
        this._ownerId = value;
    }

    get targetId(): StarId | null {
        return this._targetId;
    }

    set targetId(value: StarId | null | string) {
        this._targetId = (value === '' || value === null) ? null : value;
    }

    /** Total ships at this star */
    get totalShips(): number {
        return this.activeShips + this.damagedShips;
    }

    /** Is this star currently sending ships somewhere? */
    get isAttacking(): boolean {
        return this._targetId !== null;
    }

    /** Get the queued order target (for human player deferred orders) */
    get queuedOrderTargetId(): StarId | null {
        return this._queuedOrder?.targetId ?? null;
    }

    /** Set queued order target directly (used by shared conquest function) */
    set queuedOrderTargetId(value: StarId | null | string) {
        if (value === '' || value === null) {
            this._queuedOrder = null;
        }
        // Setting via string is only for clearing; use setQueuedOrder() for full setup
    }

    /**
     * Clear the attack target (stops sending ships)
     * Called when source runs out of ships or attack is cancelled
     */
    clearTarget(): void {
        this._targetId = null;
    }

    /**
     * Clear any queued order (deferred order)
     * Called to prevent bidirectional order loops
     */
    clearQueuedOrder(): void {
        this._queuedOrder = null;
    }

    // ============================================================================
    // Actions
    // ============================================================================

    /**
     * Produce new ships each tick.
     * Delegates to shared applyProduction() from @pax/common.
     */
    produce(): void {
        const cfg: EngineConfig = {
            ...DEFAULT_ENGINE_CONFIG,
            BASE_PRODUCTION: GAME_CONFIG.BASE_PRODUCTION ?? 0.5,
            REPAIR_RATE: GAME_CONFIG.REPAIR_RATE ?? 0.20,
            MIN_REPAIR: GAME_CONFIG.MIN_REPAIR ?? 1,
            REPAIR_COMBAT_PENALTY: GAME_CONFIG.REPAIR_COMBAT_PENALTY ?? 0.1,
            MIN_SHIPS_PER_TRANSFER: GAME_CONFIG.MIN_SHIPS_PER_TRANSFER ?? 1,
        };
        applyProduction(this, cfg);
    }

    /**
     * Repair damaged ships each tick.
     * Delegates to shared applyRepair() from @pax/common.
     */
    repair(currentTick: number): void {
        const cfg: EngineConfig = {
            ...DEFAULT_ENGINE_CONFIG,
            BASE_PRODUCTION: GAME_CONFIG.BASE_PRODUCTION ?? 0.5,
            REPAIR_RATE: GAME_CONFIG.REPAIR_RATE ?? 0.20,
            MIN_REPAIR: GAME_CONFIG.MIN_REPAIR ?? 1,
            REPAIR_COMBAT_PENALTY: GAME_CONFIG.REPAIR_COMBAT_PENALTY ?? 0.1,
            MIN_SHIPS_PER_TRANSFER: GAME_CONFIG.MIN_SHIPS_PER_TRANSFER ?? 1,
        };
        applyRepair(this, currentTick, cfg);
    }

    /**
     * Mark star as engaged in combat (prevents repair)
     */
    markCombat(tick: number): void {
        this.lastCombatTick = tick;
    }

    /**
     * Set attack target (creates flow link intention)
     * @param targetId - Target star ID or null to clear
     * @param persistAfterConquest - If false, order clears when star is captured
     */
    setTarget(targetId: StarId | null, persistAfterConquest: boolean = GAME_CONFIG.ORDERS_PERSIST_AFTER_CONQUEST): void {
        this._targetId = targetId;
        this._orderPersistsAfterConquest = persistAfterConquest;
    }

    /**
     * Remove active ships for attack/transfer
     * Returns the number of ships actually removed
     */
    removeActiveShips(count: number): number {
        const removed = Math.min(this.activeShips, count);
        this.activeShips -= removed;
        return removed;
    }

    /**
     * Add ships (from reinforcement or capture)
     */
    addActiveShips(count: number): void {
        this.activeShips += count;
    }

    /**
     * Add damaged ships (from combat survivors)
     */
    addDamagedShips(count: number): void {
        this.damagedShips += count;
    }

    /**
     * Clear all ships (used on conquest to reset population)
     */
    clearShips(): void {
        this.activeShips = 0;
        this.damagedShips = 0;
        this.productionOverflow = 0;
        this.repairOverflow = 0;
    }

    /**
     * Take damage
     * Logic:
     * 1. Damage hits Active Ships first -> Converts them to Damaged.
     * 2. Overflow damage hits Damaged Ships -> Destroys them.
     * 3. Returns { converted: number, destroyed: number }
     */
    takeDamage(damage: number): { converted: number, destroyed: number } {
        const converted = Math.min(this.activeShips, damage);
        this.activeShips -= converted;
        this.damagedShips += converted;
        const destroyed = 0;
        return { converted, destroyed };
    }

    /**
     * Change ownership of this star
     * Handles order persistence based on global config and per-order flags
     */
    setOwner(newOwnerId: PlayerId): void {
        const oldOwnerId = this._ownerId;
        this._ownerId = newOwnerId;

        // ALWAYS clear the conquered star's existing orders
        // These belonged to the old owner and should not transfer to new owner
        // (The attacker's order retention is handled separately in GameEngine)
        this._targetId = null;
        this._orderPersistsAfterConquest = true; // Reset to default

        // Check for queued order from the new owner (deferred orders)
        if (this._queuedOrder && this._queuedOrder.ownerId === newOwnerId) {
            this._targetId = this._queuedOrder.targetId;
            this._orderPersistsAfterConquest = this._queuedOrder.persistAfterConquest;
            this._queuedOrder = null;
        } else {
            this._queuedOrder = null; // Clear invalid queue
        }
    }

    /**
     * Set a queued order to execute upon capture
     * @param ownerId - Player who will own the star after capture
     * @param targetId - Target star for the order
     * @param persistAfterConquest - If false, order clears if star is captured again
     */
    setQueuedOrder(ownerId: PlayerId, targetId: StarId, persistAfterConquest: boolean = GAME_CONFIG.ORDERS_PERSIST_AFTER_CONQUEST): void {
        this._queuedOrder = { ownerId, targetId, persistAfterConquest };
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
            activeShips: this.activeShips,
            damagedShips: this.damagedShips,
            ownerId: this._ownerId,
            targetId: this._targetId,
            queuedOrderTargetId: this._queuedOrder?.targetId ?? null,
            icon: this.icon,
            starType: this.starType,
            productionOverflow: this.productionOverflow,
            repairOverflow: this.repairOverflow,
            lastCombatTick: this.lastCombatTick,
            // V2 Logic
            activationRate: this.activationRate,
            defensivePosture: this.defensivePosture,
            defenseStrength: this.defenseStrength,
            repairRate: this.repairRate,
            transferRate: this.transferRate
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
