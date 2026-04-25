/**
 * metaball-grid live stats store (MG-PERF Phase A).
 *
 * This is a small Svelte side-channel between the render family and the
 * settings UI. The family writes on update; the tuning panel reads the latest
 * requested/effective spacing, cell counts, and paint-skip counters.
 */
import { writable } from 'svelte/store';

export interface MetaballGridStats {
    /** Requested cell spacing from config (px). */
    readonly requestedSpacingPx: number;
    /** Effective spacing after `METABALL_GRID_MAX_CELLS` coarsening (px). */
    readonly effectiveSpacingPx: number;
    /** Requested grid density expressed as cells per megapixel. */
    readonly requestedDensityCellsPerMpx: number;
    /** Effective grid density after coarsening, in cells per megapixel. */
    readonly effectiveDensityCellsPerMpx: number;
    /** Total cells in the classification grid (cols * rows). */
    readonly totalCells: number;
    /** Emittable cells (native + dispossessed + emergent + vacating). */
    readonly emittableCells: number;
    /** Cells actually painted on the last frame after scene culling. */
    readonly paintedCells: number;
    /** Wall-clock time for the last `update()` call (ms). */
    readonly lastUpdateMs: number;
    /** Exponential moving average of `lastUpdateMs` (ms). */
    readonly emaUpdateMs: number;
    /** True when the last frame short-circuited at the dirty-paint gate. */
    readonly lastFrameSkipped: boolean;
    /** Total rendered frames since the current session started. */
    readonly frameCount: number;
    /** Frames skipped by the dirty-paint gate since session start. */
    readonly skippedFrameCount: number;
    /** Classification build time for the last rebuilt plan (ms). */
    readonly lastClassificationBuildMs: number;
    /** Wave-plan build time for the last rebuilt plan (ms). */
    readonly lastWavePlanBuildMs: number;
    /** Combined plan-build time for the last rebuilt plan (ms). */
    readonly lastPlanBuildMs: number;
    /** Scene build time for the last update (ms). */
    readonly lastSceneBuildMs: number;
    /** Paint time for the last update (ms). */
    readonly lastPaintMs: number;
}

const INITIAL: MetaballGridStats = {
    requestedSpacingPx: 0,
    effectiveSpacingPx: 0,
    requestedDensityCellsPerMpx: 0,
    effectiveDensityCellsPerMpx: 0,
    totalCells: 0,
    emittableCells: 0,
    paintedCells: 0,
    lastUpdateMs: 0,
    emaUpdateMs: 0,
    lastFrameSkipped: false,
    frameCount: 0,
    skippedFrameCount: 0,
    lastClassificationBuildMs: 0,
    lastWavePlanBuildMs: 0,
    lastPlanBuildMs: 0,
    lastSceneBuildMs: 0,
    lastPaintMs: 0,
};

export const metaballGridStats = writable<MetaballGridStats>(INITIAL);

/** Merge patch fields from the render loop into the live stats store. */
export function updateMetaballGridStats(patch: Partial<MetaballGridStats>): void {
    metaballGridStats.update((prev) => ({ ...prev, ...patch }));
}

/** Reset stats when the owning session or render family resets. */
export function resetMetaballGridStats(): void {
    metaballGridStats.set(INITIAL);
}
