/**
 * metaball-grid — RenderFamily adapter (MG5, MG-PERF v3)
 *
 * Wires the pure functions (classification → wave plan → scene) into the live
 * render loop and paints the per-frame `GridRenderCell[]` as direct PIXI
 * rectangles. We intentionally BYPASS the shared `renderMetaball` compositor:
 *
 * - That compositor is O(samples × internal_grid_cells) with a per-pair
 *   gaussian falloff. For a mode whose scene is already N discrete filled
 *   cells (one per grid vstar), the compositor does redundant work and
 *   dominates frame time (profile: ~80% self time at >3k samples).
 * - Direct rect rendering is O(N) and produces flat quads, which also removes
 *   the "star-bubbles" visual artifact (localized gaussian bulges around each
 *   sample point).
 *
 * Truth source:
 * - `NEXT` geometry = `input.geometry` (the current live `ResolvedGeometrySnapshot`).
 * - `PREV` geometry = rebuilt on transition start from reverted stars using the
 *   same Power-Voronoi 0319 underlayer. This mirrors the approach taken by
 *   `PerimeterFieldFamily`; it is a known-simplification of the upstream-
 *   capture ideal described in the 2026-04-16 revised perimeter_field plan.
 *   For metaball-grid the simplification is defensible because the grid layer
 *   is a pure function of `(prev, next)` geometry and our generator is
 *   deterministic — but a future MG checkpoint can move truth capture
 *   upstream into `GameCanvas` if parity demands it.
 */

import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import {
    applyTerritoryFrontierFxFieldToFill,
    buildTerritoryFrontierFxSampleField,
    buildOwnershipGridFrontierDistanceField,
    createOwnershipGridFrontierDistanceFieldBuffers,
    computeVisibleSquareBoundsFromDistance,
    isTerritoryFrontierFxActive,
    TERRITORY_FRONTIER_FX_TUNABLE_KEYS,
    type OwnershipGridFrontierDistanceFieldBuffers,
    type TerritoryFrontierFxSampleField,
} from '$lib/territory/frontier';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarState } from '$lib/types/game.types';
import { adjustColorHSL, blendColors } from '$lib/utils/colorUtils';
import { getTerritoryVisualEpoch } from '$lib/territory/bumpTerritoryVisualConfig';
import type { ResolvedGeometrySnapshot } from '../../contracts/GeometryContracts';
import { buildPerimeterFieldRenderFamilyGeometry } from '../buildFamilyGeometry';
import type {
    RenderFamily,
    RenderFamilyInput,
    RenderFamilyOutput,
} from '../RenderFamilyTypes';
import { buildGridClassification } from './buildGridClassification';
import type {
    GridAdjacency,
    GridClassification,
    GridDistribution,
    GridFlipTransition,
    GridMetaballScene,
    GridOriginMode,
    GridOwnedStar,
    GridWaveGeometry,
    GridWavePlan,
    GridWaveSeeding,
} from './metaballGridTypes';
import {
    buildMetaballGridPlanKey,
    resolveMetaballGridDisplayProgress,
    summarizeMetaballGridFrontier,
} from './metaballGridRuntime';
import type { MetaballGridVisualTransitionTiming } from './metaballGridRuntime';
import type {
    MetaballGridPlanWorkerRequest,
    MetaballGridPlanWorkerResponse,
} from './metaballGridPlanWorkerTypes';
import { planGridWave } from './planGridWave';
import { renderMetaballGridScene } from './renderMetaballGridScene';
import {
    computeBoundaryOffsetTargetPx,
    computeBoundaryInset,
    computeSharedBoundaryCornerRadius,
    isOwnershipBoundaryCell,
    trimOpenPolylineEndpoints,
} from './edgeShaping';
import {
    resetMetaballGridStats,
    updateMetaballGridStats,
} from './metaballGridStats';
import {
    computeDualPassBlendAlphas,
    findActiveFrontierRange,
} from './metaballGridActiveFrontier';
import { metaballGridPhaseEdgesModeDefaults } from './config';

// ─── Tunable option unions (mirror METABALL_GRID_* keys) ──────────────────────

type GridCellShape = 'square' | 'circle' | 'diamond' | 'hex';
type GridBorderMode = 'off' | 'per_cell' | 'territory_edge';

interface VisibleSquareCellBounds {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
}

const SQRT3 = Math.sqrt(3);

/**
 * Pointy-top hex vertex offsets (× radius).
 *
 * Used by the cell-shape painter. Every other row is shifted horizontally
 * by half-spacing so the hexes honey-comb instead of stacking into vertical
 * columns — this is the "geometrically-repeating" layout the user asked for.
 *
 * Note: with a square classification grid, a pure pointy-top tessellation
 * cannot be perfect in both axes — horizontal pitch = spacingPx dictates
 * `r = spacingPx / sqrt(3)`, which leaves a ~13% vertical gap between rows
 * (ideal vertical pitch would be 1.5r = 0.866·spacingPx). That gap reads
 * as thin honeycomb grid lines and is intentional.
 */
const HEX_VERTICES_POINTY: ReadonlyArray<readonly [number, number]> = (() => {
    const out: Array<[number, number]> = [];
    // Clockwise from top vertex (y-down screen coords):
    // angle 0 → (0,-1), 60 → (.866,-.5), 120 → (.866,.5), 180 → (0,1), 240 → (-.866,.5), 300 → (-.866,-.5)
    for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        out.push([Math.sin(a), -Math.cos(a)]);
    }
    return out;
})();

/**
 * One Chaikin corner-cutting pass. Replaces each interior vertex with
 * a pair of points at 1/4 and 3/4 along the segments meeting there.
 * For `closed`, treats the points as a loop (wraps around).
 *
 * Input/output format: flat `[x0, y0, x1, y1, ...]`.
 */
function chaikinOnce(pts: number[], closed: boolean): number[] {
    const n = pts.length >> 1;
    if (n < 3) return pts.slice();
    const out: number[] = [];
    const last = closed ? n : n - 1;
    if (!closed) out.push(pts[0], pts[1]);
    for (let i = 0; i < last; i++) {
        const i0 = i * 2;
        const i1 = ((i + 1) % n) * 2;
        const x0 = pts[i0], y0 = pts[i0 + 1];
        const x1 = pts[i1], y1 = pts[i1 + 1];
        out.push(
            x0 + 0.25 * (x1 - x0),
            y0 + 0.25 * (y1 - y0),
            x0 + 0.75 * (x1 - x0),
            y0 + 0.75 * (y1 - y0),
        );
    }
    if (!closed) out.push(pts[pts.length - 2], pts[pts.length - 1]);
    return out;
}

/** Run multiple Chaikin passes. */
function chaikinSmooth(pts: number[], passes: number, closed: boolean): number[] {
    let p = pts;
    for (let i = 0; i < passes; i++) p = chaikinOnce(p, closed);
    return p;
}
type GridWaveEase =
    | 'linear'
    | 'ease_in'
    | 'ease_out'
    | 'ease_in_out'
    | 'back_out'
    | 'elastic_out';

// ─── Easing functions ─────────────────────────────────────────────────────────

function easeProgress(ease: GridWaveEase, t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    switch (ease) {
        case 'linear':
            return t;
        case 'ease_in':
            return t * t;
        case 'ease_out':
            return 1 - (1 - t) * (1 - t);
        case 'ease_in_out':
            return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) * (-2 * t + 2) / 2;
        case 'back_out': {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        }
        case 'elastic_out': {
            const c4 = (2 * Math.PI) / 3;
            return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        }
    }
}

// ─── Stable hash → [0,1) for per-cell jitter ─────────────────────────────────

function hash01(id: string): number {
    // FNV-1a 32-bit
    let h = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) {
        h ^= id.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    // Map to [0, 1)
    return ((h >>> 0) % 100000) / 100000;
}

const METABALL_GRID_TUNABLE_KEYS = [
    'METABALL_GRID_ENABLED',
    'METABALL_GRID_SPACING_PX',
    'METABALL_GRID_ORIGIN_MODE',
    'METABALL_GRID_ADJACENCY',
    'METABALL_GRID_WAVE_GEOMETRY',
    'METABALL_GRID_WAVE_SEEDING',
    'METABALL_GRID_FLIP_TRANSITION',
    'METABALL_GRID_FLIP_WINDOW',
    'METABALL_GRID_INWARD_OFFSET_PX',
    'METABALL_GRID_BOUNDARY_FILL_FLUSH',
    'METABALL_GRID_CELL_SHAPE',
    'METABALL_GRID_CELL_INSET_PX',
    'METABALL_GRID_CELL_CORNER_PX',
    'METABALL_GRID_BORDER_MODE',
    'METABALL_GRID_BORDER_BLEND',
    'METABALL_GRID_EDGE_SMOOTHING_PASSES',
    'METABALL_GRID_EDGE_TRIM_PX',
    'METABALL_GRID_BORDER_CHAIKIN_PASSES',
    'METABALL_GRID_WAVE_EASE',
    'METABALL_GRID_FLIP_WINDOW_JITTER',
    'METABALL_GRID_DISTRIBUTION',
    'METABALL_GRID_POSITION_JITTER',
    'METABALL_GRID_MAX_CELLS',
    // Shared HSLA knobs (reused from metaball family) — fill + border colour energy.
    'METABALL_SATURATION',
    'METABALL_LIGHTNESS',
    'METABALL_ALPHA',
    'METABALL_BORDER_WIDTH',
    'METABALL_BORDER_ALPHA',
    'METABALL_BORDER_SATURATION',
    'METABALL_BORDER_LIGHTNESS',
    'PERIMETER_FIELD_GEOMETRY_SOURCE', // reused for underlayer selection
    ...TERRITORY_FRONTIER_FX_TUNABLE_KEYS,
] as const;

interface MetaballGridFamilyVariant {
    readonly id: string;
    readonly label: string;
    readonly defaultWaveGeometry: GridWaveGeometry;
    readonly defaultBorderMode: GridBorderMode;
    readonly defaultBorderBlend: boolean;
    readonly defaultBoundaryFillFlush: boolean;
    readonly defaultEdgeSmoothingPasses: number;
    readonly defaultEdgeTrimPx: number;
    readonly defaultBorderChaikinPasses: number;
}

const DEFAULT_METABALL_GRID_VARIANT: MetaballGridFamilyVariant = {
    id: 'metaball_grid',
    label: 'Metaball Grid',
    defaultWaveGeometry: 'grid_bfs',
    defaultBorderMode: 'off',
    defaultBorderBlend: false,
    defaultBoundaryFillFlush: false,
    defaultEdgeSmoothingPasses: 0,
    defaultEdgeTrimPx: 0,
    defaultBorderChaikinPasses: 0,
};

const PHASE_EDGE_METABALL_GRID_VARIANT: MetaballGridFamilyVariant = {
    id: 'metaball_grid_phase_edges',
    label: 'Phase Edges',
    defaultWaveGeometry:
        metaballGridPhaseEdgesModeDefaults.METABALL_GRID_WAVE_GEOMETRY,
    defaultBorderMode:
        metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BORDER_MODE,
    defaultBorderBlend:
        metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BORDER_BLEND,
    defaultBoundaryFillFlush:
        metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BOUNDARY_FILL_FLUSH,
    defaultEdgeSmoothingPasses:
        metaballGridPhaseEdgesModeDefaults.METABALL_GRID_EDGE_SMOOTHING_PASSES,
    defaultEdgeTrimPx:
        metaballGridPhaseEdgesModeDefaults.METABALL_GRID_EDGE_TRIM_PX,
    defaultBorderChaikinPasses:
        metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BORDER_CHAIKIN_PASSES,
};

function readTunableNumber(input: RenderFamilyInput, key: string, fallback: number): number {
    const v = input.tunables.get(key);
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function readTunableString<T extends string>(
    input: RenderFamilyInput,
    key: string,
    fallback: T,
    allowed: readonly T[],
): T {
    const v = input.tunables.get(key);
    if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) {
        return v as T;
    }
    return fallback;
}

function readTunableBoolean(input: RenderFamilyInput, key: string, fallback: boolean): boolean {
    const v = input.tunables.get(key);
    return typeof v === 'boolean' ? v : fallback;
}

function readConfigSourceBoolean(
    configSource: Readonly<Record<string, unknown>> | undefined,
    key: string,
    fallback: boolean,
): boolean {
    const value = configSource?.[key];
    return typeof value === 'boolean' ? value : fallback;
}

function readConfigSourceNumber(
    configSource: Readonly<Record<string, unknown>> | undefined,
    key: string,
    fallback: number,
): number {
    const value = configSource?.[key];
    return typeof value === 'number' && Number.isFinite(value)
        ? value
        : fallback;
}

function spacingToDensityCellsPerMpx(spacingPx: number): number {
    if (!Number.isFinite(spacingPx) || spacingPx <= 0) return 0;
    return 1_000_000 / (spacingPx * spacingPx);
}

function shouldCaptureMetaballGridDebug(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
        (window as unknown as Record<string, unknown>).__PAX_BENCH__
            || (window as unknown as Record<string, unknown>)
                .__PAX_CAPTURE_METABALL_GRID_DEBUG__,
    );
}

/** Reverted star set: star ownership reset to each event's `previousOwner`. */
function revertStarsForTransition(input: RenderFamilyInput): StarState[] {
    const overrides = new Map<string, string>();
    for (const entry of input.activeTransition?.events ?? []) {
        overrides.set(entry.event.starId, entry.event.previousOwner);
    }
    return input.stars.map((star) => {
        const ownerId = overrides.get(star.id);
        return ownerId === undefined ? { ...star } : { ...star, ownerId };
    });
}

/** Filter + project stars that have a non-null owner — for the nearest-star fallback. */
function toOwnedStars(stars: ReadonlyArray<StarState>): GridOwnedStar[] {
    const out: GridOwnedStar[] = [];
    for (const s of stars) {
        if (s.ownerId !== null && s.ownerId !== undefined) {
            out.push({ id: s.id, ownerId: s.ownerId, x: s.x, y: s.y });
        }
    }
    return out;
}

function buildTransitionKey(input: RenderFamilyInput): string | null {
    const events = input.activeTransition?.events;
    if (!events?.length) return null;
    return events
        .map((entry) =>
            [
                entry.event.tick,
                entry.event.starId,
                entry.event.previousOwner,
                entry.event.newOwner,
                entry.startedAtMs,
            ].join(':'),
        )
        .join('|');
}

function buildSessionKey(input: RenderFamilyInput): string {
    const starIds = [...input.stars]
        .map((s) => s.id)
        .sort((a, b) => a.localeCompare(b))
        .join('|');
    return `${input.world.minX ?? 0},${input.world.minY ?? 0}:${input.world.width}x${input.world.height}:${starIds}`;
}

interface CachedPlan {
    readonly planKey: string;
    readonly classification: GridClassification;
    readonly wavePlan: GridWavePlan;
    readonly prevGeometry: ResolvedGeometrySnapshot;
    readonly classificationBuildMs: number;
    readonly wavePlanBuildMs: number;
    readonly planBuildMs: number;
    readonly prevGeometryVersion: string;
    readonly nextGeometryVersion: string;
}

interface MetaballGridPlanSettings {
    readonly spacingPx: number;
    readonly originMode: GridOriginMode;
    readonly distribution: GridDistribution;
    readonly positionJitter: number;
    readonly maxCells: number;
    readonly adjacency: GridAdjacency;
    readonly waveGeometry: GridWaveGeometry;
    readonly waveSeeding: GridWaveSeeding;
    readonly geometrySource: string | null;
}

