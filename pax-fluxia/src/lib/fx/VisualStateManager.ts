// ============================================================================
// VisualStateManager — Safe Mutation API for FX Visual State
// ============================================================================
// Protects visualShips, travelingShips, and effect state from unsafe direct
// mutation. Handlers call VSM methods instead of splicing raw arrays.
// This enables safe multi-handler composition (FXRegistry).
// ============================================================================

import type { VisualShipState } from '$lib/utils/render.utils';

// ── Effect State Types ──────────────────────────────────────────────────────

export interface ConquestFlashState {
    startTime: number;   // Game time (from FXClock)
    duration: number;    // ms
}

export interface PendingConquestState {
    previousOwner: string;
    transitionTime: number;   // Game time when color should change
}

export type ShipSelector = 'nearside' | 'lifo' | 'fifo';

// ── Visual State Snapshot (read-only for renderer) ──────────────────────────

export interface VisualSnapshot {
    orbitShips: ReadonlyMap<string, VisualShipState[]>;
    travelingShips: readonly VisualShipState[];
    starsInCombat: ReadonlySet<string>;
    conquestFlashes: ReadonlyMap<string, ConquestFlashState>;
    pendingConquests: ReadonlyMap<string, PendingConquestState>;
}

// ── VisualStateManager ──────────────────────────────────────────────────────

export class VisualStateManager {
    private _orbitShips = new Map<string, VisualShipState[]>();
    private _travelingShips: VisualShipState[] = [];
    private _starsInCombat = new Set<string>();
    private _conquestFlashes = new Map<string, ConquestFlashState>();
    private _pendingConquests = new Map<string, PendingConquestState>();

    // ── Orbit Ship Operations ────────────────────────────────────────────

    /**
     * Get orbit ships for a star. Returns the actual array (mutable).
     * Prefer removeFromOrbit() / addToOrbit() when possible.
     */
    getOrbitShips(starId: string): VisualShipState[] {
        return this._orbitShips.get(starId) || [];
    }

    /** Set the orbit ships array for a star. */
    setOrbitShips(starId: string, ships: VisualShipState[]): void {
        this._orbitShips.set(starId, ships);
    }

    /**
     * Remove ships from a star's orbit.
     * Removes from the front of the array (after optional sorting by caller).
     * Re-indexes remaining ships' targetIndex.
     * Returns the removed ships.
     */
    removeFromOrbit(starId: string, count: number): VisualShipState[] {
        const ships = this._orbitShips.get(starId) || [];
        const actual = Math.min(count, ships.length);
        const removed = ships.splice(0, actual);

        // Re-index remaining ships
        for (let j = 0; j < ships.length; j++) {
            ships[j].targetIndex = j;
        }

        this._orbitShips.set(starId, ships);
        return removed;
    }

    /**
     * Remove ships from the end of a star's orbit (used for retreat).
     */
    removeFromOrbitEnd(starId: string, count: number): VisualShipState[] {
        const ships = this._orbitShips.get(starId) || [];
        const actual = Math.min(count, ships.length);
        const removed: VisualShipState[] = [];
        for (let i = 0; i < actual; i++) {
            removed.push(ships.pop()!);
        }
        this._orbitShips.set(starId, ships);
        return removed;
    }

    /** Add ships to a star's orbit, auto-assigning targetIndex. */
    addToOrbit(starId: string, ships: VisualShipState[]): void {
        const existing = this._orbitShips.get(starId) || [];
        for (const s of ships) {
            s.targetIndex = existing.length;
            existing.push(s);
        }
        this._orbitShips.set(starId, existing);
    }

    /** Change ownership color of all ships at a star. */
    recolorOrbit(starId: string, newOwner: string): void {
        const ships = this._orbitShips.get(starId) || [];
        for (const s of ships) {
            s.ownerId = newOwner;
        }
    }

    /** Truncate orbit ships to a max count. */
    truncateOrbit(starId: string, maxCount: number): void {
        const ships = this._orbitShips.get(starId) || [];
        if (ships.length > maxCount) {
            ships.length = maxCount;
        }
    }

    // ── Travel Pipeline ──────────────────────────────────────────────────

    /** Move ships into the traveling state. */
    sendToTravel(ships: VisualShipState[]): void {
        for (const s of ships) {
            this._travelingShips.push(s);
        }
    }

    /** Direct access to traveling ships array (for render loop interpolation). */
    get travelingShips(): VisualShipState[] {
        return this._travelingShips;
    }

    /** Remove and return arrived ships from the travel pipeline. */
    harvestArrived(): VisualShipState[] {
        const arrived: VisualShipState[] = [];
        const remaining: VisualShipState[] = [];
        for (const s of this._travelingShips) {
            if (s.state === 'arriving') {
                arrived.push(s);
            } else {
                remaining.push(s);
            }
        }
        this._travelingShips = remaining;
        return arrived;
    }

    // ── Combat State ─────────────────────────────────────────────────────

    /** Mark a star as in combat (for surge animation). */
    markCombat(starId: string): void {
        this._starsInCombat.add(starId);
    }

    /** Clear all combat markers (called at start of each tick). */
    clearCombat(): void {
        this._starsInCombat.clear();
    }

    /** Read combat state. */
    get starsInCombat(): ReadonlySet<string> {
        return this._starsInCombat;
    }

    // ── Conquest Effects ─────────────────────────────────────────────────

    /** Add a conquest flash effect on a star. */
    addConquestFlash(starId: string, flash: ConquestFlashState): void {
        this._conquestFlashes.set(starId, flash);
    }

    /** Add a pending conquest (delayed color change). */
    addPendingConquest(starId: string, state: PendingConquestState): void {
        this._pendingConquests.set(starId, state);
    }

    /** Read conquest flashes (for renderer). */
    get conquestFlashes(): ReadonlyMap<string, ConquestFlashState> {
        return this._conquestFlashes;
    }

    /** Read pending conquests (for renderer). */
    get pendingConquests(): ReadonlyMap<string, PendingConquestState> {
        return this._pendingConquests;
    }

    /** Mutable access to conquest flashes for cleanup. */
    get conquestFlashesMut(): Map<string, ConquestFlashState> {
        return this._conquestFlashes;
    }

    /** Mutable access to pending conquests for cleanup. */
    get pendingConquestsMut(): Map<string, PendingConquestState> {
        return this._pendingConquests;
    }

    // ── Full Map Access ──────────────────────────────────────────────────

    /** Direct access to orbit ships map (for batch operations). */
    get orbitShipsMap(): Map<string, VisualShipState[]> {
        return this._orbitShips;
    }

    // ── Snapshot ──────────────────────────────────────────────────────────

    /** Get a read-only snapshot of all visual state for the renderer. */
    getSnapshot(): VisualSnapshot {
        return {
            orbitShips: this._orbitShips,
            travelingShips: this._travelingShips,
            starsInCombat: this._starsInCombat,
            conquestFlashes: this._conquestFlashes,
            pendingConquests: this._pendingConquests,
        };
    }

    /** Clear all state (for new game). */
    reset(): void {
        this._orbitShips.clear();
        this._travelingShips.length = 0;
        this._starsInCombat.clear();
        this._conquestFlashes.clear();
        this._pendingConquests.clear();
    }
}
