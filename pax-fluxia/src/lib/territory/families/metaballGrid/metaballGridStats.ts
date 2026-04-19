/**
 * metaball-grid — live stats store (MG-PERF Phase A)
 *
 * A tiny Svelte writable used as a side-channel between the render family
 * (which runs inside the PIXI animation loop) and the settings UI (which
 * wants to show live cell-count and frame-ms readouts for in-situ tuning).
 *
 * Kept deliberately minimal: one struct, one store. The family writes each
 * update; the UI subscribes via `$metaballGridStats`. Setters are idempotent
 * (equal values short-circuit) so writing every frame is fine.
 */
import { writable } from 'svelte/store';

export interface MetaballGridStats {
    /** Requested cell spacing from config (px). */
    readonly requestedSpacingPx: number;
    /** Effective spacing actually used after `METABALL_GRID_MAX_CELLS` coarsening (px). */
    readonly effectiveSpacingPx: number;
    /** Total cells in the classification grid (cols * rows). */
    readonly totalCells: number;
    /** Emittable cells (native + dispossessed + emergent + vacating). */
    readonly emittableCells: number;
    /** Cells actually painted on the last frame (after alpha/scene culling). */
    readonly paintedCells: number;
    /** Wall-clock frame time for the last `MetaballGridFamily.update()` call (ms). */
    readonly lastUpdateMs: number;
    /** Exponential moving average of `lastUpdateMs` (ms). */
    readonly emaUpdateMs: number;
    /** True if the last update short-circuited at the dirty-flag gate (no repaint). */
    readonly lastFrameSkipped: boolean;
    /** Total frames since session start. */
    readonly frameCount: number;
    /** Skipped-paint frames since session start (should dominate steady-state). */
    readonly skippedFrameCount: number;
}

const INITIAL: MetaballGridStats = {
    requestedSpacingPx: 0,
    effectiveSpacingPx: 0,
    totalCells: 0,
    emittableCells: 0,
    paintedCells: 0,
    lastUpdateMs: 0,
    emaUpdateMs: 0,
    lastFrameSkipped: false,
    frameCount: 0,
    skippedFrameCount: 0,
};

export const metaballGridStats = writable<MetaballGridStats>(INITIAL);

/**
 * Updater helper that merges patch fields. Called from the render family
 * every update() — cheap; the store equality-shortcircuits on shallow
 * comparison when the patch doesn't actually change anything observable.
 */
export function updateMetaballGridStats(patch: Partial<MetaballGridStats>): void {
    metaballGridStats.update((prev) => ({ ...prev, ...patch }));
}

/** Reset (used at session-key change inside the family). */
export function resetMetaballGridStats(): void {
    metaballGridStats.set(INITIAL);
}