interface MetaballGridPlanWorkerRequestMeta {
    readonly requestId: number;
    readonly sessionKey: string;
    readonly planKey: string;
    readonly prevGeometry: ResolvedGeometrySnapshot;
    readonly nextGeometryRef: ResolvedGeometrySnapshot;
}

interface PendingMetaballGridTransitionPlan {
    readonly planKey: string;
    readonly durationMs: number;
}

type MetaballGridVisibleFrameState =
    | 'steady'
    | 'holding_pre'
    | 'requested_plan'
    | 'fallback_plan';

interface MetaballGridPerfTransitionState {
    readonly requestedPlanPending: boolean;
    readonly visibleFrameState: MetaballGridVisibleFrameState;
    readonly clockSource: 'none' | 'scheduler' | 'local';
}

interface ActiveFrontierEntry {
    readonly vId: string;
    readonly x: number;
    readonly y: number;
    readonly prevTint: number | null;
    readonly nextTint: number | null;
}

interface ActiveFrontierState {
    readonly signature: string;
    readonly entries: readonly ActiveFrontierEntry[];
    readonly orderedFlipTimes: readonly number[];
    startIndex: number;
    endIndex: number;
}

interface ActiveFrontierMetrics {
    readonly activeWindowCount: number;
    readonly transitionTotalCount: number;
    readonly promotedToActiveCount: number;
    readonly demotedToSettledCount: number;
    readonly transitionSpriteWrites: number;
    readonly fastPathUsed: boolean;
    readonly fallbackReason: string | null;
}

/**
 * Quantize progress to a 1/2048 grid so visually-identical frames reuse the
 * same paint signature. 2048 steps over one transition ≈ sub-pixel fidelity
 * on any practical cell flipWindow and avoids perf-thrash when the host
 * renderer calls update() with micro-changed progress values.
 */
const PROGRESS_QUANT_STEPS = 2048;
function quantProgress(t: number): number {
    if (!Number.isFinite(t)) return 0;
    if (t <= 0) return 0;
    if (t >= 1) return PROGRESS_QUANT_STEPS;
    return Math.round(t * PROGRESS_QUANT_STEPS);
}

function drawFilledGridCell(
    graphics: PIXI.Graphics,
    cellShape: GridCellShape,
    x: number,
    y: number,
    half: number,
    size: number,
    cornerR: number,
    hexR: number,
    fillHex: number,
    alpha: number,
): void {
    if (cellShape === 'circle') {
        graphics.circle(x, y, half).fill({ color: fillHex, alpha });
        return;
    }
    if (cellShape === 'diamond') {
        graphics
            .poly([x, y - half, x + half, y, x, y + half, x - half, y])
            .fill({
                color: fillHex,
                alpha,
            });
        return;
    }
    if (cellShape === 'hex') {
        const pts: number[] = [];
        for (let k = 0; k < 6; k++) {
            pts.push(
                x + HEX_VERTICES_POINTY[k][0] * hexR,
                y + HEX_VERTICES_POINTY[k][1] * hexR,
            );
        }
        graphics.poly(pts).fill({ color: fillHex, alpha });
        return;
    }
    if (cornerR > 0) {
        graphics.roundRect(x - half, y - half, size, size, cornerR).fill({
            color: fillHex,
            alpha,
        });
        return;
    }
    graphics.rect(x - half, y - half, size, size).fill({ color: fillHex, alpha });
}

function drawFilledSquareBounds(
    graphics: PIXI.Graphics,
    bounds: VisibleSquareCellBounds,
    cornerR: number,
    fillHex: number,
    alpha: number,
): void {
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;
    if (!(width > 0) || !(height > 0)) return;
    const clampedCornerR = Math.min(cornerR, width * 0.5, height * 0.5);
    if (clampedCornerR > 0) {
        graphics.roundRect(bounds.left, bounds.top, width, height, clampedCornerR).fill({
            color: fillHex,
            alpha,
        });
        return;
    }
    graphics.rect(bounds.left, bounds.top, width, height).fill({ color: fillHex, alpha });
}

function strokeSquareBounds(
    graphics: PIXI.Graphics,
    bounds: VisibleSquareCellBounds,
    cornerR: number,
    strokeOpts: PIXI.StrokeInput,
): void {
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;
    if (!(width > 0) || !(height > 0)) return;
    const clampedCornerR = Math.min(cornerR, width * 0.5, height * 0.5);
    if (clampedCornerR > 0) {
        graphics.roundRect(bounds.left, bounds.top, width, height, clampedCornerR).stroke(strokeOpts);
        return;
    }
    graphics.rect(bounds.left, bounds.top, width, height).stroke(strokeOpts);
}

/**
 * RenderFamily implementation for metaball-grid.
 */
export class MetaballGridFamily implements RenderFamily {
    readonly id: string;
    readonly label: string;
    readonly tunableKeys: readonly string[] = METABALL_GRID_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    private readonly graphics = new PIXI.Graphics();
    private readonly nativeSpriteLayer = new PIXI.Container();
    private readonly transitionSpriteLayer = new PIXI.Container();
    private readonly settledPrevSpriteLayer = new PIXI.Container();
    private readonly activePrevSpriteLayer = new PIXI.Container();
    private readonly settledNextSpriteLayer = new PIXI.Container();
    private readonly activeNextSpriteLayer = new PIXI.Container();
    private readonly nativeSprites: PIXI.Sprite[] = [];
    private readonly transitionSprites: PIXI.Sprite[] = [];
    private readonly settledPrevSprites: PIXI.Sprite[] = [];
    private readonly activePrevSprites: PIXI.Sprite[] = [];
    private readonly settledNextSprites: PIXI.Sprite[] = [];
    private readonly activeNextSprites: PIXI.Sprite[] = [];
    private readonly colorUtils: ColorUtils;
    private sessionKey: string | null = null;
    private cachedPlan: CachedPlan | null = null;
    /**
     * Last paint-output signature. When the next update() computes the same
     * signature, the scene build + paint is short-circuited — the existing
     * PIXI.Graphics draw list remains visible at zero cost. This is the
     * Phase A dirty-flag gate (2026-04-19).
     */
    private lastPaintSig: string | null = null;
    /**
     * Classification-affecting tunable fingerprint. When this changes we
     * invalidate `cachedPlan` so spacing / origin / distribution / jitter /
     * maxCells edits in the settings UI are picked up live (previously the
     * plan only rebuilt on transitionKey change, which hid tunable edits
     * until the next conquest).
     */
    private lastPlanParamsKey: string | null = null;
    private lastSplitNativeSig: string | null = null;
    private steadyTextureCacheActive = false;
    private steadyTextureCacheSig: string | null = null;
    /** EMA of per-update wall-clock time (ms). Seeded lazily. */
    private emaUpdateMs = 0;
    private frameCount = 0;
    private skippedFrameCount = 0;
    private lastDebugSnapshot: Record<string, unknown> | null = null;
    private planWorker: Worker | null = null;
    private nextPlanWorkerRequestId = 1;
    private activePlanWorkerMeta: MetaballGridPlanWorkerRequestMeta | null = null;
    private queuedPlanWorker:
        | {
              readonly request: MetaballGridPlanWorkerRequest;
              readonly meta: MetaballGridPlanWorkerRequestMeta;
          }
        | null = null;
    private latestPlanWorkerResponse: MetaballGridPlanWorkerResponse | null = null;
    private latestPlanWorkerMeta: MetaballGridPlanWorkerRequestMeta | null = null;
    private activeVisualTransition: MetaballGridVisualTransitionTiming | null = null;
    private pendingTransitionPlan: PendingMetaballGridTransitionPlan | null = null;
    private activeFrontierState: ActiveFrontierState | null = null;
    private effectiveColorIdxScratch: Int32Array | null = null;
    private visibleSquareBoundsScratch:
        | Array<VisibleSquareCellBounds | null>
        | null = null;
    private frontierDistanceFieldBuffers:
        | OwnershipGridFrontierDistanceFieldBuffers
        | null = null;
    private frontierFxSampleField: TerritoryFrontierFxSampleField | null = null;
    private readonly variant: MetaballGridFamilyVariant;

    constructor(
        colorUtils: ColorUtils,
        variant: MetaballGridFamilyVariant = DEFAULT_METABALL_GRID_VARIANT,
    ) {
        this.colorUtils = colorUtils;
        this.variant = variant;
        this.id = variant.id;
        this.label = variant.label;
        this.root.addChild(this.graphics);
        this.nativeSpriteLayer.visible = false;
        this.transitionSpriteLayer.visible = false;
        this.settledPrevSpriteLayer.visible = false;
        this.activePrevSpriteLayer.visible = false;
        this.settledNextSpriteLayer.visible = false;
        this.activeNextSpriteLayer.visible = false;
        this.root.addChild(this.nativeSpriteLayer);
        this.root.addChild(this.transitionSpriteLayer);
        this.root.addChild(this.settledPrevSpriteLayer);
        this.root.addChild(this.activePrevSpriteLayer);
        this.root.addChild(this.settledNextSpriteLayer);
        this.root.addChild(this.activeNextSpriteLayer);
    }

    /** PIXI root used by the canvas to mount/unmount this family's output. */
    get displayRoot(): PIXI.Container {
        return this.root;
    }

    getDebugSnapshot(): Record<string, unknown> | null {
        return this.lastDebugSnapshot;
    }

    private resetState(): void {
        this.disableSteadyTextureCache();
        this.cachedPlan = null;
        this.lastPaintSig = null;
        this.lastPlanParamsKey = null;
        this.lastSplitNativeSig = null;
        this.emaUpdateMs = 0;
        this.frameCount = 0;
        this.skippedFrameCount = 0;
        this.lastDebugSnapshot = null;
        this.latestPlanWorkerResponse = null;
        this.latestPlanWorkerMeta = null;
        this.activePlanWorkerMeta = null;
        this.queuedPlanWorker = null;
        this.activeVisualTransition = null;
        this.pendingTransitionPlan = null;
        this.effectiveColorIdxScratch = null;
        this.visibleSquareBoundsScratch = null;
        this.frontierDistanceFieldBuffers = null;
        this.frontierFxSampleField = null;
        this.resetActiveFrontierState();
        resetMetaballGridStats();
    }

    private disableSteadyTextureCache(): void {
        if (!this.steadyTextureCacheActive) return;
        this.root.cacheAsTexture(false);
        this.steadyTextureCacheActive = false;
        this.steadyTextureCacheSig = null;
    }

    private ensureSteadyTextureCache(paintSig: string): void {
        if (
            this.steadyTextureCacheActive
            && this.steadyTextureCacheSig === paintSig
        ) {
            return;
        }
        this.root.cacheAsTexture({
            antialias: false,
            resolution: 1,
        });
        this.steadyTextureCacheActive = true;
        this.steadyTextureCacheSig = paintSig;
    }

    private shouldUseSteadyTextureCache(params: {
        requestedPlanPending: boolean;
        holdingForPlan: boolean;
        usingVisualTransition: boolean;
        visibleFrameState: MetaballGridVisibleFrameState;
        clockSource: 'none' | 'scheduler' | 'local';
    }): boolean {
        return (
            !params.requestedPlanPending
            && !params.holdingForPlan
            && !params.usingVisualTransition
            && params.visibleFrameState === 'steady'
            && params.clockSource === 'none'
        );
    }

    private hasPendingPlanRequest(planKey: string): boolean {
        return (
            this.activePlanWorkerMeta?.planKey === planKey
            || this.queuedPlanWorker?.meta.planKey === planKey
        );
    }

    private isRequestedPlanPending(planKey: string | null): boolean {
        if (!planKey) return false;
        return (
            this.pendingTransitionPlan?.planKey === planKey
            || this.activePlanWorkerMeta?.planKey === planKey
            || this.queuedPlanWorker?.meta.planKey === planKey
            || this.latestPlanWorkerMeta?.planKey === planKey
        );
    }

    private resolvePerfTransitionState(params: {
        transitionKey: string | null;
        requestedPlanKey: string | null;
        cachedPlanKey: string | null;
        progressState: {
            holdingForPlan: boolean;
            usingVisualTransition: boolean;
        };
    }): MetaballGridPerfTransitionState {
        const requestedPlanPending = this.isRequestedPlanPending(
            params.requestedPlanKey,
        );
        if (params.progressState.usingVisualTransition) {
            return {
                requestedPlanPending,
                visibleFrameState: 'requested_plan',
                clockSource: 'local',
            };
        }
        if (!params.transitionKey) {
            return {
                requestedPlanPending,
                visibleFrameState: 'steady',
                clockSource: 'none',
            };
        }
        if (params.progressState.holdingForPlan) {
            return {
                requestedPlanPending,
                visibleFrameState: 'holding_pre',
                clockSource: 'none',
            };
        }
        return {
            requestedPlanPending,
            visibleFrameState:
                params.cachedPlanKey === params.requestedPlanKey
                    ? 'requested_plan'
                    : 'fallback_plan',
            clockSource: 'scheduler',
        };
    }

    private beginVisualTransition(
        planKey: string,
        nowMs: number,
        durationMs: number,
    ): void {
        this.activeVisualTransition = {
            planKey,
            startedAtMs: nowMs,
            durationMs: Math.max(1, durationMs),
        };
        this.pendingTransitionPlan = null;
        this.lastPaintSig = null;
    }

    private expireVisualTransition(nowMs: number): void {
        const active = this.activeVisualTransition;
        if (!active) return;
        if (nowMs - active.startedAtMs < Math.max(1, active.durationMs)) {
            return;
        }
        this.activeVisualTransition = null;
    }

    private ensureSpritePool(
        layer: PIXI.Container,
        pool: PIXI.Sprite[],
        required: number,
    ): void {
        while (pool.length < required) {
            const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
            sprite.anchor.set(0.5);
            layer.addChild(sprite);
            pool.push(sprite);
        }
    }

    private ensureEffectiveColorIdxScratch(size: number): Int32Array {
        if (!this.effectiveColorIdxScratch || this.effectiveColorIdxScratch.length !== size) {
            this.effectiveColorIdxScratch = new Int32Array(size);
        }
        return this.effectiveColorIdxScratch;
    }

    private ensureVisibleSquareBoundsScratch(
        size: number,
    ): Array<VisibleSquareCellBounds | null> {
        if (!this.visibleSquareBoundsScratch || this.visibleSquareBoundsScratch.length !== size) {
            this.visibleSquareBoundsScratch = new Array<VisibleSquareCellBounds | null>(size).fill(null);
        }
        return this.visibleSquareBoundsScratch;
    }

    private ensureFrontierDistanceFieldBuffers(
        size: number,
    ): OwnershipGridFrontierDistanceFieldBuffers {
        if (
            !this.frontierDistanceFieldBuffers ||
            this.frontierDistanceFieldBuffers.leftDistancePxByCell.length !== size
        ) {
            this.frontierDistanceFieldBuffers =
                createOwnershipGridFrontierDistanceFieldBuffers(size);
        }
        return this.frontierDistanceFieldBuffers;
    }

    private hideUnusedSprites(pool: PIXI.Sprite[], fromIndex: number): void {
        for (let i = fromIndex; i < pool.length; i++) {
            pool[i].visible = false;
        }
    }

    private writeSquareSprite(
        sprite: PIXI.Sprite,
        x: number,
        y: number,
        size: number,
        tint: number,
        alpha: number,
    ): void {
        sprite.visible = alpha > 0;
        sprite.x = x;
        sprite.y = y;
        sprite.width = size;
        sprite.height = size;
        sprite.tint = tint;
        sprite.alpha = alpha;
    }

