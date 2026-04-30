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
 * - `NEXT` geometry = `input.geometry` (the current live `CanonicalGeometrySnapshot`).
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
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarState } from '$lib/types/game.types';
import { adjustColorHSL, blendColors } from '$lib/utils/colorUtils';
import { getTerritoryVisualEpoch } from '$lib/territory/bumpTerritoryVisualConfig';
import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
import { buildPerimeterFieldRenderFamilyGeometry } from '../buildFamilyGeometry';
import type {
    RenderFamily,
    RenderFamilyInput,
    RenderFamilyOutput,
    RenderFamilyTransitionSession,
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
} from './metaballGridRuntime';
import type {
    MetaballGridPlanWorkerRequest,
    MetaballGridPlanWorkerResponse,
} from './metaballGridPlanWorkerTypes';
import { planGridWave } from './planGridWave';
import { renderMetaballGridScene } from './renderMetaballGridScene';
import {
    metaballGridPhaseEdgesGeometryDefaults,
    metaballGridPhaseEdgesModeDefaults,
} from './config';
import {
    computeSharedBoundaryCornerRadius,
    trimOpenPolylineEndpoints,
} from './edgeShaping';
import {
    resetMetaballGridStats,
    updateMetaballGridStats,
} from './metaballGridStats';

// ─── Tunable option unions (mirror METABALL_GRID_* keys) ──────────────────────

type GridCellShape = 'square' | 'circle' | 'diamond' | 'hex';
type GridBorderMode = 'off' | 'per_cell' | 'territory_edge';

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
] as const;

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
function revertStarsWithEvents(
    stars: ReadonlyArray<StarState>,
    events: ReadonlyArray<{ event: { starId: string; previousOwner: string } }>,
): StarState[] {
    const overrides = new Map<string, string>();
    for (const entry of events) {
        overrides.set(entry.event.starId, entry.event.previousOwner);
    }
    return stars.map((star) => {
        const ownerId = overrides.get(star.id);
        return ownerId === undefined ? { ...star } : { ...star, ownerId };
    });
}

/** Reverted star set: star ownership reset to each event's `previousOwner`. */
function revertStarsForTransition(input: RenderFamilyInput): StarState[] {
    return revertStarsWithEvents(input.stars, input.activeTransition?.events ?? []);
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
    return input.activeTransition?.sessionKey ?? null;
}

function buildSessionKey(input: RenderFamilyInput): string {
    const starIds = [...input.stars]
        .map((s) => s.id)
        .sort((a, b) => a.localeCompare(b))
        .join('|');
    return `${input.world.width}x${input.world.height}:${starIds}`;
}

interface CachedPlan {
    readonly planKey: string;
    readonly classification: GridClassification;
    readonly wavePlan: GridWavePlan;
    readonly prevGeometry: CanonicalGeometrySnapshot;
    readonly classificationBuildMs: number;
    readonly wavePlanBuildMs: number;
    readonly planBuildMs: number;
    /**
     * Reference to the NEXT geometry the plan was built against. When upstream
     * caches invalidate (e.g. a territory source-shaping knob edit yields a
     * new snapshot object), we detect the reference change and rebuild.
     */
    readonly nextGeometryRef: CanonicalGeometrySnapshot;
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
    readonly prevGeometry: CanonicalGeometrySnapshot;
    readonly nextGeometryRef: CanonicalGeometrySnapshot;
}

