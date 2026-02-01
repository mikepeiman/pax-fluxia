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
    readonly starType: StarType;

    // Type Configs
    static readonly TYPE_STATS: Record<StarType, { defense: number, prod: number, speed: number, repair: number, color: number }> = {
        'standard': { defense: 1.0, prod: 1.0, speed: 1.0, repair: 1.0, color: 0x8899aa }, // Grey
        'capital': { defense: 1.5, prod: 1.2, speed: 1.0, repair: 1.2, color: 0xffffff }, // White
        'forge': { defense: 0.8, prod: 2.0, speed: 1.0, repair: 0.8, color: 0xffcc00 }, // Yellow (Prod)
        'fortress': { defense: 2.5, prod: 0.5, speed: 1.0, repair: 1.5, color: 0xff4444 }, // Red (Def)
        'agro': { defense: 1.0, prod: 1.0, speed: 1.5, repair: 0.5, color: 0x44ff88 }, // Green (Atk/Speed?? User said Green=Att)
        'tech': { defense: 1.2, prod: 0.8, speed: 1.2, repair: 2.0, color: 0xaa44ff }, // Purple (Repair)
        // User map: Yellow(Prod), Green(Att), Red(Def), Blue(Mov/Relay??), Purple(Repair), Grey(None)
        // I will map 'agro' -> Green, 'relay' -> Blue.
    };

    private _activeShips: number;
    private _damagedShips: number;
    private _ownerId: PlayerId;
    private _targetId: StarId | null;
    private _lastCombatTick: number = -1;
    private _queuedOrder: { ownerId: PlayerId, targetId: StarId } | null = null;

    constructor(config: StarConfig & { id: StarId }) {
        this.id = config.id;
        this.x = config.x;
        this.y = config.y;
        this.radius = config.radius;
        this.productionRate = config.productionRate; // Base rate from map gen, modified by type?
        this._ownerId = config.ownerId;
        this.starType = config.starType || 'standard';

        this._activeShips = this.starType === 'capital' ? 25 : 10;
        this._damagedShips = 0;
        this._targetId = null;

        // Icons based on functionality? Or random?
        // User requested distinct types. Let's force icons for types.
        const typeIcons: Record<StarType, string> = {
            'standard': '🌑',
            'capital': '👑',
            'forge': '🌋',
            'fortress': '🛡️',
            'agro': '⚔️', // Green
            'tech': '🔮', // Purple
        };
        // Override with random if standard?
        if (this.starType === 'standard') {
            const icons = ['🌑', '🌕', '🪐', '🌎', '🌫️'];
            const seed = this.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
            this.icon = icons[seed % icons.length];
        } else {
            this.icon = typeIcons[this.starType] || '⭐';
        }
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
            icon: this.icon,
            starType: this.starType
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