    private resetActiveFrontierState(): void {
        this.activeFrontierState = null;
        this.settledPrevSpriteLayer.visible = false;
        this.activePrevSpriteLayer.visible = false;
        this.settledNextSpriteLayer.visible = false;
        this.activeNextSpriteLayer.visible = false;
        this.hideUnusedSprites(this.settledPrevSprites, 0);
        this.hideUnusedSprites(this.activePrevSprites, 0);
        this.hideUnusedSprites(this.settledNextSprites, 0);
        this.hideUnusedSprites(this.activeNextSprites, 0);
    }

    private hasVisibleSprites(sprites: readonly PIXI.Sprite[]): boolean {
        for (let i = 0; i < sprites.length; i++) {
            if (sprites[i].visible) return true;
        }
        return false;
    }

    private hasLingeringTransitionPresentation(): boolean {
        return this.activeFrontierState !== null
            || this.hasVisibleSprites(this.transitionSprites)
            || this.hasVisibleSprites(this.settledPrevSprites)
            || this.hasVisibleSprites(this.activePrevSprites)
            || this.hasVisibleSprites(this.settledNextSprites)
            || this.hasVisibleSprites(this.activeNextSprites);
    }

    private buildActiveFrontierEntries(params: {
        cached: CachedPlan;
        ownerColorIdx: ReadonlyMap<string, number>;
        fillHexByColorIdx: readonly number[];
    }): ActiveFrontierEntry[] {
        const byId = new Map(params.cached.classification.vstars.map((v) => [v.id, v]));
        const entries: ActiveFrontierEntry[] = [];
        for (let i = 0; i < params.cached.wavePlan.orderedTransitionVIds.length; i++) {
            const vId = params.cached.wavePlan.orderedTransitionVIds[i];
            const v = byId.get(vId);
            if (!v || v.role === 'native' || v.role === 'outside') continue;
            const prevIdx = v.prevOwnerId ? params.ownerColorIdx.get(v.prevOwnerId) : undefined;
            const nextIdx = v.nextOwnerId ? params.ownerColorIdx.get(v.nextOwnerId) : undefined;
            entries.push({
                vId,
                x: v.x,
                y: v.y,
                prevTint:
                    prevIdx === undefined ? null : (params.fillHexByColorIdx[prevIdx] ?? null),
                nextTint:
                    nextIdx === undefined ? null : (params.fillHexByColorIdx[nextIdx] ?? null),
            });
        }
        return entries;
    }

    private applySettledFrontierState(params: {
        spriteIndex: number;
        entry: ActiveFrontierEntry;
        state: 'before' | 'after' | 'hidden';
        size: number;
        fillAlphaMult: number;
    }): number {
        const prevSprite = this.settledPrevSprites[params.spriteIndex];
        const nextSprite = this.settledNextSprites[params.spriteIndex];
        let writes = 0;

        if (params.state === 'before' && params.entry.prevTint !== null) {
            this.writeSquareSprite(
                prevSprite,
                params.entry.x,
                params.entry.y,
                params.size,
                params.entry.prevTint,
                params.fillAlphaMult,
            );
            nextSprite.visible = false;
            writes += 1;
            return writes;
        }

        if (params.state === 'after' && params.entry.nextTint !== null) {
            this.writeSquareSprite(
                nextSprite,
                params.entry.x,
                params.entry.y,
                params.size,
                params.entry.nextTint,
                params.fillAlphaMult,
            );
            prevSprite.visible = false;
            writes += 1;
            return writes;
        }

        prevSprite.visible = false;
        nextSprite.visible = false;
        return writes;
    }

    private renderActiveFrontierSlice(params: {
        entries: readonly ActiveFrontierEntry[];
        orderedFlipTimes: readonly number[];
        startIndex: number;
        endIndex: number;
        progress: number;
        flipWindow: number;
        strength: number;
        size: number;
        fillAlphaMult: number;
    }): number {
        const activeCount = Math.max(0, params.endIndex - params.startIndex);
        this.ensureSpritePool(this.activePrevSpriteLayer, this.activePrevSprites, activeCount);
        this.ensureSpritePool(this.activeNextSpriteLayer, this.activeNextSprites, activeCount);

        let prevWriteIndex = 0;
        let nextWriteIndex = 0;
        let writes = 0;
        for (let i = params.startIndex; i < params.endIndex; i++) {
            const entry = params.entries[i];
            const { prevAlpha, nextAlpha } = computeDualPassBlendAlphas({
                progress: params.progress,
                flipTime: params.orderedFlipTimes[i] ?? 0,
                flipWindow: params.flipWindow,
                strength: params.strength,
                emitPrev: entry.prevTint !== null,
                emitNext: entry.nextTint !== null,
            });

            if (entry.prevTint !== null) {
                this.writeSquareSprite(
                    this.activePrevSprites[prevWriteIndex],
                    entry.x,
                    entry.y,
                    params.size,
                    entry.prevTint,
                    prevAlpha * params.fillAlphaMult,
                );
                prevWriteIndex += 1;
                writes += 1;
            }
            if (entry.nextTint !== null) {
                this.writeSquareSprite(
                    this.activeNextSprites[nextWriteIndex],
                    entry.x,
                    entry.y,
                    params.size,
                    entry.nextTint,
                    nextAlpha * params.fillAlphaMult,
                );
                nextWriteIndex += 1;
                writes += 1;
            }
        }

        this.hideUnusedSprites(this.activePrevSprites, prevWriteIndex);
        this.hideUnusedSprites(this.activeNextSprites, nextWriteIndex);
        return writes;
    }

    private updateActiveFrontierFastPath(params: {
        cached: CachedPlan;
        ownerColorIdx: ReadonlyMap<string, number>;
        fillHexByColorIdx: readonly number[];
        frontierSignature: string;
        progress: number;
        flipWindow: number;
        strength: number;
        nativeSize: number;
        settledAlpha: number;
        fillAlphaMult: number;
    }): ActiveFrontierMetrics {
        const orderedFlipTimes = params.cached.wavePlan.orderedFlipTimes;
        const nextRange = findActiveFrontierRange({
            orderedFlipTimes,
            progress: params.progress,
            flipWindow: params.flipWindow,
        });

        const shouldRebuild =
            !this.activeFrontierState
            || this.activeFrontierState.signature !== params.frontierSignature
            || this.activeFrontierState.orderedFlipTimes.length !== orderedFlipTimes.length
            || nextRange.startIndex < this.activeFrontierState.startIndex
            || nextRange.endIndex < this.activeFrontierState.endIndex;

        if (shouldRebuild) {
            const entries = this.buildActiveFrontierEntries({
                cached: params.cached,
                ownerColorIdx: params.ownerColorIdx,
                fillHexByColorIdx: params.fillHexByColorIdx,
            });
            this.ensureSpritePool(this.settledPrevSpriteLayer, this.settledPrevSprites, entries.length);
            this.ensureSpritePool(this.settledNextSpriteLayer, this.settledNextSprites, entries.length);

            let writes = 0;
            for (let i = 0; i < entries.length; i++) {
                const state =
                    i < nextRange.startIndex
                        ? 'after'
                        : i >= nextRange.endIndex
                            ? 'before'
                            : 'hidden';
                writes += this.applySettledFrontierState({
                    spriteIndex: i,
                    entry: entries[i],
                    state,
                    size: params.nativeSize,
                    fillAlphaMult: params.settledAlpha,
                });
            }
            this.hideUnusedSprites(this.settledPrevSprites, entries.length);
            this.hideUnusedSprites(this.settledNextSprites, entries.length);
            writes += this.renderActiveFrontierSlice({
                entries,
                orderedFlipTimes,
                startIndex: nextRange.startIndex,
                endIndex: nextRange.endIndex,
                progress: params.progress,
                flipWindow: params.flipWindow,
                strength: params.strength,
                size: params.nativeSize,
                fillAlphaMult: params.fillAlphaMult,
            });

            this.activeFrontierState = {
                signature: params.frontierSignature,
                entries,
                orderedFlipTimes,
                startIndex: nextRange.startIndex,
                endIndex: nextRange.endIndex,
            };

            this.settledPrevSpriteLayer.visible = true;
            this.activePrevSpriteLayer.visible = true;
            this.settledNextSpriteLayer.visible = true;
            this.activeNextSpriteLayer.visible = true;

            return {
                activeWindowCount: nextRange.endIndex - nextRange.startIndex,
                transitionTotalCount: entries.length,
                promotedToActiveCount: 0,
                demotedToSettledCount: 0,
                transitionSpriteWrites: writes,
                fastPathUsed: true,
                fallbackReason: null,
            };
        }

        const state = this.activeFrontierState;
        if (!state) {
            return {
                activeWindowCount: 0,
                transitionTotalCount: 0,
                promotedToActiveCount: 0,
                demotedToSettledCount: 0,
                transitionSpriteWrites: 0,
                fastPathUsed: false,
                fallbackReason: 'frontier_state_missing',
            };
        }
        const previousStartIndex = state.startIndex;
        const previousEndIndex = state.endIndex;
        let writes = 0;
        for (let i = previousStartIndex; i < nextRange.startIndex; i++) {
            writes += this.applySettledFrontierState({
                spriteIndex: i,
                entry: state.entries[i],
                state: 'after',
                size: params.nativeSize,
                fillAlphaMult: params.settledAlpha,
            });
        }
        for (let i = previousEndIndex; i < nextRange.endIndex; i++) {
            writes += this.applySettledFrontierState({
                spriteIndex: i,
                entry: state.entries[i],
                state: 'hidden',
                size: params.nativeSize,
                fillAlphaMult: params.settledAlpha,
            });
        }
        writes += this.renderActiveFrontierSlice({
            entries: state.entries,
            orderedFlipTimes: state.orderedFlipTimes,
            startIndex: nextRange.startIndex,
            endIndex: nextRange.endIndex,
            progress: params.progress,
            flipWindow: params.flipWindow,
            strength: params.strength,
            size: params.nativeSize,
            fillAlphaMult: params.fillAlphaMult,
        });

        state.startIndex = nextRange.startIndex;
        state.endIndex = nextRange.endIndex;
        this.settledPrevSpriteLayer.visible = true;
        this.activePrevSpriteLayer.visible = true;
        this.settledNextSpriteLayer.visible = true;
        this.activeNextSpriteLayer.visible = true;

        return {
            activeWindowCount: nextRange.endIndex - nextRange.startIndex,
            transitionTotalCount: state.entries.length,
            promotedToActiveCount: Math.max(0, nextRange.endIndex - previousEndIndex),
            demotedToSettledCount: Math.max(0, nextRange.startIndex - previousStartIndex),
            transitionSpriteWrites: writes,
            fastPathUsed: true,
            fallbackReason: null,
        };
    }

    private ensurePlanWorker(): Worker | null {
        if (typeof window === 'undefined' || typeof Worker === 'undefined') {
            return null;
        }
        if (this.planWorker) return this.planWorker;
        const worker = new Worker(
            new URL('./metaballGridPlan.worker.ts', import.meta.url),
            { type: 'module' },
        );
        worker.onmessage = (
            event: MessageEvent<MetaballGridPlanWorkerResponse>,
        ) => {
            const response = event.data;
            const activeMeta = this.activePlanWorkerMeta;
            if (activeMeta && activeMeta.requestId === response.requestId) {
                this.latestPlanWorkerResponse = response;
                this.latestPlanWorkerMeta = activeMeta;
                this.activePlanWorkerMeta = null;
            }
            if (this.queuedPlanWorker) {
                const next = this.queuedPlanWorker;
                this.queuedPlanWorker = null;
                this.activePlanWorkerMeta = next.meta;
                worker.postMessage(next.request);
            }
        };
        worker.onerror = () => {
            worker.terminate();
            this.planWorker = null;
            this.activePlanWorkerMeta = null;
            this.queuedPlanWorker = null;
            this.latestPlanWorkerMeta = null;
            this.latestPlanWorkerResponse = null;
        };
        this.planWorker = worker;
        return worker;
    }

    private commitPendingWorkerPlan(nowMs: number): boolean {
        const response = this.latestPlanWorkerResponse;
        const meta = this.latestPlanWorkerMeta;
        if (!response || !meta) return false;
        this.latestPlanWorkerResponse = null;
        this.latestPlanWorkerMeta = null;
        if (meta.sessionKey !== this.sessionKey) return false;
        if (response.planKey !== meta.planKey) return false;
        this.cachedPlan = {
            planKey: response.planKey,
            classification: response.classification,
            wavePlan: response.wavePlan,
            prevGeometry: meta.prevGeometry,
            prevGeometryVersion: meta.prevGeometry.version,
            classificationBuildMs: response.classificationBuildMs,
            wavePlanBuildMs: response.wavePlanBuildMs,
            planBuildMs: response.planBuildMs,
            nextGeometryVersion: meta.nextGeometryRef.version,
        };
        if (this.pendingTransitionPlan?.planKey === response.planKey) {
            this.beginVisualTransition(
                response.planKey,
                nowMs,
                this.pendingTransitionPlan.durationMs,
            );
        }
        return true;
    }

    private enqueuePlanWorkerRequest(params: {
        request: MetaballGridPlanWorkerRequest;
        meta: MetaballGridPlanWorkerRequestMeta;
    }): boolean {
        const worker = this.ensurePlanWorker();
        if (!worker) return false;
        if (this.activePlanWorkerMeta?.planKey === params.meta.planKey) {
            return true;
        }
        if (this.queuedPlanWorker?.meta.planKey === params.meta.planKey) {
            return true;
        }
        if (this.activePlanWorkerMeta) {
            this.queuedPlanWorker = params;
            return true;
        }
        this.activePlanWorkerMeta = params.meta;
        worker.postMessage(params.request);
        return true;
    }

    private buildWorkerRequest(params: {
        input: RenderFamilyInput;
        planKey: string;
        settings: MetaballGridPlanSettings;
        prevGeometry: ResolvedGeometrySnapshot;
        nextGeometryRef: ResolvedGeometrySnapshot;
        conquestEvents: readonly import('@pax/common').ConquestEvent[];
        prevOwnedStars: readonly GridOwnedStar[];
        nextOwnedStars: readonly GridOwnedStar[];
    }): {
        request: MetaballGridPlanWorkerRequest;
        meta: MetaballGridPlanWorkerRequestMeta;
    } {
        const requestId = this.nextPlanWorkerRequestId++;
        const sameSnapshot =
            params.prevGeometry === params.nextGeometryRef &&
            params.prevOwnedStars === params.nextOwnedStars;
        return {
            request: {
                requestId,
                planKey: params.planKey,
                world: {
                    minX: params.input.world.minX ?? 0,
                    minY: params.input.world.minY ?? 0,
                    width: params.input.world.width,
                    height: params.input.world.height,
                },
                spacingPx: params.settings.spacingPx,
                originMode: params.settings.originMode,
                distribution: params.settings.distribution,
                positionJitter: params.settings.positionJitter,
                maxCells: params.settings.maxCells,
                adjacency: params.settings.adjacency,
                waveGeometry: params.settings.waveGeometry,
                waveSeeding: params.settings.waveSeeding,
                conquestEvents: params.conquestEvents,
                prevRegions: params.prevGeometry.territoryRegions,
                nextRegions: sameSnapshot
                    ? params.prevGeometry.territoryRegions
                    : params.nextGeometryRef.territoryRegions,
                sameSnapshot,
                prevOwnedStars: params.prevOwnedStars,
                nextOwnedStars: sameSnapshot
                    ? params.prevOwnedStars
                    : params.nextOwnedStars,
                starPositions: params.input.stars.map((star) => ({
                    id: star.id,
                    x: star.x,
                    y: star.y,
                })),
            },
            meta: {
                requestId,
                sessionKey: this.sessionKey ?? '',
                planKey: params.planKey,
                prevGeometry: params.prevGeometry,
                nextGeometryRef: params.nextGeometryRef,
            },
        };
    }

