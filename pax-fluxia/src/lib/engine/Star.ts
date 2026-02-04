// ============================================================================
// Star Entity - Represents a star/planet in the game
// ============================================================================

import type { StarId, PlayerId, StarState, StarConfig, StarType } from '$lib/types/game.types';
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
    readonly starType: StarType;

    // Combat V2 Properties
    readonly activationRate: number;
    readonly defensivePosture: number;
    readonly defenseStrength: number;
    readonly repairRate: number;
    readonly transferRate: number;

    // Type Configs - Canonical Star Type Spec
    // Each type has 2x bonus on its specialty, all other stats @ 1.0
    static readonly TYPE_STATS: Record<StarType, {
        defense: number,      // Combat defense multiplier (RED = 2x)
        prod: number,         // Production rate (YELLOW = 2x)
        speed: number,        // Movement/transfer speed (BLUE = 2x)
        repair: number,       // Repair rate (PURPLE = 2x)
        attack: number,       // Attack power (GREEN = 2x)
        color: number,
        // V2 Stats (consistent across types for now)
        activationRate: number,
        defensivePosture: number,
        defenseStrength: number,
        repairRate: number,
        transferRate: number
    }> = {
            'grey': { // BASIC - No bonuses, all stats @ 1.0
                defense: 1, prod: 1, speed: 1, repair: 1, attack: 1, color: 0x8899aa,
                activationRate: 0.5, defensivePosture: 1.0, defenseStrength: 1.0, repairRate: 0.2, transferRate: 0.1
            },
            'yellow': { // PRODUCTION - 2x production rate
                defense: 1, prod: 2, speed: 1, repair: 1, attack: 1, color: 0xfbbf24,
                activationRate: 0.5, defensivePosture: 1.0, defenseStrength: 1.0, repairRate: 0.2, transferRate: 0.1
            },
            'blue': { // MOVEMENT - 2x transfer/movement speed
                defense: 1, prod: 1, speed: 2, repair: 1, attack: 1, color: 0x3b82f6,
                activationRate: 0.5, defensivePosture: 1.0, defenseStrength: 1.0, repairRate: 0.2, transferRate: 0.2
            },
            'purple': { // REPAIR - 2x repair rate
                defense: 1, prod: 1, speed: 1, repair: 2, attack: 1, color: 0xa855f7,
                activationRate: 0.5, defensivePosture: 1.0, defenseStrength: 1.0, repairRate: 0.4, transferRate: 0.1
            },
            'red': { // DEFENSE - 2x defense strength
                defense: 2, prod: 1, speed: 1, repair: 1, attack: 1, color: 0xef4444,
                activationRate: 0.5, defensivePosture: 1.0, defenseStrength: 2.0, repairRate: 0.2, transferRate: 0.1
            },
            'green': { // ATTACK - 2x attack power
                defense: 1, prod: 1, speed: 1, repair: 1, attack: 2, color: 0x22c55e,
                activationRate: 0.5, defensivePosture: 1.0, defenseStrength: 1.0, repairRate: 0.2, transferRate: 0.1
            },
        };

    private _activeShips: number;
    private _damagedShips: number;
    private _ownerId: PlayerId;
    private _targetId: StarId | null;
    private _lastCombatTick: number = -1;
    private _queuedOrder: { ownerId: PlayerId, targetId: StarId, persistAfterConquest: boolean } | null = null;

    // Current order's persistence flag (inverted by ctrl-click)
    private _orderPersistsAfterConquest: boolean = true;

    constructor(config: StarConfig & { id: StarId }) {
        this.id = config.id;
        this.x = config.x;
        this.y = config.y;
        this.radius = config.radius;
        this.productionRate = config.productionRate;
        this._ownerId = config.ownerId;
        this.starType = config.starType || 'grey';

        this._activeShips = config.activeShips ?? (this.starType === 'grey' ? 25 : 10);
        this._damagedShips = config.damagedShips ?? 0;
        this._targetId = null;

        // Initialize V2 Stats from CONFIG or Defaults
        // Fallback to 'grey' if type not found (though types enforces it)
        const stats = Star.TYPE_STATS[this.starType] || Star.TYPE_STATS['grey'];

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

    /**
     * Clear the attack target (stops sending ships)
     * Called when source runs out of ships or attack is cancelled
     */
    clearTarget(): void {
        this._targetId = null;
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
            const baseRate = GAME_CONFIG.BASE_PRODUCTION ?? 0.5;
            const typeMult = Star.TYPE_STATS[this.starType]?.prod ?? 1.0;
            this._activeShips += this.productionRate * baseRate * typeMult;
        }
    }

    repair(currentTick: number): void {
        if (this._damagedShips > 0) {
            const configRate = GAME_CONFIG.REPAIR_RATE ?? 0.20;
            const minRepair = GAME_CONFIG.MIN_REPAIR ?? 1;
            const typeMult = Star.TYPE_STATS[this.starType]?.repair ?? 1.0;

            let amount = Math.max(minRepair, this._damagedShips * configRate * typeMult);

            // Apply Pinning Penalty
            if (this._lastCombatTick >= currentTick - 1) {
                amount *= GAME_CONFIG.REPAIR_COMBAT_PENALTY;
            }

            const repaired = Math.min(this._damagedShips, amount);
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
     * Clear all ships (used on conquest to reset population)
     */
    clearShips(): void {
        this._activeShips = 0;
        this._damagedShips = 0;
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
        // User Request: Damaged ships are NEVER destroyed in combat.
        // They are safe until the star is conquered.

        const converted = Math.min(this._activeShips, damage);
        this._activeShips -= converted;
        this._damagedShips += converted;

        // No rollover damage to damaged ships. 
        // Any excess damage is effectively wasted/absorbed by the "shield" of combat chaos?
        // Or simply ignored as they are already out of the fight.
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

        // Handle current order based on persistence setting
        if (this._targetId !== null) {
            // If order should persist AND new owner is same as old, keep it
            // (This handles the case where orders persist through conquest)
            if (!this._orderPersistsAfterConquest) {
                // Ctrl-click order: always clear on conquest
                this._targetId = null;
            }
            // Otherwise, keep the order (it will be used by new owner)
        }

        // Check for queued order from the new owner
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
            activeShips: Math.floor(this._activeShips),
            damagedShips: Math.floor(this._damagedShips),
            ownerId: this._ownerId,
            targetId: this._targetId,
            queuedOrderTargetId: this._queuedOrder?.targetId ?? null,
            icon: this.icon,
            starType: this.starType,
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
