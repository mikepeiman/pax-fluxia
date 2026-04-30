/**
 * metaball-grid live stats store (MG-PERF Phase A).
 *
 * This is a small Svelte side-channel between the render family and the
 * settings UI. The family writes on update; the tuning panel reads the latest
 * requested/effective spacing, cell counts, and paint-skip counters.
 */
import { writable } from 'svelte/store';

export interface MetaballGridStats {
    /** Active family variant id (`metaball_grid` vs `metaball_grid_phase_edges`). */
    readonly familyId: string;
    /** Human label for the active family variant. */
    readonly familyLabel: string;
    /** Effective upstream geometry source feeding the family. */
    readonly geometrySource: string | null;
    /** Effective wave-propagation geometry. */
    readonly waveGeometry: string;
    /** Effective frontier seeding strategy. */
    readonly waveSeeding: string;
    /** Effective border rendering strategy. */
    readonly borderMode: string;
    /** Whether centered-blended territory-edge borders are active. */
    readonly borderBlend: boolean;
    /** Effective shared-edge smoothing passes. */
    readonly edgeSmoothingPasses: number;
    /** Effective shared-edge trim distance in pixels. */
    readonly edgeTrimPx: number;
    /** Effective territory-edge Chaikin passes. */
    readonly borderChaikinPasses: number;
    /** Effective DX disconnect toggle in the upstream geometry path. */
    readonly disconnectEnabled: boolean;
    /** Effective DX disconnect distance in pixels. */
    readonly disconnectDistance: number;
    /** Effective DX weight in the upstream geometry path. */
    readonly dxWeight: number;
    /** Active conquest events driving this family update. */
    readonly transitionEventCount: number;
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
    /** True when a new transition plan is still building off-thread. */
    readonly planWorkerPending: boolean;
    /** True when the family is intentionally holding the PRE frame for a pending plan. */
    readonly holdingForPlan: boolean;
    /** True when the visible transition is driven by the family's local clock. */
    readonly visualTransitionActive: boolean;
    /** Human-meaningful state of the currently visible metaball-grid frame. */
    readonly visibleFrameState:
        | 'steady'
        | 'holding_pre'
        | 'requested_plan'
        | 'fallback_plan';
    /** Which timeline currently drives visible transition progress. */
    readonly clockSource: 'none' | 'scheduler' | 'local';
    /** Whether the family is rendering live vector graphics or a cached steady-state texture. */
    readonly renderCacheMode: 'live_vectors' | 'steady_texture';
    /** Transition cells currently inside the active blend window. */
    readonly activeWindowCount: number;
    /** Total non-native transition cells in the ordered frontier. */
    readonly transitionTotalCount: number;
    /** Cells entering the active frontier on the last update. */
    readonly promotedToActiveCount: number;
    /** Cells leaving the active frontier on the last update. */
    readonly demotedToSettledCount: number;
    /** Transition sprite writes performed on the last update. */
    readonly transitionSpriteWrites: number;
    /** True when the retained active-frontier fast path handled the last update. */
    readonly fastPathUsed: boolean;
    /** If the retained fast path was not used, records the first blocking reason. */
    readonly fallbackReason: string | null;
}

const INITIAL: MetaballGridStats = {
    familyId: 'metaball_grid',
    familyLabel: 'Metaball Grid',
    geometrySource: null,
    waveGeometry: 'grid_bfs',
    waveSeeding: 'winner_natives',
    borderMode: 'off',
    borderBlend: false,
    edgeSmoothingPasses: 0,
    edgeTrimPx: 0,
    borderChaikinPasses: 0,
    disconnectEnabled: false,
    disconnectDistance: 0,
    dxWeight: 0,
    transitionEventCount: 0,
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
    planWorkerPending: false,
    holdingForPlan: false,
    visualTransitionActive: false,
    visibleFrameState: 'steady',
    clockSource: 'none',
    renderCacheMode: 'live_vectors',
    activeWindowCount: 0,
    transitionTotalCount: 0,
    promotedToActiveCount: 0,
    demotedToSettledCount: 0,
    transitionSpriteWrites: 0,
    fastPathUsed: false,
    fallbackReason: null,
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