    private resolvePrevGeometryForTransition(params: {
        input: RenderFamilyInput;
        settings: MetaballGridPlanSettings;
    }): ResolvedGeometrySnapshot {
        const { input, settings } = params;
        if (input.prevGeometry) {
            return input.prevGeometry;
        }
        const revertedStars = revertStarsForTransition(input);
        return buildPerimeterFieldRenderFamilyGeometry({
            stars: revertedStars,
            lanes: input.lanes,
            worldWidth: input.world.width,
            worldHeight: input.world.height,
            nowMs: input.nowMs,
            geometrySource: settings.geometrySource,
            configSource: input.configSource as Record<string, unknown> | undefined,
        });
    }

    private buildDebugSnapshot(params: {
        input: RenderFamilyInput;
        cached: CachedPlan;
        settings: MetaballGridPlanSettings;
        ownerIdByColorIdx: ReadonlyArray<string>;
        scene: GridMetaballScene;
        schedulerRawProgress: number | null;
        rawProgress: number;
        progress: number;
        flipTransition: GridFlipTransition;
        flipWindow: number;
        borderMode: GridBorderMode;
        borderBlend: boolean;
        sharedEdgeSmoothingPasses: number;
        edgeTrimPx: number;
        borderChaikinPasses: number;
        skipped: boolean;
        rebuiltPlan: boolean;
        holdingForPlan: boolean;
        usingVisualTransition: boolean;
        visibleFrameState: MetaballGridVisibleFrameState;
        clockSource: 'none' | 'scheduler' | 'local';
        requestedPlanPending: boolean;
        frontierDiagnostics: ReturnType<typeof summarizeMetaballGridFrontier>;
    }): Record<string, unknown> {
        const {
            input,
            cached,
            settings,
            ownerIdByColorIdx,
            scene,
            schedulerRawProgress,
            rawProgress,
            progress,
            flipTransition,
            flipWindow,
            borderMode,
            borderBlend,
            sharedEdgeSmoothingPasses,
            edgeTrimPx,
            borderChaikinPasses,
            skipped,
            rebuiltPlan,
            holdingForPlan,
            usingVisualTransition,
            visibleFrameState,
            clockSource,
            requestedPlanPending,
            frontierDiagnostics,
        } = params;
        const configSource = input.configSource;
        const classificationByOwner: Record<
            string,
            {
                emittable: number;
                native: number;
                dispossessed: number;
                emergent: number;
                vacating: number;
            }
        > = {};
        const classificationOwnerIds = new Set<string>();
        for (const v of cached.classification.emittableVstars) {
            const ownerId = v.nextOwnerId ?? v.prevOwnerId;
            if (!ownerId) continue;
            classificationOwnerIds.add(ownerId);
            const bucket = classificationByOwner[ownerId] ?? {
                emittable: 0,
                native: 0,
                dispossessed: 0,
                emergent: 0,
                vacating: 0,
            };
            bucket.emittable += 1;
            if (v.role === 'native') bucket.native += 1;
            else if (v.role === 'dispossessed') bucket.dispossessed += 1;
            else if (v.role === 'emergent') bucket.emergent += 1;
            else if (v.role === 'vacating') bucket.vacating += 1;
            classificationByOwner[ownerId] = bucket;
        }

        const sceneByOwner: Record<
            string,
            {
                totalCells: number;
                visibleCells: number;
                alphaSum: number;
                native: number;
                dispossessed: number;
                emergent: number;
                vacating: number;
                singlePass: number;
                prevPass: number;
                nextPass: number;
            }
        > = {};
        for (const cell of scene.cells) {
            const ownerId =
                ownerIdByColorIdx[cell.colorIdx] ?? `colorIdx:${cell.colorIdx}`;
            const bucket = sceneByOwner[ownerId] ?? {
                totalCells: 0,
                visibleCells: 0,
                alphaSum: 0,
                native: 0,
                dispossessed: 0,
                emergent: 0,
                vacating: 0,
                singlePass: 0,
                prevPass: 0,
                nextPass: 0,
            };
            bucket.totalCells += 1;
            if (cell.alpha > 0) bucket.visibleCells += 1;
            bucket.alphaSum += cell.alpha;
            if (cell.role === 'native') bucket.native += 1;
            else if (cell.role === 'dispossessed') bucket.dispossessed += 1;
            else if (cell.role === 'emergent') bucket.emergent += 1;
            else if (cell.role === 'vacating') bucket.vacating += 1;
            if (cell.pass === 'single') bucket.singlePass += 1;
            else if (cell.pass === 'prev') bucket.prevPass += 1;
            else if (cell.pass === 'next') bucket.nextPass += 1;
            sceneByOwner[ownerId] = bucket;
        }

        const unmappedOwnerIds = [...classificationOwnerIds].filter(
            (ownerId) => !ownerIdByColorIdx.includes(ownerId),
        );

        return {
            familyId: this.variant.id,
            familyLabel: this.variant.label,
            sessionKey: this.sessionKey,
            planKey: cached.planKey,
            tick: input.gameTick ?? null,
            paused: input.paused ?? false,
            activeTransitionEventCount: input.activeTransition?.events.length ?? 0,
            geometrySource: settings.geometrySource,
            waveGeometry: settings.waveGeometry,
            waveSeeding: settings.waveSeeding,
            schedulerRawProgress,
            rawProgress,
            progress,
            flipTransition,
            flipWindow,
            borderMode,
            borderBlend,
            edgeSmoothingPasses: sharedEdgeSmoothingPasses,
            edgeTrimPx,
            borderChaikinPasses,
            disconnectEnabled: readConfigSourceBoolean(
                configSource,
                'MODIFIED_VORONOI_DISCONNECT_ENABLED',
                GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED ?? false,
            ),
            disconnectDistance: readConfigSourceNumber(
                configSource,
                'MODIFIED_VORONOI_DISCONNECT_DISTANCE',
                GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ?? 400,
            ),
            dxWeight: readConfigSourceNumber(
                configSource,
                'TERRITORY_DX_WEIGHT',
                GAME_CONFIG.TERRITORY_DX_WEIGHT ?? 0.3,
            ),
            rebuiltPlan,
            skipped,
            holdingForPlan,
            usingVisualTransition,
            visibleFrameState,
            clockSource,
            requestedPlanPending,
            activeTransitionDurationMs: input.activeTransition?.durationMs ?? null,
            localVisualTransitionDurationMs:
                this.activeVisualTransition?.durationMs ?? null,
            frontierDiagnostics,
            classification: {
                cols: cached.classification.cols,
                rows: cached.classification.rows,
                requestedSpacingPx: cached.classification.requestedSpacingPx,
                effectiveSpacingPx: cached.classification.spacingPx,
                distribution: cached.classification.distribution,
                ownerCount: classificationOwnerIds.size,
                byOwner: classificationByOwner,
                unmappedOwnerIds,
            },
            scene: {
                cellCount: scene.cells.length,
                byOwner: sceneByOwner,
            },
        };
    }

    private buildPlanForTransition(params: {
        input: RenderFamilyInput;
        currentGeometry: ResolvedGeometrySnapshot;
        planKey: string;
        settings: MetaballGridPlanSettings;
    }): CachedPlan {
        const { input, currentGeometry, planKey, settings } = params;

        const revertedStars = revertStarsForTransition(input);
        const prevGeometry = this.resolvePrevGeometryForTransition({
            input,
            settings,
        });

        const conquestEvents = (input.activeTransition?.conquestEvents ?? []);
        const starById = new Map<string, StarState>();
        for (const s of input.stars) starById.set(s.id, s);
        const resolveStarPosition = (starId: string) => {
            const s = starById.get(starId);
            return s ? { x: s.x, y: s.y } : null;
        };

        const revertedOwnedStars = toOwnedStars(revertedStars);
        const currentOwnedStars = toOwnedStars(input.stars);

        const classificationStartMs = performance.now();
        const classification = buildGridClassification({
            world: {
                minX: input.world.minX ?? 0,
                minY: input.world.minY ?? 0,
                width: input.world.width,
                height: input.world.height,
            },
            spacingPx: settings.spacingPx,
            originMode: settings.originMode,
            prevGeometry,
            nextGeometry: currentGeometry,
            conquestEvents,
            resolveStarPosition,
            prevOwnedStars: revertedOwnedStars,
            nextOwnedStars: currentOwnedStars,
            maxCells: settings.maxCells,
            distribution: settings.distribution,
            positionJitter: settings.positionJitter,
        });
        const classificationBuildMs = performance.now() - classificationStartMs;
        const wavePlanStartMs = performance.now();
        const wavePlan = planGridWave({
            classification,
            seeding: settings.waveSeeding,
            geometry: settings.waveGeometry,
            adjacency: settings.adjacency,
            conquestEvents,
            resolveStarPosition,
        });
        const wavePlanBuildMs = performance.now() - wavePlanStartMs;

        return {
            planKey,
            classification,
            wavePlan,
            prevGeometry,
            prevGeometryVersion: prevGeometry.version,
            classificationBuildMs,
            wavePlanBuildMs,
            planBuildMs: classificationBuildMs + wavePlanBuildMs,
            nextGeometryVersion: currentGeometry.version,
        };
    }

    /**
     * Steady-state plan (no active transition). PREV === NEXT, so classification
     * yields `native` for every cell inside ownership regions and `outside`
     * for the rest. The wave plan is empty. The resulting scene paints a flat
     * grid of native cells — this is the primary visible fill between
     * transitions.
     */
    private buildSteadyStatePlan(params: {
        input: RenderFamilyInput;
        currentGeometry: ResolvedGeometrySnapshot;
        planKey: string;
        settings: MetaballGridPlanSettings;
    }): CachedPlan {
        const { input, currentGeometry, planKey, settings } = params;
        const ownedStars = toOwnedStars(input.stars);

        const classificationStartMs = performance.now();
        const classification = buildGridClassification({
            world: {
                minX: input.world.minX ?? 0,
                minY: input.world.minY ?? 0,
                width: input.world.width,
                height: input.world.height,
            },
            spacingPx: settings.spacingPx,
            originMode: settings.originMode,
            prevGeometry: currentGeometry,
            nextGeometry: currentGeometry,
            conquestEvents: [],
            prevOwnedStars: ownedStars,
            nextOwnedStars: ownedStars,
            maxCells: settings.maxCells,
            distribution: settings.distribution,
            positionJitter: settings.positionJitter,
        });
        const classificationBuildMs = performance.now() - classificationStartMs;
        const wavePlanStartMs = performance.now();
        const wavePlan = planGridWave({
            classification,
            seeding: 'winner_natives',
            geometry: 'grid_bfs',
            adjacency: '8',
            conquestEvents: [],
        });
        const wavePlanBuildMs = performance.now() - wavePlanStartMs;
        return {
            planKey,
            classification,
            wavePlan,
            prevGeometry: currentGeometry,
            prevGeometryVersion: currentGeometry.version,
            classificationBuildMs,
            wavePlanBuildMs,
            planBuildMs: classificationBuildMs + wavePlanBuildMs,
            nextGeometryVersion: currentGeometry.version,
        };
    }

