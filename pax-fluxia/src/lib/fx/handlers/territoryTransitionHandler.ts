// ============================================================================
// FX Handler — Territory Transitions (V1)
// ============================================================================
// Bridges conquest events to the territory transition system.
//
// Architecture (see TERRITORY_ARCHITECTURE.md §3):
//   ConquestEvent fires
//     → FXOrchestrator.processEvents()
//     → FXRegistry.dispatchConquest(event, ctx)
//     → territoryTransitionHandler.handle(event, ctx)
//         → records pending transition (starId, previousOwner, newOwner, startTime)
//     Each frame: FXOrchestrator.update()
//     → FXRegistry.updateAll(ctx)
//     → territoryTransitionHandler.update(ctx)
//         → cleans up completed transitions
//     Presentation layer reads pendingTransitions
//         → drives PVV2RendererState flags (isBorderTransitioning, etc.)
//
// Priority 200: runs AFTER core conquest handler (100) has processed
// ship animations, color changes, and flash effects.
// ============================================================================

import type { FXContext } from '../types';
import type { ConquestEvent } from '@pax/common';
import type { FXHandler } from '../FXRegistry';
import { GAME_CONFIG } from '$lib/config/game.config';

// ── Transition State ─────────────────────────────────────────────────────────

export interface TerritoryTransitionEntry {
    /** Star that was conquered */
    starId: string;
    /** Attacker star IDs (origin positions for virtual star lerp) */
    attackerStarIds: string[];
    /** Previous territory owner */
    previousOwner: string;
    /** New territory owner */
    newOwner: string;
    /** Game time when transition started (ms) */
    startTimeMs: number;
    /** Duration of this transition (ms) */
    durationMs: number;
    /** Whether this transition has been consumed by the renderer */
    consumed: boolean;
}

/**
 * Shared state that the presentation layer reads from.
 * The handler owns this; the renderer reads it.
 */
export class TerritoryTransitionState {
    /** Active transitions keyed by starId (most recent wins) */
    private _pending = new Map<string, TerritoryTransitionEntry>();

    /** Record a new territory transition */
    add(entry: TerritoryTransitionEntry): void {
        this._pending.set(entry.starId, entry);
    }

    /** Get all unconsumed transitions */
    getUnconsumed(): TerritoryTransitionEntry[] {
        const result: TerritoryTransitionEntry[] = [];
        for (const entry of this._pending.values()) {
            if (!entry.consumed) result.push(entry);
        }
        return result;
    }

    /** Mark a transition as consumed by the renderer */
    markConsumed(starId: string): void {
        const entry = this._pending.get(starId);
        if (entry) entry.consumed = true;
    }

    /** Check if any transitions are active (including consumed but not expired) */
    get hasActiveTransitions(): boolean {
        return this._pending.size > 0;
    }

    /** Get all active transitions (consumed or not) */
    get activeCount(): number {
        return this._pending.size;
    }

    /** Remove expired transitions */
    cleanup(gameTimeMs: number): void {
        for (const [starId, entry] of this._pending) {
            if (gameTimeMs > entry.startTimeMs + entry.durationMs) {
                this._pending.delete(starId);
            }
        }
    }

    /** Reset all state */
    reset(): void {
        this._pending.clear();
    }
}

// ── Singleton State ──────────────────────────────────────────────────────────
// The presentation layer imports this to read pending transitions.
export const territoryTransitions = new TerritoryTransitionState();

// ── Handler ──────────────────────────────────────────────────────────────────

/**
 * Territory transition handler — records pending ownership transitions
 * that the presentation layer uses to drive border/fill morphing.
 *
 * Runs at priority 200, AFTER the core conquest handler (100) which
 * processes ship scatter/retreat/transfer, delayed color, and flash.
 */
export const territoryTransitionHandler: FXHandler<ConquestEvent> = {
    id: 'territory:transition',
    priority: 200,

    handle(event: ConquestEvent, ctx: FXContext): void {
        // Only record if territory overlay is enabled
        if (!GAME_CONFIG.TERRITORY_ENGINE_ENABLED) return;

        const transitionMs = GAME_CONFIG.TERRITORY_TRANSITION_MS ?? 400;
        if (transitionMs <= 0) return; // Instant transitions, no animation needed

        territoryTransitions.add({
            starId: event.starId,
            attackerStarIds: event.attackerStarIds ?? [event.attackerStarId],
            previousOwner: event.previousOwner,
            newOwner: event.newOwner,
            startTimeMs: ctx.gameTime,
            durationMs: transitionMs,
            consumed: false,
        });
    },

    update(ctx: FXContext): void {
        // Clean up expired transitions each frame
        territoryTransitions.cleanup(ctx.gameTime);
    },

    destroy(): void {
        territoryTransitions.reset();
    },
};