interface CapturedTransitionSession extends RenderFamilyTransitionSession {
    readonly prevGeometry: CanonicalGeometrySnapshot;
    readonly nextGeometry: CanonicalGeometrySnapshot;
    readonly prevOwnedStars: readonly GridOwnedStar[];
    readonly nextOwnedStars: readonly GridOwnedStar[];
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

const EMPTY_FLIP_TIME_BINS = {
    '0-0.1': 0,
    '0.1-0.25': 0,
    '0.25-0.5': 0,
    '0.5-0.75': 0,
    '0.75-1': 0,
} as const;

function applyFlipTimeJitter(
    wavePlan: GridWavePlan,
    jitterAmount: number,
): GridWavePlan {
    if (jitterAmount <= 0 || wavePlan.flipTimeByVId.size === 0) {
        return wavePlan;
    }
    const shifted = new Map<string, number>();
    for (const [vId, t] of wavePlan.flipTimeByVId) {
        const jitter = (hash01(vId) * 2 - 1) * jitterAmount;
        const next = t + jitter;
        shifted.set(vId, next < 0 ? 0 : next > 1 ? 1 : next);
    }
    return {
        perEvent: wavePlan.perEvent,
        flipTimeByVId: shifted,
        orderedTransitionVIds: wavePlan.orderedTransitionVIds,
        orderedFlipTimes: wavePlan.orderedFlipTimes,
    };
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

/**
 * RenderFamily implementation for metaball-grid.
 */
export class MetaballGridPhaseEdgesFamily implements RenderFamily {
    readonly id = 'metaball_grid_phase_edges';
    readonly label = 'Metaball Grid Phase Edges';
    readonly tunableKeys: readonly string[] = METABALL_GRID_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    private readonly graphics = new PIXI.Graphics();
    private readonly nativeSpriteLayer = new PIXI.Container();
    private readonly transitionSpriteLayer = new PIXI.Container();
    private readonly nativeSprites: PIXI.Sprite[] = [];
    private readonly transitionSprites: PIXI.Sprite[] = [];
    private readonly colorUtils: ColorUtils;
    private sessionKey: string | null = null;
    private cachedPlan: CachedPlan | null = null;
    private readonly transitionPlanCache = new Map<string, CachedPlan>();
    private readonly capturedTransitionSessions = new Map<
        string,
        CapturedTransitionSession
    >();
    private committedGeometry: CanonicalGeometrySnapshot | null = null;
    private committedOwnedStars: GridOwnedStar[] = [];
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

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
        this.root.addChild(this.graphics);
        this.nativeSpriteLayer.visible = false;
        this.transitionSpriteLayer.visible = false;
        this.root.addChild(this.nativeSpriteLayer);
        this.root.addChild(this.transitionSpriteLayer);
    }

    /** PIXI root used by the canvas to mount/unmount this family's output. */
    get displayRoot(): PIXI.Container {
        return this.root;
    }

    getDebugSnapshot(): Record<string, unknown> | null {
        return this.lastDebugSnapshot;
    }

    private resetState(): void {
        this.cachedPlan = null;
        this.transitionPlanCache.clear();
        this.capturedTransitionSessions.clear();
        this.committedGeometry = null;
        this.committedOwnedStars = [];
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
        resetMetaballGridStats();
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

    private commitPendingWorkerPlan(): boolean {
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
            classificationBuildMs: response.classificationBuildMs,
            wavePlanBuildMs: response.wavePlanBuildMs,
            planBuildMs: response.planBuildMs,
            nextGeometryRef: meta.nextGeometryRef,
        };
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
        prevGeometry: CanonicalGeometrySnapshot;
        nextGeometryRef: CanonicalGeometrySnapshot;
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
    }): CanonicalGeometrySnapshot {
        const { input, settings } = params;
        const revertedStars = revertStarsForTransition(input);
        return buildPerimeterFieldRenderFamilyGeometry({
            stars: revertedStars,
            lanes: input.lanes,
            worldWidth: input.world.width,
            worldHeight: input.world.height,
            nowMs: input.nowMs,
            geometrySource: settings.geometrySource,
        });
    }

    private syncCapturedTransitionSessions(params: {
        input: RenderFamilyInput;
        settings: MetaballGridPlanSettings;
        currentGeometry: CanonicalGeometrySnapshot;
    }): readonly CapturedTransitionSession[] {
        const { input } = params;
        const sessions = input.transitionSessions ?? [];
        const activeKeys = new Set<string>();
        const nextOwnedStars = toOwnedStars(input.stars);
        const captured: CapturedTransitionSession[] = [];
        let capturePrevGeometry = this.committedGeometry ?? input.prevGeometry ?? null;
        let capturePrevOwnedStars =
            this.committedOwnedStars.length > 0
                ? this.committedOwnedStars.map((star) => ({ ...star }))
                : null;

        for (const session of sessions) {
            activeKeys.add(session.sessionKey);
            const existing = this.capturedTransitionSessions.get(session.sessionKey);
            if (existing) {
                const updated: CapturedTransitionSession = {
                    ...existing,
                    ...session,
                };
                this.capturedTransitionSessions.set(session.sessionKey, updated);
                captured.push(updated);
                capturePrevGeometry = updated.nextGeometry;
                capturePrevOwnedStars = updated.nextOwnedStars.map((star) => ({
                    ...star,
                }));
                continue;
            }

            const fallbackRevertedStars = revertStarsWithEvents(
                input.stars,
                session.events,
            );
            const prevOwnedStars =
                capturePrevOwnedStars && capturePrevOwnedStars.length > 0
                    ? capturePrevOwnedStars.map((star) => ({ ...star }))
                    : toOwnedStars(fallbackRevertedStars);
            const prevGeometry = capturePrevGeometry
                ?? buildPerimeterFieldRenderFamilyGeometry({
                    stars: fallbackRevertedStars,
                    lanes: input.lanes,
                    worldWidth: input.world.width,
                    worldHeight: input.world.height,
                    nowMs: input.nowMs,
                    geometrySource: params.settings.geometrySource,
                });
            const truth: CapturedTransitionSession = {
                ...session,
                prevGeometry,
                nextGeometry: params.currentGeometry,
                prevOwnedStars,
                nextOwnedStars: nextOwnedStars.map((star) => ({ ...star })),
            };
            this.capturedTransitionSessions.set(session.sessionKey, truth);
            captured.push(truth);
            capturePrevGeometry = truth.nextGeometry;
            capturePrevOwnedStars = truth.nextOwnedStars.map((star) => ({
                ...star,
            }));
        }

        for (const key of [...this.capturedTransitionSessions.keys()]) {
            if (!activeKeys.has(key)) {
                this.capturedTransitionSessions.delete(key);
            }
        }
        for (const key of [...this.transitionPlanCache.keys()]) {
            if (!activeKeys.has(key)) {
                this.transitionPlanCache.delete(key);
            }
        }

        this.committedGeometry = params.currentGeometry;
        this.committedOwnedStars = nextOwnedStars.map((star) => ({ ...star }));

        return captured;
    }