    /**
     * Steady-state plan (no active transition). PREV === NEXT, so classification
     * yields `native` for every cell inside ownership regions and `outside`
     * for the rest. The wave plan is empty. The resulting scene paints a flat
     * grid of native cells — this is the primary visible fill between
     * transitions.
     */
    update(input: RenderFamilyInput): RenderFamilyOutput {
        const startMs = performance.now();
        const nextSessionKey = buildSessionKey(input);
        if (this.sessionKey !== nextSessionKey) {
            this.sessionKey = nextSessionKey;
            this.resetState();
        }
        let rebuiltPlan = this.commitPendingWorkerPlan(input.nowMs);
        this.expireVisualTransition(input.nowMs);

        const currentGeometry = input.geometry;
        if (!currentGeometry) {
            this.disableSteadyTextureCache();
            this.root.visible = false;
            resetMetaballGridStats();
            return { container: this.root };
        }

        const enabled = readTunableBoolean(
            input,
            'METABALL_GRID_ENABLED',
            GAME_CONFIG.METABALL_GRID_ENABLED ??
                (GAME_CONFIG.TERRITORY_RENDER_MODE === this.id),
        );
        if (!enabled) {
            this.disableSteadyTextureCache();
            this.graphics.clear();
            this.root.visible = false;
            resetMetaballGridStats();
            return { container: this.root };
        }
        this.root.visible = true;

        // ── Classification-affecting tunables, hoisted so plan invalidation
        //    picks up settings-UI edits live. Read values are the same that
        //    the plan builders will re-read one level down; cheap map lookups.
        const requestedSpacingPx = Math.max(
            2,
            readTunableNumber(
                input,
                'METABALL_GRID_SPACING_PX',
                GAME_CONFIG.METABALL_GRID_SPACING_PX ?? 24,
            ),
        );
        const originModeHoisted = readTunableString<GridOriginMode>(
            input,
            'METABALL_GRID_ORIGIN_MODE',
            (GAME_CONFIG.METABALL_GRID_ORIGIN_MODE as GridOriginMode | undefined) ?? 'centered',
            ['centered', 'corner'],
        );
        const distributionHoisted = readTunableString<GridDistribution>(
            input,
            'METABALL_GRID_DISTRIBUTION',
            (GAME_CONFIG.METABALL_GRID_DISTRIBUTION as GridDistribution | undefined) ?? 'square',
            ['square', 'hex_offset', 'jittered'],
        );
        const positionJitterHoisted = readTunableNumber(
            input,
            'METABALL_GRID_POSITION_JITTER',
            GAME_CONFIG.METABALL_GRID_POSITION_JITTER ?? 0,
        );
        const maxCellsHoisted = readTunableNumber(
            input,
            'METABALL_GRID_MAX_CELLS',
            GAME_CONFIG.METABALL_GRID_MAX_CELLS ?? 0,
        );
        const planParamsKey =
            `${requestedSpacingPx}|${originModeHoisted}|${distributionHoisted}|${positionJitterHoisted}|${maxCellsHoisted}`;
        if (this.cachedPlan && this.lastPlanParamsKey !== planParamsKey) {
            this.cachedPlan = null;
        }
        this.lastPlanParamsKey = planParamsKey;

        const transitionKey = buildTransitionKey(input);
        const transitionDurationMs = Math.max(
            1,
            input.activeTransition?.durationMs ?? 1,
        );
        const settings: MetaballGridPlanSettings = {
            spacingPx: Math.max(
                2,
                readTunableNumber(
                    input,
                    'METABALL_GRID_SPACING_PX',
                    GAME_CONFIG.METABALL_GRID_SPACING_PX ?? 48,
                ),
            ),
            originMode: readTunableString<GridOriginMode>(
                input,
                'METABALL_GRID_ORIGIN_MODE',
                (GAME_CONFIG.METABALL_GRID_ORIGIN_MODE as GridOriginMode | undefined) ??
                    'centered',
                ['centered', 'corner'],
            ),
            distribution: readTunableString<GridDistribution>(
                input,
                'METABALL_GRID_DISTRIBUTION',
                (GAME_CONFIG.METABALL_GRID_DISTRIBUTION as GridDistribution | undefined) ??
                    'square',
                ['square', 'hex_offset', 'jittered'],
            ),
            positionJitter: readTunableNumber(
                input,
                'METABALL_GRID_POSITION_JITTER',
                GAME_CONFIG.METABALL_GRID_POSITION_JITTER ?? 0,
            ),
            maxCells: Math.max(
                0,
                readTunableNumber(
                    input,
                    'METABALL_GRID_MAX_CELLS',
                    GAME_CONFIG.METABALL_GRID_MAX_CELLS ?? 0,
                ),
            ),
            adjacency: readTunableString<GridAdjacency>(
                input,
                'METABALL_GRID_ADJACENCY',
                (GAME_CONFIG.METABALL_GRID_ADJACENCY as GridAdjacency | undefined) ??
                    '8',
                ['4', '8'],
            ),
            waveGeometry: readTunableString<GridWaveGeometry>(
                input,
                'METABALL_GRID_WAVE_GEOMETRY',
                (GAME_CONFIG.METABALL_GRID_WAVE_GEOMETRY as GridWaveGeometry | undefined) ??
                    this.variant.defaultWaveGeometry,
                [
                    'grid_bfs',
                    'euclidean_band',
                    'conquered_star_radial',
                    'pre_to_post_frontier',
                ],
            ),
            waveSeeding: readTunableString<GridWaveSeeding>(
                input,
                'METABALL_GRID_WAVE_SEEDING',
                (GAME_CONFIG.METABALL_GRID_WAVE_SEEDING as GridWaveSeeding | undefined) ??
                    'winner_natives',
                [
                    'winner_natives',
                    'conquered_star_center',
                    'winner_nearest_edge',
                ],
            ),
            geometrySource:
                (input.tunables.get('PERIMETER_FIELD_GEOMETRY_SOURCE') as
                    | string
                    | undefined) ?? null,
        };
        const prevGeoRef = input.prevGeometry ?? null;
        const geometryVersionForPlan =
            transitionKey && prevGeoRef
                ? `${prevGeoRef.version}->${currentGeometry.version}`
                : currentGeometry.version;
        const planKey = buildMetaballGridPlanKey({
            transitionKey: transitionKey ?? 'steady',
            geometryVersion: geometryVersionForPlan,
            geometrySource: settings.geometrySource,
            spacingPx: settings.spacingPx,
            originMode: settings.originMode,
            distribution: settings.distribution,
            positionJitter: settings.positionJitter,
            maxCells: settings.maxCells,
            adjacency: transitionKey ? settings.adjacency : undefined,
            waveGeometry: transitionKey ? settings.waveGeometry : undefined,
            waveSeeding: transitionKey ? settings.waveSeeding : undefined,
        });

        // Rebuild from semantic geometry identity rather than object identity.
        // Localized snapshots can be freshly allocated while still describing
        // the same plan truth; the plan key carries authoritative geometry
        // versions.
        if (transitionKey) {
            if (
                !this.cachedPlan
                || this.cachedPlan.planKey !== planKey
            ) {
                if (!this.hasPendingPlanRequest(planKey)) {
                    const prevGeometry = this.resolvePrevGeometryForTransition({
                        input,
                        settings,
                    });
                    const revertedOwnedStars = toOwnedStars(
                        revertStarsForTransition(input),
                    );
                    const currentOwnedStars = toOwnedStars(input.stars);
                    const workerRequest = this.buildWorkerRequest({
                        input,
                        planKey,
                        settings,
                        prevGeometry,
                        nextGeometryRef: currentGeometry,
                        conquestEvents:
                            input.activeTransition?.conquestEvents ?? [],
                        prevOwnedStars: revertedOwnedStars,
                        nextOwnedStars: currentOwnedStars,
                    });
                    const scheduled = this.enqueuePlanWorkerRequest(workerRequest);
                    if (scheduled) {
                        this.pendingTransitionPlan = {
                            planKey,
                            durationMs: transitionDurationMs,
                        };
                    }
                    if (!scheduled || !this.cachedPlan) {
                        this.cachedPlan = this.buildPlanForTransition({
                            input,
                            currentGeometry,
                            planKey,
                            settings,
                        });
                        this.beginVisualTransition(
                            planKey,
                            input.nowMs,
                            transitionDurationMs,
                        );
                        rebuiltPlan = true;
                    }
                }
            }
        } else {
            const visualTransitionStillActive =
                this.activeVisualTransition !== null
                && this.cachedPlan?.planKey === this.activeVisualTransition.planKey;
            if (
                !visualTransitionStillActive
                && (
                    !this.cachedPlan
                    || this.cachedPlan.planKey !== planKey
                )
            ) {
                const ownedStars = toOwnedStars(input.stars);
                const workerRequest = this.buildWorkerRequest({
                    input,
                    planKey,
                    settings,
                    prevGeometry: currentGeometry,
                    nextGeometryRef: currentGeometry,
                    conquestEvents: [],
                    prevOwnedStars: ownedStars,
                    nextOwnedStars: ownedStars,
                });
                const scheduled = this.enqueuePlanWorkerRequest(workerRequest);
                if (!scheduled || !this.cachedPlan) {
                    this.cachedPlan = this.buildSteadyStatePlan({
                        input,
                        currentGeometry,
                        planKey,
                        settings,
                    });
                    rebuiltPlan = true;
                }
            }
        }

        const cached = this.cachedPlan;
        const progressState = resolveMetaballGridDisplayProgress({
            schedulerRawProgress: input.activeTransition?.progress ?? null,
            requestedPlanKey: transitionKey ? planKey : null,
            cachedPlanKey: cached?.planKey ?? null,
            activeVisualTransition: this.activeVisualTransition,
            nowMs: input.nowMs,
        });
        const perfTransitionState = this.resolvePerfTransitionState({
            transitionKey,
            requestedPlanKey: transitionKey ? planKey : null,
            cachedPlanKey: cached?.planKey ?? null,
            progressState,
        });
        if (!cached) {
            this.disableSteadyTextureCache();
            updateMetaballGridStats({
                planWorkerPending: perfTransitionState.requestedPlanPending,
                holdingForPlan: progressState.holdingForPlan,
                visualTransitionActive: progressState.usingVisualTransition,
                visibleFrameState: perfTransitionState.visibleFrameState,
                clockSource: perfTransitionState.clockSource,
                activeTransitionDurationMs:
                    input.activeTransition?.durationMs ?? null,
                activeTransitionStartedAtMs:
                    input.activeTransition?.startedAtMs ?? null,
                schedulerRawProgress: input.activeTransition?.progress ?? null,
                rawProgress: progressState.rawProgress,
                easedProgress: progressState.rawProgress,
                localVisualTransitionDurationMs:
                    this.activeVisualTransition?.durationMs ?? null,
                requestedPlanPending: perfTransitionState.requestedPlanPending,
                flipTimeMin: null,
                flipTimeP25: null,
                flipTimeP50: null,
                flipTimeP75: null,
                flipTimeP95: null,
                flipTimeMax: null,
                flipTimeBins: {
                    '0-0.1': 0,
                    '0.1-0.25': 0,
                    '0.25-0.5': 0,
                    '0.5-0.75': 0,
                    '0.75-1': 0,
                },
                frontierVisibleStartProgress: null,
                frontierVisibleEndProgress: null,
                frontierVisibleLifetimeProgress: null,
                frontierVisibleLifetimeMs: null,
                renderCacheMode: 'live_vectors',
            });
            return { container: this.root };
        }
        const rawProgress = progressState.rawProgress;

        // ── Transition / flip knobs ──────────────────────────────────────────
        const flipTransition = readTunableString<GridFlipTransition>(
            input,
            'METABALL_GRID_FLIP_TRANSITION',
            (GAME_CONFIG.METABALL_GRID_FLIP_TRANSITION as GridFlipTransition | undefined) ?? 'dual_pass_blend',
            ['hard', 'lerp_per_cell', 'dual_pass_blend'],
        );
        const flipWindow = Math.max(
            0,
            readTunableNumber(input, 'METABALL_GRID_FLIP_WINDOW', GAME_CONFIG.METABALL_GRID_FLIP_WINDOW ?? 0.14),
        );
        const frontierDiagnostics = summarizeMetaballGridFrontier({
            orderedFlipTimes: cached.wavePlan.orderedFlipTimes,
            flipWindow,
        });
        const strength = 1.0;
        const inwardOffsetPx = readTunableNumber(
            input,
            'METABALL_GRID_INWARD_OFFSET_PX',
            GAME_CONFIG.METABALL_GRID_INWARD_OFFSET_PX ?? 0,
        );
        const boundaryFillFlush = readTunableBoolean(
            input,
            'METABALL_GRID_BOUNDARY_FILL_FLUSH',
            this.variant.defaultBoundaryFillFlush,
        );
        const waveEase = readTunableString<GridWaveEase>(
            input,
            'METABALL_GRID_WAVE_EASE',
            (GAME_CONFIG.METABALL_GRID_WAVE_EASE as GridWaveEase | undefined) ?? 'ease_in_out',
            ['linear', 'ease_in', 'ease_out', 'ease_in_out', 'back_out', 'elastic_out'],
        );
        const flipTimeJitter = Math.max(
            0,
            Math.min(
                0.5,
                readTunableNumber(
                    input,
                    'METABALL_GRID_FLIP_WINDOW_JITTER',
                    GAME_CONFIG.METABALL_GRID_FLIP_WINDOW_JITTER ?? 0,
                ),
            ),
        );

        // ── Shape / border knobs ─────────────────────────────────────────────
        const cellShape = readTunableString<GridCellShape>(
            input,
            'METABALL_GRID_CELL_SHAPE',
            (GAME_CONFIG.METABALL_GRID_CELL_SHAPE as GridCellShape | undefined) ?? 'square',
            ['square', 'circle', 'diamond', 'hex'],
        );
        const cellInsetPx = Math.max(
            0,
            readTunableNumber(input, 'METABALL_GRID_CELL_INSET_PX', GAME_CONFIG.METABALL_GRID_CELL_INSET_PX ?? 0),
        );
        const cellCornerPx = Math.max(
            0,
            readTunableNumber(input, 'METABALL_GRID_CELL_CORNER_PX', GAME_CONFIG.METABALL_GRID_CELL_CORNER_PX ?? 0),
        );
        const borderMode = readTunableString<GridBorderMode>(
            input,
            'METABALL_GRID_BORDER_MODE',
            (GAME_CONFIG.METABALL_GRID_BORDER_MODE as GridBorderMode | undefined) ??
                this.variant.defaultBorderMode,
            ['off', 'per_cell', 'territory_edge'],
        );
        const borderBlend = readTunableBoolean(
            input,
            'METABALL_GRID_BORDER_BLEND',
            GAME_CONFIG.METABALL_GRID_BORDER_BLEND ??
                this.variant.defaultBorderBlend,
        );
        const sharedEdgeSmoothingPasses = Math.max(
            0,
            Math.min(
                4,
                Math.round(
                    readTunableNumber(
                        input,
                        'METABALL_GRID_EDGE_SMOOTHING_PASSES',
                        GAME_CONFIG.METABALL_GRID_EDGE_SMOOTHING_PASSES ??
                            this.variant.defaultEdgeSmoothingPasses,
                    ),
                ),
            ),
        );
        const edgeTrimPx = Math.max(
            0,
            readTunableNumber(
                input,
                'METABALL_GRID_EDGE_TRIM_PX',
                GAME_CONFIG.METABALL_GRID_EDGE_TRIM_PX ??
                    this.variant.defaultEdgeTrimPx,
            ),
        );
        const borderChaikinPasses = Math.max(
            0,
            Math.min(
                4,
                Math.round(
                    readTunableNumber(
                        input,
                        'METABALL_GRID_BORDER_CHAIKIN_PASSES',
                        GAME_CONFIG.METABALL_GRID_BORDER_CHAIKIN_PASSES ??
                            this.variant.defaultBorderChaikinPasses,
                    ),
                ),
            ),
        );
        const totalBorderChaikinPasses = Math.max(
            0,
            Math.min(6, sharedEdgeSmoothingPasses + borderChaikinPasses),
        );
        const configSource = input.configSource;
        const disconnectEnabled = readConfigSourceBoolean(
            configSource,
            'MODIFIED_VORONOI_DISCONNECT_ENABLED',
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_ENABLED ?? false,
        );
        const disconnectDistance = readConfigSourceNumber(
            configSource,
            'MODIFIED_VORONOI_DISCONNECT_DISTANCE',
            GAME_CONFIG.MODIFIED_VORONOI_DISCONNECT_DISTANCE ?? 400,
        );
        const dxWeight = readConfigSourceNumber(
            configSource,
            'TERRITORY_DX_WEIGHT',
            GAME_CONFIG.TERRITORY_DX_WEIGHT ?? 0.3,
        );

        // ── Shared HSLA knobs (fill + border) ───────────────────────────────
        const fillSat = readTunableNumber(input, 'METABALL_SATURATION', GAME_CONFIG.METABALL_SATURATION ?? 1.05);
        const fillLight = readTunableNumber(input, 'METABALL_LIGHTNESS', GAME_CONFIG.METABALL_LIGHTNESS ?? 0.65);
        const fillAlphaMult = Math.max(
            0,
            Math.min(1, readTunableNumber(input, 'METABALL_ALPHA', GAME_CONFIG.METABALL_ALPHA ?? 0.5)),
        );
        const borderWidth = Math.max(
            0,
            readTunableNumber(input, 'METABALL_BORDER_WIDTH', GAME_CONFIG.METABALL_BORDER_WIDTH ?? 1.5),
        );
        const borderAlpha = Math.max(
            0,
            Math.min(1, readTunableNumber(input, 'METABALL_BORDER_ALPHA', GAME_CONFIG.METABALL_BORDER_ALPHA ?? 0.6)),
        );
        const borderSat = readTunableNumber(
            input,
            'METABALL_BORDER_SATURATION',
            GAME_CONFIG.METABALL_BORDER_SATURATION ?? 1.0,
        );
        const borderLight = readTunableNumber(
            input,
            'METABALL_BORDER_LIGHTNESS',
            GAME_CONFIG.METABALL_BORDER_LIGHTNESS ?? 1.0,
        );

        // ── Palette: owner → (colorIdx, adjusted fill hex, adjusted border hex) ─
        const frontierFxMode = readTunableString(
            input,
            'TERRITORY_FRONTIER_FX_MODE',
            GAME_CONFIG.TERRITORY_FRONTIER_FX_MODE ?? 'off',
            ['off', 'soft_fade', 'stepped_moat', 'plasma_rim'],
        );
        const frontierFxWidthPx = Math.max(
            0,
            readTunableNumber(
                input,
                'TERRITORY_FRONTIER_FX_WIDTH_PX',
                GAME_CONFIG.TERRITORY_FRONTIER_FX_WIDTH_PX ?? 24,
            ),
        );
        const frontierFxStrength = Math.max(
            0,
            Math.min(
                1,
                readTunableNumber(
                    input,
                    'TERRITORY_FRONTIER_FX_STRENGTH',
                    GAME_CONFIG.TERRITORY_FRONTIER_FX_STRENGTH ?? 0.75,
                ),
            ),
        );
        const frontierFxSteps = Math.max(
            1,
            Math.round(
                readTunableNumber(
                    input,
                    'TERRITORY_FRONTIER_FX_STEPS',
                    GAME_CONFIG.TERRITORY_FRONTIER_FX_STEPS ?? 4,
                ),
            ),
        );
        const frontierFxSoftness = Math.max(
            0.35,
            readTunableNumber(
                input,
                'TERRITORY_FRONTIER_FX_SOFTNESS',
                GAME_CONFIG.TERRITORY_FRONTIER_FX_SOFTNESS ?? 1.2,
            ),
        );
        const frontierFxPulseSpeed = Math.max(
            0.1,
            readTunableNumber(
                input,
                'TERRITORY_FRONTIER_FX_PULSE_SPEED',
                GAME_CONFIG.TERRITORY_FRONTIER_FX_PULSE_SPEED ?? 1,
            ),
        );
        const frontierFxApplySteadyState = readTunableBoolean(
            input,
            'TERRITORY_FRONTIER_FX_APPLY_STEADY_STATE',
            GAME_CONFIG.TERRITORY_FRONTIER_FX_APPLY_STEADY_STATE ?? true,
        );
        const frontierFxApplyTransition = readTunableBoolean(
            input,
            'TERRITORY_FRONTIER_FX_APPLY_TRANSITION',
            GAME_CONFIG.TERRITORY_FRONTIER_FX_APPLY_TRANSITION ?? true,
        );
        const frontierFxTuning = {
            mode: frontierFxMode,
            widthPx: frontierFxWidthPx,
            strength: frontierFxStrength,
            steps: frontierFxSteps,
            softness: frontierFxSoftness,
            pulseSpeed: frontierFxPulseSpeed,
            applySteadyState: frontierFxApplySteadyState,
            applyTransition: frontierFxApplyTransition,
        };
        const frontierFxActiveForFrame = isTerritoryFrontierFxActive(
            frontierFxTuning,
            !!input.activeTransition,
        );
        const frontierFxAnimatedForFrame =
            frontierFxActiveForFrame && frontierFxMode === 'plasma_rim';
        const frontierFxPulseBucket = frontierFxAnimatedForFrame
            ? Math.floor(input.nowMs / 16)
            : 0;
        const ownerColorIdx = new Map<string, number>();
        const fillHexByColorIdx: number[] = [];
        const borderHexByColorIdx: number[] = [];
        const ensureOwner = (ownerId: string | null | undefined): void => {
            if (!ownerId) return;
            if (ownerColorIdx.has(ownerId)) return;
            const idx = fillHexByColorIdx.length;
            ownerColorIdx.set(ownerId, idx);
            const base = this.colorUtils.getPlayerColor(ownerId);
            fillHexByColorIdx.push(adjustColorHSL(base, fillSat, fillLight));
            borderHexByColorIdx.push(adjustColorHSL(base, borderSat, borderLight));
        };
        for (const s of input.stars) ensureOwner(s.ownerId);
        for (const entry of input.activeTransition?.events ?? []) {
            ensureOwner(entry.event.previousOwner);
            ensureOwner(entry.event.newOwner);
        }
        const ownerIdByColorIdx = new Array<string>(fillHexByColorIdx.length);
        for (const [ownerId, idx] of ownerColorIdx.entries()) {
            ownerIdByColorIdx[idx] = ownerId;
        }
        const captureDebug = shouldCaptureMetaballGridDebug();

        // ── Dirty-flag paint gate (MG-PERF Phase A) ─────────────────────────
        // Build a signature from every input that can change the painted
        // output. When the signature matches the last frame's, the existing
        // PIXI.Graphics draw list is still valid — skip scene build + paint.
        // Progress is quantized to PROGRESS_QUANT_STEPS so sub-step progress
        // changes don't thrash the gate.
        const palFillSig = fillHexByColorIdx.join(',');
        const palBorderSig = borderHexByColorIdx.join(',');
        // Territory-source config epoch (CX/CP/DX/MSR edits bump this through
        // `bumpTerritoryVisualConfig`). Including it in the paint-sig ensures
        // the dirty-flag gate invalidates when the upstream snapshot is
        // reshaped — previously the gate could short-circuit paint even after
        // the plan rebuilt against a fresh snapshot, hiding visible changes.
        const territoryEpoch = getTerritoryVisualEpoch();
        const paintSig = [
            this.sessionKey ?? '',
            cached.planKey,
            territoryEpoch,
            quantProgress(rawProgress),
            flipTransition,
            flipWindow.toFixed(4),
            strength.toFixed(4),
            inwardOffsetPx.toFixed(2),
            waveEase,
            flipTimeJitter.toFixed(4),
            cellShape,
            cellInsetPx.toFixed(2),
            cellCornerPx.toFixed(2),
            boundaryFillFlush ? '1' : '0',
            borderMode,
            borderBlend ? '1' : '0',
            sharedEdgeSmoothingPasses,
            edgeTrimPx.toFixed(2),
            borderChaikinPasses,
            fillSat.toFixed(4),
            fillLight.toFixed(4),
            fillAlphaMult.toFixed(4),
            borderWidth.toFixed(4),
            borderAlpha.toFixed(4),
            borderSat.toFixed(4),
            borderLight.toFixed(4),
            // Classification-level knobs (also drive plan invalidation above,
            // but included here so plan-rebuilds with same-looking output
            // still get a fresh sig when the underlying grid moved).
            requestedSpacingPx,
            originModeHoisted,
            distributionHoisted,
            positionJitterHoisted.toFixed(4),
            maxCellsHoisted,
            frontierFxMode,
            frontierFxWidthPx.toFixed(3),
            frontierFxStrength.toFixed(3),
            frontierFxSteps,
            frontierFxSoftness.toFixed(3),
            frontierFxPulseSpeed.toFixed(3),
            frontierFxApplySteadyState ? '1' : '0',
            frontierFxApplyTransition ? '1' : '0',
            frontierFxPulseBucket,
            palFillSig,
            palBorderSig,
        ].join('|');

        const shouldUseSteadyTextureCache = this.shouldUseSteadyTextureCache({
            requestedPlanPending: perfTransitionState.requestedPlanPending,
            holdingForPlan: progressState.holdingForPlan,
            usingVisualTransition: progressState.usingVisualTransition,
            visibleFrameState: perfTransitionState.visibleFrameState,
            clockSource: perfTransitionState.clockSource,
        });
        if (!rebuiltPlan && this.lastPaintSig === paintSig) {
            if (shouldUseSteadyTextureCache) {
                this.ensureSteadyTextureCache(paintSig);
            } else {
                this.disableSteadyTextureCache();
            }
            this.frameCount += 1;
            this.skippedFrameCount += 1;
            const elapsed = performance.now() - startMs;
            this.emaUpdateMs = this.emaUpdateMs === 0
                ? elapsed
                : this.emaUpdateMs * 0.9 + elapsed * 0.1;
            updateMetaballGridStats({
                familyId: this.variant.id,
                familyLabel: this.variant.label,
                geometrySource: settings.geometrySource,
                waveGeometry: settings.waveGeometry,
                waveSeeding: settings.waveSeeding,
                borderMode,
                borderBlend,
                edgeSmoothingPasses: sharedEdgeSmoothingPasses,
                edgeTrimPx,
                borderChaikinPasses,
                disconnectEnabled,
                disconnectDistance,
                dxWeight,
                transitionEventCount: input.activeTransition?.events.length ?? 0,
                requestedSpacingPx: cached.classification.requestedSpacingPx,
                effectiveSpacingPx: cached.classification.spacingPx,
                requestedDensityCellsPerMpx: spacingToDensityCellsPerMpx(
                    cached.classification.requestedSpacingPx,
                ),
                effectiveDensityCellsPerMpx: spacingToDensityCellsPerMpx(
                    cached.classification.spacingPx,
                ),
                totalCells: cached.classification.cols * cached.classification.rows,
                emittableCells: cached.classification.emittableVstars.length,
                lastClassificationBuildMs: cached.classificationBuildMs,
                lastWavePlanBuildMs: cached.wavePlanBuildMs,
                lastPlanBuildMs: cached.planBuildMs,
                lastSceneBuildMs: 0,
                lastPaintMs: 0,
                lastUpdateMs: elapsed,
                emaUpdateMs: this.emaUpdateMs,
                lastFrameSkipped: true,
                frameCount: this.frameCount,
                skippedFrameCount: this.skippedFrameCount,
                activeWindowCount: 0,
                transitionTotalCount: cached.wavePlan.orderedTransitionVIds.length,
                promotedToActiveCount: 0,
                demotedToSettledCount: 0,
                transitionSpriteWrites: 0,
                fastPathUsed: false,
                fallbackReason: 'steady_state',
                planWorkerPending: perfTransitionState.requestedPlanPending,
                holdingForPlan: progressState.holdingForPlan,
                visualTransitionActive: progressState.usingVisualTransition,
                visibleFrameState: perfTransitionState.visibleFrameState,
                clockSource: perfTransitionState.clockSource,
                activeTransitionDurationMs:
                    input.activeTransition?.durationMs ?? null,
                activeTransitionStartedAtMs:
                    input.activeTransition?.startedAtMs ?? null,
                schedulerRawProgress: input.activeTransition?.progress ?? null,
                rawProgress,
                easedProgress: easeProgress(waveEase, rawProgress),
                localVisualTransitionDurationMs:
                    this.activeVisualTransition?.durationMs ?? null,
                requestedPlanPending: perfTransitionState.requestedPlanPending,
                flipTimeMin: frontierDiagnostics.min,
                flipTimeP25: frontierDiagnostics.p25,
                flipTimeP50: frontierDiagnostics.p50,
                flipTimeP75: frontierDiagnostics.p75,
                flipTimeP95: frontierDiagnostics.p95,
                flipTimeMax: frontierDiagnostics.max,
                flipTimeBins: frontierDiagnostics.bins,
                frontierVisibleStartProgress:
                    frontierDiagnostics.visibleStartProgress,
                frontierVisibleEndProgress:
                    frontierDiagnostics.visibleEndProgress,
                frontierVisibleLifetimeProgress:
                    frontierDiagnostics.visibleLifetimeProgress,
                frontierVisibleLifetimeMs:
                    frontierDiagnostics.visibleLifetimeProgress !== null
                        ? frontierDiagnostics.visibleLifetimeProgress *
                          (progressState.usingVisualTransition
                              ? Math.max(
                                    1,
                                    this.activeVisualTransition?.durationMs ?? 0,
                                )
                              : Math.max(
                                    1,
                                    input.activeTransition?.durationMs ?? 0,
                                ))
                        : null,
                renderCacheMode: this.steadyTextureCacheActive
                    ? 'steady_texture'
                    : 'live_vectors',
            });
            if (captureDebug && this.lastDebugSnapshot) {
                this.lastDebugSnapshot = {
                    ...this.lastDebugSnapshot,
                    tick: input.gameTick ?? null,
                    paused: input.paused ?? false,
                    schedulerRawProgress:
                        input.activeTransition?.progress ?? null,
                    rawProgress,
                    progress: easeProgress(waveEase, rawProgress),
                    flipTransition,
                    flipWindow,
                    rebuiltPlan: false,
                    skipped: true,
                    holdingForPlan: progressState.holdingForPlan,
                    usingVisualTransition: progressState.usingVisualTransition,
                    visibleFrameState: perfTransitionState.visibleFrameState,
                    clockSource: perfTransitionState.clockSource,
                    requestedPlanPending:
                        perfTransitionState.requestedPlanPending,
                    activeTransitionDurationMs:
                        input.activeTransition?.durationMs ?? null,
                    localVisualTransitionDurationMs:
                        this.activeVisualTransition?.durationMs ?? null,
                    frontierDiagnostics,
                };
            }
            return { container: this.root };
        }

        // ── Apply easing to progress (before flip math) ─────────────────────
        const progress = easeProgress(waveEase, rawProgress);

        // ── Apply deterministic flip-time jitter to the wave plan ───────────
        // For transitions only — steady state has no dispossessed cells. We
        // build a shadow map when jitter > 0; the scene builder reads through
        // the same ReadonlyMap contract.
        let jitteredFlipTimeByVId = cached.wavePlan.flipTimeByVId;
        if (flipTimeJitter > 0 && cached.wavePlan.flipTimeByVId.size > 0) {
            const shifted = new Map<string, number>();
            for (const [vId, t] of cached.wavePlan.flipTimeByVId) {
                const jitter = (hash01(vId) * 2 - 1) * flipTimeJitter;
                const next = t + jitter;
                shifted.set(vId, next < 0 ? 0 : next > 1 ? 1 : next);
            }
            jitteredFlipTimeByVId = shifted;
        }

        const wavePlanForScene: GridWavePlan = jitteredFlipTimeByVId === cached.wavePlan.flipTimeByVId
            ? cached.wavePlan
            : {
                perEvent: cached.wavePlan.perEvent,
                flipTimeByVId: jitteredFlipTimeByVId,
                orderedTransitionVIds: cached.wavePlan.orderedTransitionVIds,
                orderedFlipTimes: cached.wavePlan.orderedFlipTimes,
            };


        // ── Paint: one shape per scene cell. O(N). ──────────────────────────
        const paintStartMs = performance.now();
        this.disableSteadyTextureCache();
        const g = this.graphics;
        g.clear();
        const spacingPx = cached.classification.spacingPx;
        // Clamp inset so a cell never collapses to 0. Interior cells always
        // honor `cellInsetPx`. Boundary cells can either stay flush to the
        // visible frontier or fall back to the legacy "inherit cell inset +
        // junction trim" behavior when flush boundary fill is disabled.
        const insetMax = spacingPx * 0.45;
        const nativeInset = Math.min(cellInsetPx, insetMax);
        const boundaryOffsetTargetPx = computeBoundaryOffsetTargetPx({
            cellInsetPx,
            inwardOffsetPx,
            edgeTrimPx,
            flushBoundaryFill: boundaryFillFlush,
        });
        const boundaryInset = computeBoundaryInset({
            insetMax,
            cellInsetPx,
            inwardOffsetPx,
            edgeTrimPx,
            flushBoundaryFill: boundaryFillFlush,
        });
        // Defaults for square shape at native inset — reused inside the loop
        // when a cell is native. Boundary cells recompute.
        const nativeSize = spacingPx - nativeInset * 2;
        const nativeHalf = nativeSize * 0.5;
        const trueHalf = spacingPx * 0.5;
        const nativeCornerR = cellShape === 'square' ? Math.min(cellCornerPx, nativeHalf) : 0;
        const nativeHexR = nativeSize / SQRT3;
        const boundarySize = spacingPx - boundaryInset * 2;
        const boundaryHalf = boundarySize * 0.5;
        const boundaryCornerR = computeSharedBoundaryCornerRadius({
            cellShape,
            baseCornerPx: cellCornerPx,
            halfSizePx: boundaryHalf,
            smoothingPasses: sharedEdgeSmoothingPasses,
        });
        const boundaryHexR = boundarySize / SQRT3;
        const drawBorders = borderMode !== 'off' && borderWidth > 0 && borderAlpha > 0;
        const drawTerritoryEdgeOnly = borderMode === 'territory_edge';
        const canUseSplitFillOnlyFastPath =
            !drawBorders &&
            !frontierFxActiveForFrame &&
            inwardOffsetPx === 0 &&
            edgeTrimPx === 0 &&
            cellShape === 'square' &&
            cellInsetPx === 0 &&
            cellCornerPx === 0 &&
            sharedEdgeSmoothingPasses === 0;
        // Blended-edge polyline assumes a regular square vertex lattice
        // (vertexX/vertexY are computed from ix/iy and spacingPx). hex_offset
        // and jittered distributions break that assumption, so fall back to
        // per-cell strokes in those modes — otherwise borders visibly detach
        // from their fills.
        const drawBlendedEdges =
            drawBorders &&
            drawTerritoryEdgeOnly &&
            borderBlend &&
            cached.classification.distribution === 'square';
        const activeFrontierFallbackReason =
            !input.activeTransition
                ? 'steady_state'
                : !canUseSplitFillOnlyFastPath
                    ? 'split_fill_constraints'
                    : flipTransition !== 'dual_pass_blend'
                        ? 'flip_transition'
                        : flipTimeJitter > 0
                            ? 'flip_time_jitter'
                            : captureDebug
                                ? 'debug_capture'
                                : null;
        const canUseActiveFrontierFastPath = activeFrontierFallbackReason === null;
        let activeFrontierMetrics: ActiveFrontierMetrics = {
            activeWindowCount: 0,
            transitionTotalCount: 0,
            promotedToActiveCount: 0,
            demotedToSettledCount: 0,
            transitionSpriteWrites: 0,
            fastPathUsed: false,
            fallbackReason: activeFrontierFallbackReason,
        };
        let scene: GridMetaballScene | null = null;
        let sceneBuildMs = 0;
        if (!canUseActiveFrontierFastPath) {
            const sceneStartMs = performance.now();
            scene = renderMetaballGridScene({
                classification: cached.classification,
                wavePlan: wavePlanForScene,
                progress,
                flipTransition,
                flipWindow,
                strength,
                inwardOffsetPx,
                ownerColorIdx,
            });
            sceneBuildMs = performance.now() - sceneStartMs;
        }

        // Build an effective per-grid-index colorIdx so both "per-cell stroke
        // gating" and "centered blended edge drawing" read the same truth.
        // Populated from scene cells — so during transitions the boundary
        // follows whichever side is currently dominant.
        const cols = cached.classification.cols;
        const rows = cached.classification.rows;
        const vstarCount = cached.classification.vstars.length;
        const shouldUseSceneCellBoundaryClassification =
            borderMode === 'territory_edge' ||
            inwardOffsetPx > 0 ||
            !boundaryFillFlush ||
            frontierFxActiveForFrame;
        let effectiveColorIdxByGridIdx: Int32Array | null = null;
        if (
            !canUseSplitFillOnlyFastPath &&
            scene &&
            shouldUseSceneCellBoundaryClassification
        ) {
            effectiveColorIdxByGridIdx = this.ensureEffectiveColorIdxScratch(vstarCount);
            effectiveColorIdxByGridIdx.fill(-1);
            // Seed with NEXT owner as the baseline, so cells whose scene
            // entry was culled (alpha <= 0) still participate in neighbour
            // compares coherently.
            for (let i = 0; i < vstarCount; i++) {
                const v = cached.classification.vstars[i];
                const ownerId = v.nextOwnerId ?? v.prevOwnerId;
                const idx = ownerId ? ownerColorIdx.get(ownerId) : undefined;
                effectiveColorIdxByGridIdx[i] = idx === undefined ? -1 : idx;
            }
            // Overlay scene cell colour indices — the last write wins for
            // dual_pass_blend (we'll take NEXT-pass if it exists, otherwise
            // PREV-pass or single). That gives a reasonable "currently dominant"
            // colour at the boundary.
            for (let i = 0; i < scene.cells.length; i++) {
                const c = scene.cells[i];
                if (c.alpha <= 0) continue;
                const ix = c.ix;
                const iy = c.iy;
                if (ix < 0 || ix >= cols || iy < 0 || iy >= rows) continue;
                effectiveColorIdxByGridIdx[iy * cols + ix] = c.colorIdx;
            }
        }
        let visibleSquareBoundsByGridIdx: Array<VisibleSquareCellBounds | null> | null = null;
        let frontierFxSamples: TerritoryFrontierFxSampleField | null = null;
        if (
            effectiveColorIdxByGridIdx &&
            (cellShape === 'square' || frontierFxActiveForFrame)
        ) {
            const distanceField = buildOwnershipGridFrontierDistanceField({
                cols,
                rows,
                ownerIndexByCell: effectiveColorIdxByGridIdx,
                spacingPx,
                includeWorldEdge: true,
                reuseBuffers: this.ensureFrontierDistanceFieldBuffers(vstarCount),
            });
            if (frontierFxActiveForFrame) {
                frontierFxSamples = buildTerritoryFrontierFxSampleField({
                    distanceField,
                    tuning: frontierFxTuning,
                    nowMs: input.nowMs,
                    hasActiveTransition: !!input.activeTransition,
                    reuseField: this.frontierFxSampleField,
                });
                this.frontierFxSampleField = frontierFxSamples;
            }
            if (cellShape === 'square') {
                visibleSquareBoundsByGridIdx =
                    this.ensureVisibleSquareBoundsScratch(vstarCount);
                for (let i = 0; i < vstarCount; i++) {
                    const colorIdx = effectiveColorIdxByGridIdx[i];
                    if (colorIdx < 0) {
                        visibleSquareBoundsByGridIdx[i] = null;
                        continue;
                    }
                    const v = cached.classification.vstars[i];
                    visibleSquareBoundsByGridIdx[i] = computeVisibleSquareBoundsFromDistance({
                        x: v.x,
                        y: v.y,
                        halfSizePx: trueHalf,
                        nativeInsetPx: nativeInset,
                        boundaryOffsetPx: boundaryOffsetTargetPx,
                        cellIndex: i,
                        distanceField,
                        reuseBounds: visibleSquareBoundsByGridIdx[i],
                    });
                }
            }
        }

        // Per-cell fill + (for per_cell and territory_edge non-blend) per-cell stroke.
        const nativeLayerSig = [
            this.sessionKey ?? '',
            cached.planKey,
            territoryEpoch,
            cellShape,
            nativeSize.toFixed(2),
            nativeCornerR.toFixed(2),
            nativeHexR.toFixed(2),
            fillAlphaMult.toFixed(4),
            palFillSig,
        ].join('|');

        g.visible = !canUseSplitFillOnlyFastPath;
        this.nativeSpriteLayer.visible = canUseSplitFillOnlyFastPath;
        this.transitionSpriteLayer.visible = canUseSplitFillOnlyFastPath && !canUseActiveFrontierFastPath;

        if (canUseSplitFillOnlyFastPath) {
            if (this.lastSplitNativeSig !== nativeLayerSig) {
                let nativeCount = 0;
                for (let i = 0; i < cached.classification.vstars.length; i++) {
                    if (cached.classification.vstars[i].role === 'native') {
                        nativeCount += 1;
                    }
                }
                this.ensureSpritePool(
                    this.nativeSpriteLayer,
                    this.nativeSprites,
                    nativeCount,
                );
                let nativeWriteIndex = 0;
                for (let i = 0; i < cached.classification.vstars.length; i++) {
                    const v = cached.classification.vstars[i];
                    if (v.role !== 'native') continue;
                    const ownerId = v.nextOwnerId ?? v.prevOwnerId;
                    if (!ownerId) continue;
                    const colorIdx = ownerColorIdx.get(ownerId);
                    if (colorIdx === undefined) continue;
                    const fillHex = fillHexByColorIdx[colorIdx];
                    if (fillHex === undefined) continue;
                    this.writeSquareSprite(
                        this.nativeSprites[nativeWriteIndex],
                        v.x,
                        v.y,
                        nativeSize,
                        fillHex,
                        fillAlphaMult,
                    );
                    nativeWriteIndex += 1;
                }
                this.hideUnusedSprites(this.nativeSprites, nativeWriteIndex);
                this.lastSplitNativeSig = nativeLayerSig;
            }
            if (canUseActiveFrontierFastPath) {
                this.hideUnusedSprites(this.transitionSprites, 0);
                const transitionBaseAlpha =
                    Math.max(0, Math.min(1, strength)) * fillAlphaMult;
                const frontierSignature = [
                    this.sessionKey ?? '',
                    cached.planKey,
                    territoryEpoch,
                    nativeSize.toFixed(2),
                    fillAlphaMult.toFixed(4),
                    transitionBaseAlpha.toFixed(4),
                    strength.toFixed(4),
                    flipWindow.toFixed(4),
                    palFillSig,
                ].join('|');
                activeFrontierMetrics = this.updateActiveFrontierFastPath({
                    cached,
                    ownerColorIdx,
                    fillHexByColorIdx,
                    frontierSignature,
                    progress,
                    flipWindow,
                    strength,
                    nativeSize,
                    settledAlpha: transitionBaseAlpha,
                    fillAlphaMult,
                });
            } else {
                this.resetActiveFrontierState();
                const activeScene = scene!;
                let transitionCount = 0;
                for (let i = 0; i < activeScene.cells.length; i++) {
                    const c = activeScene.cells[i];
                    if (c.role === 'native' || c.alpha <= 0) continue;
                    const fillHex = fillHexByColorIdx[c.colorIdx];
                    if (fillHex === undefined) continue;
                    if (c.alpha * fillAlphaMult <= 0) continue;
                    transitionCount += 1;
                }
                this.ensureSpritePool(
                    this.transitionSpriteLayer,
                    this.transitionSprites,
                    transitionCount,
                );
                let transitionWriteIndex = 0;
                for (let i = 0; i < activeScene.cells.length; i++) {
                    const c = activeScene.cells[i];
                    if (c.role === 'native' || c.alpha <= 0) continue;
                    const fillHex = fillHexByColorIdx[c.colorIdx];
                    if (fillHex === undefined) continue;
                    const alpha = c.alpha * fillAlphaMult;
                    if (alpha <= 0) continue;
                    this.writeSquareSprite(
                        this.transitionSprites[transitionWriteIndex],
                        c.x,
                        c.y,
                        nativeSize,
                        fillHex,
                        alpha,
                    );
                    transitionWriteIndex += 1;
                }
                this.hideUnusedSprites(this.transitionSprites, transitionWriteIndex);
                activeFrontierMetrics = {
                    ...activeFrontierMetrics,
                    transitionSpriteWrites: transitionWriteIndex,
                    transitionTotalCount: cached.wavePlan.orderedTransitionVIds.length,
                };
            }
            g.clear();
        } else {
            this.lastSplitNativeSig = null;
            this.resetActiveFrontierState();
            this.hideUnusedSprites(this.nativeSprites, 0);
            this.hideUnusedSprites(this.transitionSprites, 0);
            g.clear();
            const activeScene = scene!;
            for (let i = 0; i < activeScene.cells.length; i++) {
                const c = activeScene.cells[i];
                if (c.alpha <= 0) continue;
                // Numeric grid indices are carried directly on the scene cell so
                // the hot paint loop does not need to parse `g:${ix}:${iy}` ids.
                const ix = c.ix;
                const iy = c.iy;
                const cellIndex = iy * cols + ix;
                const fillHex = fillHexByColorIdx[c.colorIdx];
                if (fillHex === undefined) continue;
                const styledFillHex = applyTerritoryFrontierFxFieldToFill(
                    fillHex,
                    frontierFxSamples,
                    cellIndex,
                );
                const fxAlphaMultiplier =
                    frontierFxSamples?.activeMaskByCell[cellIndex]
                        ? (frontierFxSamples.alphaMultiplierByCell[cellIndex] ?? 1)
                        : 1;
                const alpha =
                    c.alpha * fillAlphaMult * fxAlphaMultiplier;
                if (alpha <= 0) continue;

                // Trust the scene cell's (x, y) — classification already applied
                // any distribution-driven row shift (hex_offset) or jitter. A
                // previous revision double-shifted odd rows here when cellShape
                // was 'hex', which misaligned fill vs. border polylines.
                const x = c.x;
                const y = c.y;

                // Scene roles describe conquest-transition semantics, not the
                // steady ownership frontier. The visible fill and territory-edge
                // border path should use the same ownership-frontier truth in
                // both steady state and transition frames.
                const isOwnershipBoundary =
                    !!effectiveColorIdxByGridIdx &&
                    ix >= 0 &&
                    ix < cols &&
                    iy >= 0 &&
                    iy < rows &&
                    isOwnershipBoundaryCell({
                        ix,
                        iy,
                        cols,
                        rows,
                        colorIdx: c.colorIdx,
                        colorIdxByGridIdx: effectiveColorIdxByGridIdx,
                        includeWorldEdge: true,
                    });
                const isBoundary = isOwnershipBoundary || c.role !== 'native';
                const half = isBoundary ? boundaryHalf : nativeHalf;
                const size = isBoundary ? boundarySize : nativeSize;
                const cornerR = isBoundary ? boundaryCornerR : nativeCornerR;
                const hexR = isBoundary ? boundaryHexR : nativeHexR;
                const usesDistanceSquareBounds =
                    cellShape === 'square' && visibleSquareBoundsByGridIdx !== null;
                const squareBounds =
                    usesDistanceSquareBounds
                        ? visibleSquareBoundsByGridIdx[cellIndex]
                        : null;
                if (usesDistanceSquareBounds && !squareBounds) {
                    continue;
                }
                if (squareBounds) {
                    const usesBoundaryBounds =
                        boundaryOffsetTargetPx > 0 &&
                        (
                            squareBounds.left > x - trueHalf + nativeInset ||
                            squareBounds.right < x + trueHalf - nativeInset ||
                            squareBounds.top > y - trueHalf + nativeInset ||
                            squareBounds.bottom < y + trueHalf - nativeInset
                        );
                    const squareCornerR =
                        usesBoundaryBounds || isBoundary ? boundaryCornerR : nativeCornerR;
                    drawFilledSquareBounds(
                        g,
                        squareBounds,
                        squareCornerR,
                        styledFillHex,
                        alpha,
                    );
                } else {
                    drawFilledGridCell(
                        g,
                        cellShape,
                        x,
                        y,
                        half,
                        size,
                        cornerR,
                        hexR,
                        styledFillHex,
                        alpha,
                    );
                }

                // Per-cell border stroke: skipped for blended-edge path (drawn
                // once per shared edge below instead) and for any cell whose
                // neighbours all share its owner under territory_edge mode.
                if (!drawBorders) continue;
                if (drawBlendedEdges) continue; // handled by the edge pass below
                if (drawTerritoryEdgeOnly && effectiveColorIdxByGridIdx) {
                    if (ix >= 0 && iy >= 0) {
                        const self = c.colorIdx;
                        const neighbourDiffers = (nx: number, ny: number): boolean => {
                            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return true;
                            return effectiveColorIdxByGridIdx![ny * cols + nx] !== self;
                        };
                        const isEdge =
                            neighbourDiffers(ix - 1, iy) ||
                            neighbourDiffers(ix + 1, iy) ||
                            neighbourDiffers(ix, iy - 1) ||
                            neighbourDiffers(ix, iy + 1);
                        if (!isEdge) continue;
                    }
                }
                const borderHex = borderHexByColorIdx[c.colorIdx];
                if (borderHex === undefined) continue;
                const strokeOpts = {
                    color: borderHex,
                    alpha: borderAlpha,
                    width: borderWidth,
                    cap: 'round' as const,
                    join: 'round' as const,
                };
                if (squareBounds) {
                    const usesBoundaryBounds =
                        boundaryOffsetTargetPx > 0 &&
                        (
                            squareBounds.left > x - trueHalf + nativeInset ||
                            squareBounds.right < x + trueHalf - nativeInset ||
                            squareBounds.top > y - trueHalf + nativeInset ||
                            squareBounds.bottom < y + trueHalf - nativeInset
                        );
                    const squareCornerR =
                        usesBoundaryBounds || isBoundary ? boundaryCornerR : nativeCornerR;
                    strokeSquareBounds(g, squareBounds, squareCornerR, strokeOpts);
                } else if (cellShape === 'circle') {
                    g.circle(x, y, half).stroke(strokeOpts);
                } else if (cellShape === 'diamond') {
                    g.poly([x, y - half, x + half, y, x, y + half, x - half, y]).stroke(strokeOpts);
                } else if (cellShape === 'hex') {
                    const pts: number[] = [];
                    for (let k = 0; k < 6; k++) {
                        pts.push(
                            x + HEX_VERTICES_POINTY[k][0] * hexR,
                            y + HEX_VERTICES_POINTY[k][1] * hexR,
                        );
                    }
                    g.poly(pts).stroke(strokeOpts);
                } else if (cornerR > 0) {
                    g.roundRect(x - half, y - half, size, size, cornerR).stroke(strokeOpts);
                } else {
                    g.rect(x - half, y - half, size, size).stroke(strokeOpts);
                }
            }
        }

        // ── Centered-blended territory-edge polyline pass ───────────────────
        // Rather than drawing each ownership-boundary grid-edge in isolation
        // (which gave butt-capped corners), we:
        //   1. collect all boundary edges, keyed by (min, max) owner colour-idx
        //   2. per colour-pair group, build a vertex adjacency graph,
        //   3. walk it into polylines starting from odd-degree / branch vertices,
        //      then mop up any all-degree-2 closed loops,
        //   4. optionally Chaikin-smooth each polyline,
        //   5. stroke each polyline once with round caps + round joins.
        // The result is continuous, corner-joined boundaries in the 50/50
        // blended colour of the two owners' border hexes.
        if (
            !canUseSplitFillOnlyFastPath &&
            drawBlendedEdges &&
            effectiveColorIdxByGridIdx &&
            visibleSquareBoundsByGridIdx
        ) {
            interface BoundaryEdge {
                readonly v0: string;
                readonly v1: string;
            }
            const edgesByPair = new Map<string, BoundaryEdge[]>();
            const coordsByVertex = new Map<string, readonly [number, number]>();
            const vertexKey = (x: number, y: number): string =>
                `${x.toFixed(4)},${y.toFixed(4)}`;
            const pushEdge = (
                a: number,
                b: number,
                x0: number,
                y0: number,
                x1: number,
                y1: number,
            ): void => {
                if (!(Math.abs(x1 - x0) > 0.001 || Math.abs(y1 - y0) > 0.001)) return;
                const lo = a < b ? a : b;
                const hi = a < b ? b : a;
                const key = `${lo}|${hi}`;
                let list = edgesByPair.get(key);
                if (!list) {
                    list = [];
                    edgesByPair.set(key, list);
                }
                const v0 = vertexKey(x0, y0);
                const v1 = vertexKey(x1, y1);
                coordsByVertex.set(v0, [x0, y0]);
                coordsByVertex.set(v1, [x1, y1]);
                list.push({ v0, v1 });
            };

            for (let iy = 0; iy < rows; iy++) {
                for (let ix = 0; ix < cols; ix++) {
                    const cellIndex = iy * cols + ix;
                    const selfIdx = effectiveColorIdxByGridIdx[cellIndex];
                    const selfBounds = visibleSquareBoundsByGridIdx[cellIndex];
                    if (selfIdx < 0 || !selfBounds) continue;
                    if (ix + 1 < cols) {
                        const rightIndex = cellIndex + 1;
                        const rIdx = effectiveColorIdxByGridIdx[rightIndex];
                        const rightBounds = visibleSquareBoundsByGridIdx[rightIndex];
                        if (rIdx >= 0 && rIdx !== selfIdx && rightBounds) {
                            const x = (selfBounds.right + rightBounds.left) * 0.5;
                            const y0 = Math.max(selfBounds.top, rightBounds.top);
                            const y1 = Math.min(selfBounds.bottom, rightBounds.bottom);
                            pushEdge(selfIdx, rIdx, x, y0, x, y1);
                        }
                    }
                    if (iy + 1 < rows) {
                        const downIndex = cellIndex + cols;
                        const dIdx = effectiveColorIdxByGridIdx[downIndex];
                        const downBounds = visibleSquareBoundsByGridIdx[downIndex];
                        if (dIdx >= 0 && dIdx !== selfIdx && downBounds) {
                            const y = (selfBounds.bottom + downBounds.top) * 0.5;
                            const x0 = Math.max(selfBounds.left, downBounds.left);
                            const x1 = Math.min(selfBounds.right, downBounds.right);
                            pushEdge(selfIdx, dIdx, x0, y, x1, y);
                        }
                    }
                }
            }

            const strokeOpts = {
                color: 0xffffff,
                alpha: borderAlpha,
                width: borderWidth,
                cap: 'round' as const,
                join: 'round' as const,
            };

            for (const [key, edges] of edgesByPair) {
                if (edges.length === 0) continue;
                const sep = key.indexOf('|');
                const aIdx = Number(key.slice(0, sep));
                const bIdx = Number(key.slice(sep + 1));
                const hexA = borderHexByColorIdx[aIdx];
                const hexB = borderHexByColorIdx[bIdx];
                if (hexA === undefined || hexB === undefined) continue;
                strokeOpts.color = blendColors(hexA, hexB, 0.5);

                // Adjacency: vertexId → [otherVertexId, edgeIndex][].
                const adj = new Map<string, Array<[string, number]>>();
                for (let e = 0; e < edges.length; e++) {
                    const { v0, v1 } = edges[e];
                    let la = adj.get(v0);
                    if (!la) {
                        la = [];
                        adj.set(v0, la);
                    }
                    la.push([v1, e]);
                    let lb = adj.get(v1);
                    if (!lb) {
                        lb = [];
                        adj.set(v1, lb);
                    }
                    lb.push([v0, e]);
                }

                const usedEdge = new Uint8Array(edges.length);

                const drawChain = (vertexChain: string[], closed: boolean): void => {
                    if (vertexChain.length < 2) return;
                    let pts: number[] = [];
                    for (const vid of vertexChain) {
                        const coords = coordsByVertex.get(vid);
                        if (!coords) return;
                        pts.push(coords[0], coords[1]);
                    }
                    if (totalBorderChaikinPasses > 0) {
                        pts = chaikinSmooth(pts, totalBorderChaikinPasses, closed);
                    }
                    if (!closed && edgeTrimPx > 0) {
                        pts = trimOpenPolylineEndpoints(pts, edgeTrimPx);
                    }
                    g.moveTo(pts[0], pts[1]);
                    for (let k = 2; k < pts.length; k += 2) {
                        g.lineTo(pts[k], pts[k + 1]);
                    }
                    if (closed) g.lineTo(pts[0], pts[1]);
                    g.stroke(strokeOpts);
                };

                // Walk a chain from `startVertex` through unused edges until
                // no unused edge is incident. Returns the vertex sequence.
                const walkFrom = (startVertex: string): string[] => {
                    const chain: string[] = [startVertex];
                    let cur = startVertex;
                    while (true) {
                        const neighbours = adj.get(cur);
                        if (!neighbours) break;
                        let nextVertex = -1;
                        let nextEdge = -1;
                        for (const [other, eIdx] of neighbours) {
                            if (usedEdge[eIdx]) continue;
                            nextVertex = other;
                            nextEdge = eIdx;
                            break;
                        }
                        if (nextEdge < 0) break;
                        usedEdge[nextEdge] = 1;
                        chain.push(nextVertex);
                        cur = nextVertex;
                    }
                    return chain;
                };

                // Pass 1: chains starting at non-degree-2 vertices (endpoints
                // and branch points). Multiple chains may start at one branch.
                for (const [vid, list] of adj) {
                    if (list.length === 2) continue;
                    while (list.some(([, eIdx]) => !usedEdge[eIdx])) {
                        const chain = walkFrom(vid);
                        if (chain.length < 2) break;
                        drawChain(chain, false);
                    }
                }

                // Pass 2: remaining closed loops (every incident vertex was
                // degree 2, so they were never used as a pass-1 start).
                for (let e = 0; e < edges.length; e++) {
                    if (usedEdge[e]) continue;
                    usedEdge[e] = 1;
                    const { v0, v1 } = edges[e];
                    const chain: string[] = [v0, v1];
                    let cur = v1;
                    while (cur !== v0) {
                        const neighbours = adj.get(cur);
                        if (!neighbours) break;
                        let nextVertex = -1;
                        let nextEdge = -1;
                        for (const [other, eIdx] of neighbours) {
                            if (usedEdge[eIdx]) continue;
                            nextVertex = other;
                            nextEdge = eIdx;
                            break;
                        }
                        if (nextEdge < 0) break;
                        usedEdge[nextEdge] = 1;
                        chain.push(nextVertex);
                        cur = nextVertex;
                    }
                    const closed = cur === v0;
                    // When closed, chain's last vertex equals the start; drop
                    // the duplicate so Chaikin sees a clean ring.
                    if (closed) chain.pop();
                    drawChain(chain, closed);
                }
            }
        }

        // ── Record paint-sig + stats (MG-PERF Phase A) ──────────────────────
        this.lastPaintSig = paintSig;
        if (shouldUseSteadyTextureCache) {
            this.ensureSteadyTextureCache(paintSig);
        }
        this.frameCount += 1;
        let paintedCells = 0;
        if (scene) {
            for (let i = 0; i < scene.cells.length; i++) {
                if (scene.cells[i].alpha > 0) paintedCells++;
            }
        } else {
            const visiblePools = [
                this.nativeSprites,
                this.settledPrevSprites,
                this.activePrevSprites,
                this.settledNextSprites,
                this.activeNextSprites,
            ];
            for (let i = 0; i < visiblePools.length; i++) {
                const pool = visiblePools[i];
                for (let j = 0; j < pool.length; j++) {
                    if (pool[j].visible) paintedCells += 1;
                }
            }
        }
        const paintMs = performance.now() - paintStartMs;
        const elapsed = performance.now() - startMs;
        this.emaUpdateMs = this.emaUpdateMs === 0
            ? elapsed
            : this.emaUpdateMs * 0.9 + elapsed * 0.1;
        if (captureDebug && scene) {
            this.lastDebugSnapshot = this.buildDebugSnapshot({
                input,
                cached,
                settings,
                ownerIdByColorIdx,
                scene,
                schedulerRawProgress: input.activeTransition?.progress ?? null,
                rawProgress,
                progress,
                flipTransition,
                flipWindow,
                borderMode,
                borderBlend,
                sharedEdgeSmoothingPasses,
                edgeTrimPx,
                borderChaikinPasses,
            skipped: false,
            rebuiltPlan,
            holdingForPlan: progressState.holdingForPlan,
            usingVisualTransition: progressState.usingVisualTransition,
            visibleFrameState: perfTransitionState.visibleFrameState,
            clockSource: perfTransitionState.clockSource,
            requestedPlanPending: perfTransitionState.requestedPlanPending,
            frontierDiagnostics,
        });
        }
        updateMetaballGridStats({
            familyId: this.variant.id,
            familyLabel: this.variant.label,
            geometrySource: settings.geometrySource,
            waveGeometry: settings.waveGeometry,
            waveSeeding: settings.waveSeeding,
            borderMode,
            borderBlend,
            edgeSmoothingPasses: sharedEdgeSmoothingPasses,
            edgeTrimPx,
            borderChaikinPasses,
            disconnectEnabled,
            disconnectDistance,
            dxWeight,
            transitionEventCount: input.activeTransition?.events.length ?? 0,
            requestedSpacingPx: cached.classification.requestedSpacingPx,
            effectiveSpacingPx: cached.classification.spacingPx,
            requestedDensityCellsPerMpx: spacingToDensityCellsPerMpx(
                cached.classification.requestedSpacingPx,
            ),
            effectiveDensityCellsPerMpx: spacingToDensityCellsPerMpx(
                cached.classification.spacingPx,
            ),
            totalCells: cached.classification.cols * cached.classification.rows,
            emittableCells: cached.classification.emittableVstars.length,
            paintedCells,
            lastClassificationBuildMs: cached.classificationBuildMs,
            lastWavePlanBuildMs: cached.wavePlanBuildMs,
            lastPlanBuildMs: cached.planBuildMs,
            lastSceneBuildMs: sceneBuildMs,
            lastPaintMs: paintMs,
            lastUpdateMs: elapsed,
            emaUpdateMs: this.emaUpdateMs,
            lastFrameSkipped: false,
            frameCount: this.frameCount,
            skippedFrameCount: this.skippedFrameCount,
            activeWindowCount: activeFrontierMetrics.activeWindowCount,
            transitionTotalCount:
                activeFrontierMetrics.transitionTotalCount
                || cached.wavePlan.orderedTransitionVIds.length,
            promotedToActiveCount: activeFrontierMetrics.promotedToActiveCount,
            demotedToSettledCount: activeFrontierMetrics.demotedToSettledCount,
            transitionSpriteWrites: activeFrontierMetrics.transitionSpriteWrites,
            fastPathUsed: activeFrontierMetrics.fastPathUsed,
            fallbackReason: activeFrontierMetrics.fallbackReason,
            planWorkerPending: perfTransitionState.requestedPlanPending,
            holdingForPlan: progressState.holdingForPlan,
            visualTransitionActive: progressState.usingVisualTransition,
            visibleFrameState: perfTransitionState.visibleFrameState,
            clockSource: perfTransitionState.clockSource,
            activeTransitionDurationMs:
                input.activeTransition?.durationMs ?? null,
            activeTransitionStartedAtMs:
                input.activeTransition?.startedAtMs ?? null,
            schedulerRawProgress: input.activeTransition?.progress ?? null,
            rawProgress,
            easedProgress: progress,
            localVisualTransitionDurationMs:
                this.activeVisualTransition?.durationMs ?? null,
            requestedPlanPending: perfTransitionState.requestedPlanPending,
            flipTimeMin: frontierDiagnostics.min,
            flipTimeP25: frontierDiagnostics.p25,
            flipTimeP50: frontierDiagnostics.p50,
            flipTimeP75: frontierDiagnostics.p75,
            flipTimeP95: frontierDiagnostics.p95,
            flipTimeMax: frontierDiagnostics.max,
            flipTimeBins: frontierDiagnostics.bins,
            frontierVisibleStartProgress:
                frontierDiagnostics.visibleStartProgress,
            frontierVisibleEndProgress:
                frontierDiagnostics.visibleEndProgress,
            frontierVisibleLifetimeProgress:
                frontierDiagnostics.visibleLifetimeProgress,
            frontierVisibleLifetimeMs:
                frontierDiagnostics.visibleLifetimeProgress !== null
                    ? frontierDiagnostics.visibleLifetimeProgress *
                      (progressState.usingVisualTransition
                          ? Math.max(
                                1,
                                this.activeVisualTransition?.durationMs ?? 0,
                            )
                          : Math.max(1, input.activeTransition?.durationMs ?? 0))
                    : null,
            renderCacheMode: this.steadyTextureCacheActive
                ? 'steady_texture'
                : 'live_vectors',
        });

        return { container: this.root };
    }

