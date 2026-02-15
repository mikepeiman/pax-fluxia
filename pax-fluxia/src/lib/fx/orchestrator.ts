// ============================================================================
// FX Orchestrator — Central VFX Coordinator
// ============================================================================
// Replaces inline processTickEvents in GameCanvas. Wires together:
// - FXClock (pausable game time)
// - VisualStateManager (safe mutation API)
// - FXRegistry (handler dispatch)
// ============================================================================

import { FXClock } from './clock';
import { VisualStateManager } from './VisualStateManager';
import type { VisualSnapshot } from './VisualStateManager';
import { FXRegistry } from './FXRegistry';
import { registerDefaults } from './registry/defaults';
import type { FXContext } from './types';
import type { StarState } from '$lib/types/game.types';
import type { TickEvents } from '@pax/common';

export class FXOrchestrator {
    readonly clock: FXClock;
    readonly vsm: VisualStateManager;
    readonly registry: FXRegistry;

    constructor() {
        this.clock = new FXClock();
        this.vsm = new VisualStateManager();
        this.registry = new FXRegistry();
        registerDefaults(this.registry);
    }

    /**
     * Process tick events through all registered handlers.
     * Called once per tick when new events arrive from the engine.
     */
    processEvents(
        events: TickEvents | null,
        starsById: Map<string, StarState>,
        effectiveTickMs: number,
    ): void {
        if (!events) return;

        // Clear per-tick transient state
        this.vsm.clearCombat();

        const ctx = this.buildContext(starsById, effectiveTickMs);

        // Dispatch events to handlers in priority order
        for (const e of events.transfers) {
            this.registry.dispatchTransfer(e, ctx);
        }
        for (const e of events.combats) {
            this.registry.dispatchCombat(e, ctx);
        }
        for (const e of events.conquests) {
            this.registry.dispatchConquest(e, ctx);
        }
    }

    /**
     * Per-frame update. Advances clock, runs continuous FX handlers.
     * Call from the render loop with the raw performance.now() value.
     */
    update(
        wallNow: number,
        starsById: Map<string, StarState>,
        effectiveTickMs: number,
    ): void {
        this.clock.tick(wallNow);
        const ctx = this.buildContext(starsById, effectiveTickMs);
        this.registry.updateAll(ctx);
    }

    /** Get read-only visual state snapshot for the renderer. */
    getVisualState(): VisualSnapshot {
        return this.vsm.getSnapshot();
    }

    /** Pause the FX clock (animations freeze). */
    pause(): void {
        this.clock.pause();
    }

    /** Resume the FX clock. */
    resume(): void {
        this.clock.resume();
    }

    /** Set game speed multiplier. */
    setSpeed(mult: number): void {
        this.clock.setSpeed(mult);
    }

    /** Reset all state for a new game. */
    reset(): void {
        this.clock.reset();
        this.vsm.reset();
    }

    /** Destroy registry (cleanup handlers). */
    destroy(): void {
        this.registry.destroy();
        this.vsm.reset();
    }

    /** Current game time from FXClock. */
    get gameTime(): number {
        return this.clock.now;
    }

    // ── Internal ─────────────────────────────────────────────────────────

    private buildContext(
        starsById: Map<string, StarState>,
        effectiveTickMs: number,
    ): FXContext {
        return {
            gameTime: this.clock.now,
            dt: this.clock.dt,
            starsById,
            vsm: this.vsm,
            effectiveTickMs,
        };
    }
}