    private buildPlanForCapturedSession(params: {
        input: RenderFamilyInput;
        planKey: string;
        settings: MetaballGridPlanSettings;
        session: CapturedTransitionSession;
    }): CachedPlan {
        const { input, planKey, settings, session } = params;
        const conquestEvents = session.conquestEvents;
        const starById = new Map<string, StarState>();
        for (const s of input.stars) starById.set(s.id, s);
        const resolveStarPosition = (starId: string) => {
            const s = starById.get(starId);
            return s ? { x: s.x, y: s.y } : null;
        };

        const classificationStartMs = performance.now();
        const classification = buildGridClassification({
            world: { width: input.world.width, height: input.world.height },
            spacingPx: settings.spacingPx,
            originMode: settings.originMode,
            prevGeometry: session.prevGeometry,
            nextGeometry: session.nextGeometry,
            conquestEvents,
            resolveStarPosition,
            prevOwnedStars: session.prevOwnedStars,
            nextOwnedStars: session.nextOwnedStars,
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
            prevGeometry: session.prevGeometry,
            classificationBuildMs,
            wavePlanBuildMs,
            planBuildMs: classificationBuildMs + wavePlanBuildMs,
            nextGeometryRef: session.nextGeometry,
        };
    }

    private buildDebugSnapshot(params: {
        input: RenderFamilyInput;
        cached: CachedPlan;
        ownerIdByColorIdx: ReadonlyArray<string>;
        scene: GridMetaballScene;
        rawProgress: number;
        progress: number;
        flipTransition: GridFlipTransition;
        flipWindow: number;
        skipped: boolean;
        rebuiltPlan: boolean;
    }): Record<string, unknown> {
        const {
            input,
            cached,
            ownerIdByColorIdx,
            scene,
            rawProgress,
            progress,
            flipTransition,
            flipWindow,
            skipped,
            rebuiltPlan,
        } = params;
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
            sessionKey: this.sessionKey,
            planKey: cached.planKey,
            tick: input.gameTick ?? null,
            paused: input.paused ?? false,
            activeTransitionEventCount: input.activeTransition?.events.length ?? 0,
            rawProgress,
            progress,
            flipTransition,
            flipWindow,
            rebuiltPlan,
            skipped,
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
        currentGeometry: CanonicalGeometrySnapshot;
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
            world: { width: input.world.width, height: input.world.height },
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
            classificationBuildMs,
            wavePlanBuildMs,
            planBuildMs: classificationBuildMs + wavePlanBuildMs,
            nextGeometryRef: currentGeometry,
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
        currentGeometry: CanonicalGeometrySnapshot;
        planKey: string;
        settings: MetaballGridPlanSettings;
    }): CachedPlan {
        const { input, currentGeometry, planKey, settings } = params;
        const ownedStars = toOwnedStars(input.stars);

        const classificationStartMs = performance.now();
        const classification = buildGridClassification({
            world: { width: input.world.width, height: input.world.height },
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
            classificationBuildMs,
            wavePlanBuildMs,
            planBuildMs: classificationBuildMs + wavePlanBuildMs,
            nextGeometryRef: currentGeometry,
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
        let rebuiltPlan = this.commitPendingWorkerPlan();

        const currentGeometry = input.geometry;
        if (!currentGeometry) {
            this.root.visible = false;
            resetMetaballGridStats();
            return { container: this.root };
        }

        const enabled = readTunableBoolean(
            input,
            'METABALL_GRID_ENABLED',
            GAME_CONFIG.METABALL_GRID_ENABLED ??
                (GAME_CONFIG.TERRITORY_RENDER_MODE === 'metaball_grid'),
        );
        if (!enabled) {
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
            this.transitionPlanCache.clear();
        }
        this.lastPlanParamsKey = planParamsKey;

        const transitionKey = buildTransitionKey(input);
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
                metaballGridPhaseEdgesModeDefaults.METABALL_GRID_WAVE_GEOMETRY,
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
        const transitionSessions = this.syncCapturedTransitionSessions({
            input,
            settings,
            currentGeometry,
        });
        const steadyPlanKey = buildMetaballGridPlanKey({
            transitionKey: 'steady',
            geometryVersion: currentGeometry.version,
            geometrySource: settings.geometrySource,
            spacingPx: settings.spacingPx,
            originMode: settings.originMode,
            distribution: settings.distribution,
            positionJitter: settings.positionJitter,
            maxCells: settings.maxCells,
        });
        const activeSessionPlans: Array<{
            session: CapturedTransitionSession;
            plan: CachedPlan;
        }> = [];

        // Rebuild the plan when the plan key or input geometry reference changes.
        // The extra geometry-reference checks preserve the Phase C behavior:
        // if GameCanvas invalidates and recomputes PREV/NEXT geometry without a
        // new conquest key, this family still rebuilds against the new truth.
        const prevGeoRef = null;
        if (transitionSessions.length > 0) {
            if (
                !this.cachedPlan
                || this.cachedPlan.planKey !== steadyPlanKey
                || this.cachedPlan.nextGeometryRef !== currentGeometry
            ) {
                this.cachedPlan = this.buildSteadyStatePlan({
                    input,
                    currentGeometry,
                    planKey: steadyPlanKey,
                    settings,
                });
                rebuiltPlan = true;
            }

            for (const session of transitionSessions) {
                const sessionPlanKey = buildMetaballGridPlanKey({
                    transitionKey: session.sessionKey,
                    geometryVersion: `${session.prevGeometry.version}->${session.nextGeometry.version}`,
                    geometrySource: settings.geometrySource,
                    spacingPx: settings.spacingPx,
                    originMode: settings.originMode,
                    distribution: settings.distribution,
                    positionJitter: settings.positionJitter,
                    maxCells: settings.maxCells,
                    adjacency: settings.adjacency,
                    waveGeometry: settings.waveGeometry,
                    waveSeeding: settings.waveSeeding,
                });
                let sessionPlan = this.transitionPlanCache.get(session.sessionKey) ?? null;
                if (
                    !sessionPlan
                    || sessionPlan.planKey !== sessionPlanKey
                    || sessionPlan.prevGeometry !== session.prevGeometry
                    || sessionPlan.nextGeometryRef !== session.nextGeometry
                ) {
                    sessionPlan = this.buildPlanForCapturedSession({
                        input,
                        planKey: sessionPlanKey,
                        settings,
                        session,
                    });
                    this.transitionPlanCache.set(session.sessionKey, sessionPlan);
                    rebuiltPlan = true;
                }
                activeSessionPlans.push({
                    session,
                    plan: sessionPlan,
                });
            }
        } else if (transitionKey) {
            const planKey = buildMetaballGridPlanKey({
                transitionKey,
                geometryVersion: currentGeometry.version,
                geometrySource: settings.geometrySource,
                spacingPx: settings.spacingPx,
                originMode: settings.originMode,
                distribution: settings.distribution,
                positionJitter: settings.positionJitter,
                maxCells: settings.maxCells,
                adjacency: settings.adjacency,
                waveGeometry: settings.waveGeometry,
                waveSeeding: settings.waveSeeding,
            });
            if (
                !this.cachedPlan
                || this.cachedPlan.planKey !== planKey
                || this.cachedPlan.nextGeometryRef !== currentGeometry
                || (prevGeoRef !== null && this.cachedPlan.prevGeometry !== prevGeoRef)
            ) {
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
                if (!scheduled || !this.cachedPlan) {
                    this.cachedPlan = this.buildPlanForTransition({
                        input,
                        currentGeometry,
                        planKey,
                        settings,
                    });
                    rebuiltPlan = true;
                }
            }
        } else {
            this.transitionPlanCache.clear();
            if (
                !this.cachedPlan
                || this.cachedPlan.planKey !== steadyPlanKey
                || this.cachedPlan.nextGeometryRef !== currentGeometry
            ) {
                const ownedStars = toOwnedStars(input.stars);
                const workerRequest = this.buildWorkerRequest({
                    input,
                    planKey: steadyPlanKey,
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
                        planKey: steadyPlanKey,
                        settings,
                    });
                    rebuiltPlan = true;
                }
            }
        }

        const cached = this.cachedPlan;
        if (!cached) {
            this.root.visible = false;
            resetMetaballGridStats();
            return { container: this.root };
        }
        const rawProgress = input.activeTransition?.progress ?? 1;

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
        const strength = 1.0;
        const inwardOffsetPx = readTunableNumber(
            input,
            'METABALL_GRID_INWARD_OFFSET_PX',
            GAME_CONFIG.METABALL_GRID_INWARD_OFFSET_PX ?? 0,
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
            metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BORDER_MODE,
            ['off', 'per_cell', 'territory_edge'],
        );
        const borderBlend = readTunableBoolean(
            input,
            'METABALL_GRID_BORDER_BLEND',
            metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BORDER_BLEND,
        );
        const sharedEdgeSmoothingPasses = Math.max(
            0,
            Math.min(
                4,
                Math.round(
                    readTunableNumber(
                        input,
                        'METABALL_GRID_EDGE_SMOOTHING_PASSES',
                        metaballGridPhaseEdgesModeDefaults.METABALL_GRID_EDGE_SMOOTHING_PASSES,
                    ),
                ),
            ),
        );
        const edgeTrimPx = Math.max(
            0,
            readTunableNumber(
                input,
                'METABALL_GRID_EDGE_TRIM_PX',
                metaballGridPhaseEdgesModeDefaults.METABALL_GRID_EDGE_TRIM_PX,
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
                        metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BORDER_CHAIKIN_PASSES,
                    ),
                ),
            ),
        );
        const totalBorderChaikinPasses = Math.max(
            0,
            Math.min(6, sharedEdgeSmoothingPasses + borderChaikinPasses),
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
        for (const sessionPlan of activeSessionPlans) {
            for (const entry of sessionPlan.session.events) {
                ensureOwner(entry.event.previousOwner);
                ensureOwner(entry.event.newOwner);
            }
        }
        if (activeSessionPlans.length === 0) {
            for (const entry of input.activeTransition?.events ?? []) {
                ensureOwner(entry.event.previousOwner);
                ensureOwner(entry.event.newOwner);
            }
        }
        const ownerIdByColorIdx = new Array<string>(fillHexByColorIdx.length);
        for (const [ownerId, idx] of ownerColorIdx.entries()) {
            ownerIdByColorIdx[idx] = ownerId;
        }
        const suppressedBaseVIds = new Set<string>();
        for (const { plan } of activeSessionPlans) {
            for (const vId of plan.classification.byRole.dispossessed) {
                suppressedBaseVIds.add(vId);
            }
            for (const vId of plan.classification.byRole.emergent) {
                suppressedBaseVIds.add(vId);
            }
            for (const vId of plan.classification.byRole.vacating) {
                suppressedBaseVIds.add(vId);
            }
        }
        const suppressedBaseSig = activeSessionPlans
            .map(({ plan }) => plan.planKey)
            .join('||');
        const captureDebug = shouldCaptureMetaballGridDebug();
        const effectiveConfigSource =
            input.configSource ??
            (GAME_CONFIG as unknown as Readonly<Record<string, unknown>>);
        const disconnectEnabled = Boolean(
            effectiveConfigSource.MODIFIED_VORONOI_DISCONNECT_ENABLED ??
                metaballGridPhaseEdgesGeometryDefaults.MODIFIED_VORONOI_DISCONNECT_ENABLED,
        );
        const disconnectDistance = Number(
            effectiveConfigSource.MODIFIED_VORONOI_DISCONNECT_DISTANCE ??
                metaballGridPhaseEdgesGeometryDefaults.MODIFIED_VORONOI_DISCONNECT_DISTANCE,
        );
        const dxWeight = Number(
            effectiveConfigSource.TERRITORY_DX_WEIGHT ??
                metaballGridPhaseEdgesGeometryDefaults.TERRITORY_DX_WEIGHT,
        );
        const easedProgress = easeProgress(waveEase, rawProgress);
        const transitionSessionCount = activeSessionPlans.length;
        const transitionTotalCount = activeSessionPlans.reduce(
            (total, { plan }) => total + plan.wavePlan.orderedTransitionVIds.length,
            0,
        );
        const activeWindowCount = activeSessionPlans.reduce((total, { session, plan }) => {
            const sessionProgress = easeProgress(waveEase, session.rawProgress);
            return (
                total +
                plan.wavePlan.orderedFlipTimes.filter(
                    (flipTime) =>
                        sessionProgress >= flipTime - flipWindow / 2 &&
                        sessionProgress <= flipTime + flipWindow / 2,
                ).length
            );
        }, 0);
        const phaseEdgesStatsPatch = {
            familyId: this.id,
            familyLabel: this.label,
            geometrySource:
                typeof effectiveConfigSource.PERIMETER_FIELD_GEOMETRY_SOURCE === 'string'
                    ? effectiveConfigSource.PERIMETER_FIELD_GEOMETRY_SOURCE
                    : null,
            waveGeometry: settings.waveGeometry,
            waveSeeding: settings.waveSeeding,
            borderMode,
            borderBlend,
            edgeSmoothingPasses: sharedEdgeSmoothingPasses,
            edgeTrimPx,
            borderChaikinPasses,
            disconnectEnabled,
            disconnectDistance: Number.isFinite(disconnectDistance)
                ? disconnectDistance
                : metaballGridPhaseEdgesGeometryDefaults.MODIFIED_VORONOI_DISCONNECT_DISTANCE,
            dxWeight: Number.isFinite(dxWeight)
                ? dxWeight
                : metaballGridPhaseEdgesGeometryDefaults.TERRITORY_DX_WEIGHT,
            transitionEventCount:
                input.activeTransition?.events.length ??
                input.transitionSessions?.reduce(
                    (count, session) => count + session.events.length,
                    0,
                ) ??
                0,
            planWorkerPending: false,
            holdingForPlan: false,
            visualTransitionActive: transitionSessionCount > 0,
            visibleFrameState: transitionSessionCount > 0 ? 'fallback_plan' : 'steady',
            clockSource: transitionSessionCount > 0 ? 'scheduler' : 'none',
            renderCacheMode: 'live_vectors',
            activeWindowCount,
            transitionTotalCount,
            promotedToActiveCount: 0,
            demotedToSettledCount: 0,
            transitionSpriteWrites: 0,
            fastPathUsed: false,
            fallbackReason:
                transitionSessionCount > 0 ? 'session_overlay_renderer' : 'steady_scene',
            activeTransitionDurationMs: input.activeTransition?.durationMs ?? null,
            activeTransitionStartedAtMs: input.activeTransition?.startedAtMs ?? null,
            schedulerRawProgress: input.activeTransition?.rawProgress ?? null,
            rawProgress: input.activeTransition ? rawProgress : null,
            easedProgress: input.activeTransition ? easedProgress : null,
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
        } as const;

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
        const activeSessionPaintSig = activeSessionPlans
            .map(
                ({ session, plan }) =>
                    `${plan.planKey}@${quantProgress(session.rawProgress)}`,
            )
            .join('||');
        const paintSig = [
            this.sessionKey ?? '',
            cached.planKey,
            activeSessionPaintSig,
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
            palFillSig,
            palBorderSig,
        ].join('|');

        const allowPaintSkip = !input.activeTransition;
        if (allowPaintSkip && !rebuiltPlan && this.lastPaintSig === paintSig) {
            this.frameCount += 1;
            this.skippedFrameCount += 1;
            const elapsed = performance.now() - startMs;
            this.emaUpdateMs = this.emaUpdateMs === 0
                ? elapsed
                : this.emaUpdateMs * 0.9 + elapsed * 0.1;
            updateMetaballGridStats({
                ...phaseEdgesStatsPatch,
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
            });
            if (captureDebug && this.lastDebugSnapshot) {
                this.lastDebugSnapshot = {
                    ...this.lastDebugSnapshot,
                    tick: input.gameTick ?? null,
                    paused: input.paused ?? false,
                    rawProgress,
                    progress: easeProgress(waveEase, rawProgress),
                    flipTransition,
                    flipWindow,
                    rebuiltPlan: false,
                    skipped: true,
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
        const sceneStartMs = performance.now();
        const sceneCells = renderMetaballGridScene({
            classification: cached.classification,
            wavePlan: applyFlipTimeJitter(cached.wavePlan, flipTimeJitter),
            progress: activeSessionPlans.length > 0 ? 1 : progress,
            flipTransition,
            flipWindow,
            strength,
            inwardOffsetPx,
            ownerColorIdx,
            omitVIds: suppressedBaseVIds.size > 0 ? suppressedBaseVIds : undefined,
        }).cells.slice();
        for (const { session, plan } of activeSessionPlans) {
            const sessionProgress = easeProgress(waveEase, session.rawProgress);
            const overlay = renderMetaballGridScene({
                classification: plan.classification,
                wavePlan: applyFlipTimeJitter(plan.wavePlan, flipTimeJitter),
                progress: sessionProgress,
                flipTransition,
                flipWindow,
                strength,
                inwardOffsetPx,
                ownerColorIdx,
                includeNativeCells: false,
            });
            sceneCells.push(...overlay.cells);
        }
        const scene: GridMetaballScene = {
            progress,
            cells: sceneCells,
            flipTransition,
        };
        const sceneBuildMs = performance.now() - sceneStartMs;

        // ── Paint: one shape per scene cell. O(N). ──────────────────────────
        const paintStartMs = performance.now();
        const g = this.graphics;
        g.clear();
        const spacingPx = cached.classification.spacingPx;
        // Clamp inset so a cell never collapses to 0. Non-native cells get an
        // extra `inwardOffsetPx` added to the inset, so ownership-boundary
        // cells read visually smaller than interior-territory cells — this is
        // the semantic the "Inward Offset" knob advertises.
        const insetMax = spacingPx * 0.45;
        const nativeInset = Math.min(cellInsetPx, insetMax);
        const boundaryInset = Math.min(
            cellInsetPx + Math.max(0, inwardOffsetPx) + edgeTrimPx,
            insetMax,
        );
        // Defaults for square shape at native inset — reused inside the loop
        // when a cell is native. Boundary cells recompute.
        const nativeSize = spacingPx - nativeInset * 2;
        const nativeHalf = nativeSize * 0.5;
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

        // Build an effective per-grid-index colorIdx so both "per-cell stroke
        // gating" and "centered blended edge drawing" read the same truth.
        // Populated from scene cells — so during transitions the boundary
        // follows whichever side is currently dominant.
        const cols = cached.classification.cols;
        const rows = cached.classification.rows;
        const vstarCount = cached.classification.vstars.length;
        let effectiveColorIdxByGridIdx: Int32Array | null = null;
        if (
            !canUseSplitFillOnlyFastPath &&
            (inwardOffsetPx > 0 || (drawBorders && drawTerritoryEdgeOnly))
        ) {
            effectiveColorIdxByGridIdx = new Int32Array(vstarCount);
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
            suppressedBaseSig,
            palFillSig,
        ].join('|');

        g.visible = !canUseSplitFillOnlyFastPath;
        this.nativeSpriteLayer.visible = canUseSplitFillOnlyFastPath;
        this.transitionSpriteLayer.visible = canUseSplitFillOnlyFastPath;

        if (canUseSplitFillOnlyFastPath) {
            if (this.lastSplitNativeSig !== nativeLayerSig) {
                let nativeCount = 0;
                for (let i = 0; i < cached.classification.vstars.length; i++) {
                    const v = cached.classification.vstars[i];
                    if (v.role === 'native' && !suppressedBaseVIds.has(v.id)) {
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
                    if (v.role !== 'native' || suppressedBaseVIds.has(v.id)) continue;
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
            let transitionCount = 0;
            for (let i = 0; i < scene.cells.length; i++) {
                const c = scene.cells[i];
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
            for (let i = 0; i < scene.cells.length; i++) {
                const c = scene.cells[i];
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
            g.clear();
        } else {
            this.lastSplitNativeSig = null;
            this.hideUnusedSprites(this.nativeSprites, 0);
            this.hideUnusedSprites(this.transitionSprites, 0);
            g.clear();
            for (let i = 0; i < scene.cells.length; i++) {
                const c = scene.cells[i];
                if (c.alpha <= 0) continue;
                const fillHex = fillHexByColorIdx[c.colorIdx];
                if (fillHex === undefined) continue;
                const alpha = c.alpha * fillAlphaMult;
                if (alpha <= 0) continue;

                // Numeric grid indices are carried directly on the scene cell so
                // the hot paint loop does not need to parse `g:${ix}:${iy}` ids.
                const ix = c.ix;
                const iy = c.iy;

                // Trust the scene cell's (x, y) — classification already applied
                // any distribution-driven row shift (hex_offset) or jitter. A
                // previous revision double-shifted odd rows here when cellShape
                // was 'hex', which misaligned fill vs. border polylines.
                const x = c.x;
                const y = c.y;

                // Boundary cells (anything but 'native') get the inward-offset
                // inset so the visible territory edge recedes from its classified
                // extent. Pointy-top hex "radius" is vertex-to-center distance;
                // honeycomb interlock for hex cells is produced by the
                // `hex_offset` distribution (row shift applied in classification).
                const isBoundary = c.role !== 'native';
                const half = isBoundary ? boundaryHalf : nativeHalf;
                const size = isBoundary ? boundarySize : nativeSize;
                const cornerR = isBoundary ? boundaryCornerR : nativeCornerR;
                const hexR = isBoundary ? boundaryHexR : nativeHexR;

                drawFilledGridCell(
                    g,
                    cellShape,
                    x,
                    y,
                    half,
                    size,
                    cornerR,
                    hexR,
                    fillHex,
                    alpha,
                );

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
                if (cellShape === 'circle') {
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
        if (!canUseSplitFillOnlyFastPath && drawBlendedEdges && effectiveColorIdxByGridIdx) {
            const originOffset = cached.classification.originMode === 'centered' ? spacingPx * 0.5 : 0;
            const trueHalf = spacingPx * 0.5;
            // Vertex grid is (cols+1) × (rows+1); vertex id = ivy * vCols + ivx.
            const vCols = cols + 1;
            const vertexX = (vid: number): number => {
                const ivx = vid % vCols;
                return ivx * spacingPx + originOffset - trueHalf;
            };
            const vertexY = (vid: number): number => {
                const ivx = vid % vCols;
                const ivy = (vid - ivx) / vCols;
                return ivy * spacingPx + originOffset - trueHalf;
            };

            // Edge buckets by "min|max" colour-idx pair.
            interface BoundaryEdge {
                readonly v0: number;
                readonly v1: number;
            }
            const edgesByPair = new Map<string, BoundaryEdge[]>();
            const pushEdge = (a: number, b: number, v0: number, v1: number): void => {
                const lo = a < b ? a : b;
                const hi = a < b ? b : a;
                const key = `${lo}|${hi}`;
                let list = edgesByPair.get(key);
                if (!list) {
                    list = [];
                    edgesByPair.set(key, list);
                }
                list.push({ v0, v1 });
            };

            for (let iy = 0; iy < rows; iy++) {
                for (let ix = 0; ix < cols; ix++) {
                    const selfIdx = effectiveColorIdxByGridIdx[iy * cols + ix];
                    if (selfIdx < 0) continue;
                    // Right neighbour → vertical shared edge,
                    // vertex (ix+1, iy) → vertex (ix+1, iy+1).
                    if (ix + 1 < cols) {
                        const rIdx = effectiveColorIdxByGridIdx[iy * cols + ix + 1];
                        if (rIdx >= 0 && rIdx !== selfIdx) {
                            pushEdge(
                                selfIdx,
                                rIdx,
                                iy * vCols + (ix + 1),
                                (iy + 1) * vCols + (ix + 1),
                            );
                        }
                    }
                    // Bottom neighbour → horizontal shared edge,
                    // vertex (ix, iy+1) → vertex (ix+1, iy+1).
                    if (iy + 1 < rows) {
                        const dIdx = effectiveColorIdxByGridIdx[(iy + 1) * cols + ix];
                        if (dIdx >= 0 && dIdx !== selfIdx) {
                            pushEdge(
                                selfIdx,
                                dIdx,
                                (iy + 1) * vCols + ix,
                                (iy + 1) * vCols + (ix + 1),
                            );
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
                const adj = new Map<number, Array<[number, number]>>();
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

                const drawChain = (vertexChain: number[], closed: boolean): void => {
                    if (vertexChain.length < 2) return;
                    let pts: number[] = [];
                    for (const vid of vertexChain) {
                        pts.push(vertexX(vid), vertexY(vid));
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
                const walkFrom = (startVertex: number): number[] => {
                    const chain: number[] = [startVertex];
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
                    const chain: number[] = [v0, v1];
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
        this.frameCount += 1;
        let paintedCells = 0;
        for (let i = 0; i < scene.cells.length; i++) {
            if (scene.cells[i].alpha > 0) paintedCells++;
        }
        const paintMs = performance.now() - paintStartMs;
        const elapsed = performance.now() - startMs;
        this.emaUpdateMs = this.emaUpdateMs === 0
            ? elapsed
            : this.emaUpdateMs * 0.9 + elapsed * 0.1;
        if (captureDebug) {
            this.lastDebugSnapshot = this.buildDebugSnapshot({
                input,
                cached,
                ownerIdByColorIdx,
                scene,
                rawProgress,
                progress,
                flipTransition,
                flipWindow,
                skipped: false,
                rebuiltPlan,
            });
        }
        updateMetaballGridStats({
            ...phaseEdgesStatsPatch,
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
        this.root.removeChildren();
        this.root.addChild(this.graphics);
        this.root.addChild(this.nativeSpriteLayer);
        this.root.addChild(this.transitionSpriteLayer);
    }
}

export function createMetaballGridPhaseEdgesFamily(
    colorUtils: ColorUtils,
): MetaballGridPhaseEdgesFamily {
    return new MetaballGridPhaseEdgesFamily(colorUtils);
}
