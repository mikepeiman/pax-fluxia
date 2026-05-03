/**
 * metaball-grid live stats store (MG-PERF Phase A).
 *
 * This is a small Svelte side-channel between the render family and the
 * settings UI. The family writes on update; the tuning panel reads the latest
 * requested/effective spacing, cell counts, and paint-skip counters.
 */
import { writable } from 'svelte/store';

export interface MetaballGridFlipTimeBins {
    readonly '0-0.1': number;
    readonly '0.1-0.25': number;
    readonly '0.25-0.5': number;
    readonly '0.5-0.75': number;
    readonly '0.75-1': number;
}

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
    /** Requested shared frontier technique. */
    readonly frontierRequestedTechnique: string;
    /** Technique actually applied after gating/fallback. */
    readonly frontierTechnique: string;
    /** Requested control-path border geometry mode. */
    readonly frontierRequestedBorderGeometryMode: string;
    /** Effective control-path border geometry mode. */
    readonly frontierBorderGeometryMode: string;
    /** Control-path border geometry fallback reason, if any. */
    readonly frontierBorderGeometryFallbackReason: string | null;
    /** Shared surface geometry family selected for both fill and border. */
    readonly frontierSurfaceGeometryFamily: string;
    /** Stable-area surface geometry family. */
    readonly frontierStableGeometryFamily: string;
    /** Transition-area surface geometry family. */
    readonly frontierTransitionGeometryFamily: string;
    /** Invariant violation reason if steady/transition surface families diverge. */
    readonly frontierSurfaceInvariantViolation: string | null;
    /** Frontier phase sampling/filtering mode. */
    readonly frontierPhaseSampling: string;
    /** Number of scalar blur passes applied to the phase field. */
    readonly frontierBlurPasses: number;
    /** Active marching-triangle diagonal policy. */
    readonly frontierTriangleDiagonalPolicy: string;
    /** Active frontier Chaikin passes. */
    readonly frontierChaikinPasses: number;
    /** Shader frontier softness. */
    readonly frontierShaderSoftnessPx: number;
    /** Shader frontier band width. */
    readonly frontierBandWidthPx: number;
    /** Requested technique fallback reason, if any. */
    readonly frontierFallbackReason: string | null;
    /** Number of phase-field layers processed this frame. */
    readonly frontierPhaseLayerCount: number;
    /** Widest processed phase grid. */
    readonly frontierPhaseGridCols: number;
    /** Tallest processed phase grid. */
    readonly frontierPhaseGridRows: number;
    /** Scalar blur time (ms). */
    readonly frontierBlurMs: number;
    /** Contour extraction time (ms). */
    readonly frontierContourExtractionMs: number;
    /** Post-contour smoothing time (ms). */
    readonly frontierSmoothingMs: number;
    /** Contour/polyline count emitted this frame. */
    readonly frontierPolylineCount: number;
    /** Frontier vertices emitted this frame. */
    readonly frontierEmittedVertexCount: number;
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
    /** Current configured territory transition duration in GAME_CONFIG. */
    readonly configuredTransitionMs: number | null;
    /** Whether the territory transition duration is currently bound to tick. */
    readonly bindTransitionToTick: boolean;
    /** Effective gameplay tick duration that the handler/lifecycle saw most recently. */
    readonly effectiveTickMs: number | null;
    /** Most recent handler-owned TerritoryTransitionEntry duration. */
    readonly latestEntryDurationMs: number | null;
    /** Most recent handler-owned TerritoryTransitionEntry start time. */
    readonly latestEntryStartedAtMs: number | null;
    /** Latest render-family activeTransition duration reaching the family. */
    readonly activeTransitionDurationMs: number | null;
    /** Latest render-family activeTransition start time reaching the family. */
    readonly activeTransitionStartedAtMs: number | null;
    /** Raw progress computed by the render-family scheduler/lifecycle before family-local overrides. */
    readonly schedulerRawProgress: number | null;
    /** Raw visible progress used by the family before easing. */
    readonly rawProgress: number | null;
    /** Eased visible progress actually driving the family scene. */
    readonly easedProgress: number | null;
    /** Local visual-transition duration when the family is running its own catch-up clock. */
    readonly localVisualTransitionDurationMs: number | null;
    /** Whether the requested transition plan is still pending off-thread. */
    readonly requestedPlanPending: boolean;
    /** Flip-time distribution minimum. */
    readonly flipTimeMin: number | null;
    /** Flip-time distribution p25. */
    readonly flipTimeP25: number | null;
    /** Flip-time distribution p50. */
    readonly flipTimeP50: number | null;
    /** Flip-time distribution p75. */
    readonly flipTimeP75: number | null;
    /** Flip-time distribution p95. */
    readonly flipTimeP95: number | null;
    /** Flip-time distribution maximum. */
    readonly flipTimeMax: number | null;
    /** Flip-time distribution counts in stable progress bins. */
    readonly flipTimeBins: MetaballGridFlipTimeBins;
    /** First progress value at which any frontier activity should become visible. */
    readonly frontierVisibleStartProgress: number | null;
    /** Last progress value at which frontier activity should remain visible. */
    readonly frontierVisibleEndProgress: number | null;
    /** Visible frontier lifetime as a fraction of the full transition duration. */
    readonly frontierVisibleLifetimeProgress: number | null;
    /** Visible frontier lifetime in ms for the currently active duration chain. */
    readonly frontierVisibleLifetimeMs: number | null;
}