    dispose(): void {
        this.sessionKey = null;
        this.resetState();
        this.planWorker?.terminate();
        this.planWorker = null;
        this.graphics.clear();
        this.hideUnusedSprites(this.nativeSprites, 0);
        this.hideUnusedSprites(this.transitionSprites, 0);
        this.hideUnusedSprites(this.settledPrevSprites, 0);
        this.hideUnusedSprites(this.activePrevSprites, 0);
        this.hideUnusedSprites(this.settledNextSprites, 0);
        this.hideUnusedSprites(this.activeNextSprites, 0);
        this.root.removeChildren();
        this.root.addChild(this.graphics);
        this.root.addChild(this.nativeSpriteLayer);
        this.root.addChild(this.transitionSpriteLayer);
        this.root.addChild(this.settledPrevSpriteLayer);
        this.root.addChild(this.activePrevSpriteLayer);
        this.root.addChild(this.settledNextSpriteLayer);
        this.root.addChild(this.activeNextSpriteLayer);
    }
}

export function createMetaballGridFamily(colorUtils: ColorUtils): MetaballGridFamily {
    return new MetaballGridFamily(colorUtils, DEFAULT_METABALL_GRID_VARIANT);
}

export function createMetaballGridPhaseEdgesVariantFamily(
    colorUtils: ColorUtils,
): MetaballGridFamily {
    return new MetaballGridFamily(colorUtils, PHASE_EDGE_METABALL_GRID_VARIANT);
}