const EMPTY_FLIP_TIME_BINS: MetaballGridFlipTimeBins = {
    '0-0.1': 0,
    '0.1-0.25': 0,
    '0.25-0.5': 0,
    '0.5-0.75': 0,
    '0.75-1': 0,
};

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
    frontierRequestedTechnique: 'control',
    frontierTechnique: 'control',
    frontierRequestedBorderGeometryMode: 'shared_edge',
    frontierBorderGeometryMode: 'shared_edge',
    frontierBorderGeometryFallbackReason: null,
    frontierSurfaceGeometryFamily: 'shared_edge',
    frontierStableGeometryFamily: 'shared_edge',
    frontierTransitionGeometryFamily: 'shared_edge',
    frontierSurfaceInvariantViolation: null,
    frontierPhaseSampling: 'nearest',
    frontierBlurPasses: 0,
    frontierTriangleDiagonalPolicy: 'fixed',
    frontierChaikinPasses: 0,
    frontierShaderSoftnessPx: 0,
    frontierBandWidthPx: 0,
    frontierFallbackReason: null,
    frontierPhaseLayerCount: 0,
    frontierPhaseGridCols: 0,
    frontierPhaseGridRows: 0,
    frontierBlurMs: 0,
    frontierContourExtractionMs: 0,
    frontierSmoothingMs: 0,
    frontierPolylineCount: 0,
    frontierEmittedVertexCount: 0,
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
    configuredTransitionMs: null,
    bindTransitionToTick: false,
    effectiveTickMs: null,
    latestEntryDurationMs: null,
    latestEntryStartedAtMs: null,
    activeTransitionDurationMs: null,
    activeTransitionStartedAtMs: null,
    schedulerRawProgress: null,
    rawProgress: null,
    easedProgress: null,
    localVisualTransitionDurationMs: null,
    requestedPlanPending: false,
    flipTimeMin: null,
    flipTimeP25: null,
    flipTimeP50: null,
    flipTimeP75: null,
    flipTimeP95: null,
    flipTimeMax: null,
    flipTimeBins: EMPTY_FLIP_TIME_BINS,
    frontierVisibleStartProgress: null,
    frontierVisibleEndProgress: null,
    frontierVisibleLifetimeProgress: null,
    frontierVisibleLifetimeMs: null,
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
