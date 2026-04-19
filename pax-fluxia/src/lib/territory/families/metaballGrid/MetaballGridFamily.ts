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
import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
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
    GridOriginMode,
    GridOwnedStar,
    GridWaveGeometry,
    GridWavePlan,
    GridWaveSeeding,
} from './metaballGridTypes';
import { planGridWave } from './planGridWave';
import { renderMetaballGridScene } from './renderMetaballGridScene';
import { resetMetaballGridStats, updateMetaballGridStats } from './metaballGridStats';

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
    'METABALL_GRID_STRENGTH',
    'METABALL_GRID_INWARD_OFFSET_PX',
    'METABALL_GRID_CELL_SHAPE',
    'METABALL_GRID_CELL_INSET_PX',
    'METABALL_GRID_CELL_CORNER_PX',
    'METABALL_GRID_BORDER_MODE',
    'METABALL_GRID_BORDER_BLEND',
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
    return `${input.world.width}x${input.world.height}:${starIds}`;
}

interface CachedPlan {
    readonly transitionKey: string;
    readonly classification: GridClassification;
    readonly wavePlan: GridWavePlan;
    readonly prevGeometry: CanonicalGeometrySnapshot;
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

/**
 * RenderFamily implementation for metaball-grid.
 */
export class MetaballGridFamily implements RenderFamily {
    readonly id = 'metaball_grid';
    readonly label = 'Metaball Grid';
    readonly tunableKeys: readonly string[] = METABALL_GRID_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    private readonly graphics = new PIXI.Graphics();
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
    /** EMA of per-update wall-clock time (ms). Seeded lazily. */
    private emaUpdateMs = 0;
    private frameCount = 0;
    private skippedFrameCount = 0;

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
        this.root.addChild(this.graphics);
    }

    /** PIXI root used by the canvas to mount/unmount this family's output. */
    get displayRoot(): PIXI.Container {
        return this.root;
    }

    private resetState(): void {
        this.cachedPlan = null;
        this.lastPaintSig = null;
        this.lastPlanParamsKey = null;
        this.emaUpdateMs = 0;
        this.frameCount = 0;
        this.skippedFrameCount = 0;
        resetMetaballGridStats();
    }

    private buildPlanForTransition(params: {
        input: RenderFamilyInput;
        currentGeometry: CanonicalGeometrySnapshot;
        transitionKey: string;
    }): CachedPlan {
        const { input, currentGeometry, transitionKey } = params;

        // PREV = rebuild from reverted stars using the same underlayer as NEXT.
        const revertedStars = revertStarsForTransition(input);
        const prevGeometry = buildPerimeterFieldRenderFamilyGeometry({
            stars: revertedStars,
            lanes: input.lanes,
            worldWidth: input.world.width,
            worldHeight: input.world.height,
            nowMs: input.nowMs,
            geometrySource:
                (input.tunables.get('PERIMETER_FIELD_GEOMETRY_SOURCE') as string | undefined) ?? null,
        });

        const spacingPx = Math.max(
            2,
            readTunableNumber(input, 'METABALL_GRID_SPACING_PX', GAME_CONFIG.METABALL_GRID_SPACING_PX ?? 24),
        );
        const originMode = readTunableString<GridOriginMode>(
            input,
            'METABALL_GRID_ORIGIN_MODE',
            (GAME_CONFIG.METABALL_GRID_ORIGIN_MODE as GridOriginMode | undefined) ?? 'centered',
            ['centered', 'corner'],
        );
        const adjacency = readTunableString<GridAdjacency>(
            input,
            'METABALL_GRID_ADJACENCY',
            (GAME_CONFIG.METABALL_GRID_ADJACENCY as GridAdjacency | undefined) ?? '8',
            ['4', '8'],
        );
        const waveGeometry = readTunableString<GridWaveGeometry>(
            input,
            'METABALL_GRID_WAVE_GEOMETRY',
            (GAME_CONFIG.METABALL_GRID_WAVE_GEOMETRY as GridWaveGeometry | undefined) ?? 'grid_bfs',
            ['grid_bfs', 'euclidean_band'],
        );
        const waveSeeding = readTunableString<GridWaveSeeding>(
            input,
            'METABALL_GRID_WAVE_SEEDING',
            (GAME_CONFIG.METABALL_GRID_WAVE_SEEDING as GridWaveSeeding | undefined) ?? 'winner_natives',
            ['winner_natives', 'conquered_star_center', 'winner_nearest_edge'],
        );
        const distribution = readTunableString<GridDistribution>(
            input,
            'METABALL_GRID_DISTRIBUTION',
            (GAME_CONFIG.METABALL_GRID_DISTRIBUTION as GridDistribution | undefined) ?? 'square',
            ['square', 'hex_offset', 'jittered'],
        );
        const positionJitter = readTunableNumber(
            input,
            'METABALL_GRID_POSITION_JITTER',
            GAME_CONFIG.METABALL_GRID_POSITION_JITTER ?? 0,
        );
        const maxCells = readTunableNumber(
            input,
            'METABALL_GRID_MAX_CELLS',
            GAME_CONFIG.METABALL_GRID_MAX_CELLS ?? 0,
        );

        const conquestEvents = (input.activeTransition?.conquestEvents ?? []);
        const starById = new Map<string, StarState>();
        for (const s of input.stars) starById.set(s.id, s);
        const resolveStarPosition = (starId: string) => {
            const s = starById.get(starId);
            return s ? { x: s.x, y: s.y } : null;
        };

        const revertedOwnedStars = toOwnedStars(revertedStars);
        const currentOwnedStars = toOwnedStars(input.stars);

        const classification = buildGridClassification({
            world: { width: input.world.width, height: input.world.height },
            spacingPx,
            originMode,
            prevGeometry,
            nextGeometry: currentGeometry,
            conquestEvents,
            resolveStarPosition,
            prevOwnedStars: revertedOwnedStars,
            nextOwnedStars: currentOwnedStars,
            maxCells,
            distribution,
            positionJitter,
        });
        const wavePlan = planGridWave({
            classification,
            seeding: waveSeeding,
            geometry: waveGeometry,
            adjacency,
            conquestEvents,
            resolveStarPosition,
        });

        return { transitionKey, classification, wavePlan, prevGeometry };
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
    }): CachedPlan {
        const { input, currentGeometry } = params;

        const spacingPx = Math.max(
            2,
            readTunableNumber(input, 'METABALL_GRID_SPACING_PX', GAME_CONFIG.METABALL_GRID_SPACING_PX ?? 48),
        );
        const originMode = readTunableString<GridOriginMode>(
            input,
            'METABALL_GRID_ORIGIN_MODE',
            (GAME_CONFIG.METABALL_GRID_ORIGIN_MODE as GridOriginMode | undefined) ?? 'centered',
            ['centered', 'corner'],
        );
        const distribution = readTunableString<GridDistribution>(
            input,
            'METABALL_GRID_DISTRIBUTION',
            (GAME_CONFIG.METABALL_GRID_DISTRIBUTION as GridDistribution | undefined) ?? 'square',
            ['square', 'hex_offset', 'jittered'],
        );
        const positionJitter = readTunableNumber(
            input,
            'METABALL_GRID_POSITION_JITTER',
            GAME_CONFIG.METABALL_GRID_POSITION_JITTER ?? 0,
        );
        const maxCells = readTunableNumber(
            input,
            'METABALL_GRID_MAX_CELLS',
            GAME_CONFIG.METABALL_GRID_MAX_CELLS ?? 0,
        );
        const ownedStars = toOwnedStars(input.stars);

        const classification = buildGridClassification({
            world: { width: input.world.width, height: input.world.height },
            spacingPx,
            originMode,
            prevGeometry: currentGeometry,
            nextGeometry: currentGeometry,
            conquestEvents: [],
            prevOwnedStars: ownedStars,
            nextOwnedStars: ownedStars,
            maxCells,
            distribution,
            positionJitter,
        });
        const wavePlan = planGridWave({
            classification,
            seeding: 'winner_natives',
            geometry: 'grid_bfs',
            adjacency: '8',
            conquestEvents: [],
        });
        return {
            transitionKey: 'steady',
            classification,
            wavePlan,
            prevGeometry: currentGeometry,
        };
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        const startMs = performance.now();
        const nextSessionKey = buildSessionKey(input);
        if (this.sessionKey !== nextSessionKey) {
            this.sessionKey = nextSessionKey;
            this.resetState();
        }

        const currentGeometry = input.geometry;
        if (!currentGeometry) {
            this.root.visible = false;
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

        // Rebuild the plan only when (transitionKey, session) changes. Per-frame
        // work is scoped to the scene builder.
        if (transitionKey) {
            if (!this.cachedPlan || this.cachedPlan.transitionKey !== transitionKey) {
                this.cachedPlan = this.buildPlanForTransition({
                    input,
                    currentGeometry,
                    transitionKey,
                });
            }
        } else {
            if (!this.cachedPlan || this.cachedPlan.transitionKey !== 'steady') {
                this.cachedPlan = this.buildSteadyStatePlan({
                    input,
                    currentGeometry,
                });
            }
        }

        const cached = this.cachedPlan;
        const rawProgress = input.activeTransition?.progress ?? 1;

        // ── Transition / flip knobs ──────────────────────────────────────────
        const flipTransition = readTunableString<GridFlipTransition>(
            input,
            'METABALL_GRID_FLIP_TRANSITION',
            (GAME_CONFIG.METABALL_GRID_FLIP_TRANSITION as GridFlipTransition | undefined) ?? 'hard',
            ['hard', 'lerp_per_cell', 'dual_pass_blend'],
        );
        const flipWindow = Math.max(
            0,
            readTunableNumber(input, 'METABALL_GRID_FLIP_WINDOW', GAME_CONFIG.METABALL_GRID_FLIP_WINDOW ?? 0.06),
        );
        const strength = Math.max(
            0,
            readTunableNumber(input, 'METABALL_GRID_STRENGTH', GAME_CONFIG.METABALL_GRID_STRENGTH ?? 1.0),
        );
        const inwardOffsetPx = readTunableNumber(
            input,
            'METABALL_GRID_INWARD_OFFSET_PX',
            GAME_CONFIG.METABALL_GRID_INWARD_OFFSET_PX ?? 0,
        );
        const waveEase = readTunableString<GridWaveEase>(
            input,
            'METABALL_GRID_WAVE_EASE',
            (GAME_CONFIG.METABALL_GRID_WAVE_EASE as GridWaveEase | undefined) ?? 'linear',
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
            (GAME_CONFIG.METABALL_GRID_BORDER_MODE as GridBorderMode | undefined) ?? 'off',
            ['off', 'per_cell', 'territory_edge'],
        );
        const borderBlend = readTunableBoolean(
            input,
            'METABALL_GRID_BORDER_BLEND',
            GAME_CONFIG.METABALL_GRID_BORDER_BLEND ?? true,
        );
        const borderChaikinPasses = Math.max(
            0,
            Math.min(
                4,
                Math.round(
                    readTunableNumber(
                        input,
                        'METABALL_GRID_BORDER_CHAIKIN_PASSES',
                        GAME_CONFIG.METABALL_GRID_BORDER_CHAIKIN_PASSES ?? 0,
                    ),
                ),
            ),
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
        for (const entry of input.activeTransition?.events ?? []) {
            ensureOwner(entry.event.previousOwner);
            ensureOwner(entry.event.newOwner);
        }

        // ── Dirty-flag paint gate (MG-PERF Phase A) ─────────────────────────
        // Build a signature from every input that can change the painted
        // output. When the signature matches the last frame's, the existing
        // PIXI.Graphics draw list is still valid — skip scene build + paint.
        // Progress is quantized to PROGRESS_QUANT_STEPS so sub-step progress
        // changes don't thrash the gate.
        const palFillSig = fillHexByColorIdx.join(',');
        const palBorderSig = borderHexByColorIdx.join(',');
        const paintSig = [
            this.sessionKey ?? '',
            cached.transitionKey,
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

        if (this.lastPaintSig === paintSig) {
            this.frameCount += 1;
            this.skippedFrameCount += 1;
            const elapsed = performance.now() - startMs;
            this.emaUpdateMs = this.emaUpdateMs === 0
                ? elapsed
                : this.emaUpdateMs * 0.9 + elapsed * 0.1;
            updateMetaballGridStats({
                requestedSpacingPx: cached.classification.requestedSpacingPx,
                effectiveSpacingPx: cached.classification.spacingPx,
                totalCells: cached.classification.cols * cached.classification.rows,
                emittableCells: cached.classification.emittableVstars.length,
                lastUpdateMs: elapsed,
                emaUpdateMs: this.emaUpdateMs,
                lastFrameSkipped: true,
                frameCount: this.frameCount,
                skippedFrameCount: this.skippedFrameCount,
            });
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
            : { perEvent: cached.wavePlan.perEvent, flipTimeByVId: jitteredFlipTimeByVId };

        const scene = renderMetaballGridScene({
            classification: cached.classification,
            wavePlan: wavePlanForScene,
            progress,
            flipTransition,
            flipWindow,
            strength,
            inwardOffsetPx,
            ownerColorIdx,
        });

        // ── Paint: one shape per scene cell. O(N). ──────────────────────────
        const g = this.graphics;
        g.clear();
        const spacingPx = cached.classification.spacingPx;
        // Clamp inset so a cell never collapses to 0.
        const effInset = Math.min(cellInsetPx, spacingPx * 0.45);
        const size = spacingPx - effInset * 2;
        const half = size * 0.5;
        const cornerR = cellShape === 'square' ? Math.min(cellCornerPx, half) : 0;
        const drawBorders = borderMode !== 'off' && borderWidth > 0 && borderAlpha > 0;
        const drawTerritoryEdgeOnly = borderMode === 'territory_edge';
        const drawBlendedEdges = drawBorders && drawTerritoryEdgeOnly && borderBlend;

        // Build an effective per-grid-index colorIdx so both "per-cell stroke
        // gating" and "centered blended edge drawing" read the same truth.
        // Populated from scene cells — so during transitions the boundary
        // follows whichever side is currently dominant.
        const cols = cached.classification.cols;
        const rows = cached.classification.rows;
        const vstarCount = cached.classification.vstars.length;
        let effectiveColorIdxByGridIdx: Int32Array | null = null;
        if (drawBorders && drawTerritoryEdgeOnly) {
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
                const parts = c.vId.split(':');
                if (parts.length !== 3) continue;
                const ix = Number(parts[1]);
                const iy = Number(parts[2]);
                if (!Number.isFinite(ix) || !Number.isFinite(iy)) continue;
                if (ix < 0 || ix >= cols || iy < 0 || iy >= rows) continue;
                effectiveColorIdxByGridIdx[iy * cols + ix] = c.colorIdx;
            }
        }

        // Pointy-top hex "radius" (vertex-to-center distance). Bound to `size`
        // so METABALL_GRID_CELL_INSET_PX shrinks hexes uniformly. At inset=0
        // the horizontal pitch (hexR * sqrt(3)) equals spacingPx, producing
        // clean tessellation along rows; adjacent rows are offset by
        // spacingPx/2 for honeycomb interlock.
        const hexR = size / SQRT3;

        // Per-cell fill + (for per_cell and territory_edge non-blend) per-cell stroke.
        for (let i = 0; i < scene.cells.length; i++) {
            const c = scene.cells[i];
            if (c.alpha <= 0) continue;
            const fillHex = fillHexByColorIdx[c.colorIdx];
            if (fillHex === undefined) continue;
            const alpha = c.alpha * fillAlphaMult;
            if (alpha <= 0) continue;

            // Parse grid indices once — used by hex odd-row offset and by the
            // territory_edge per-cell stroke gate.
            const vIdParts = c.vId.split(':');
            let ix = -1;
            let iy = -1;
            if (vIdParts.length === 3) {
                const pix = Number(vIdParts[1]);
                const piy = Number(vIdParts[2]);
                if (Number.isFinite(pix)) ix = pix;
                if (Number.isFinite(piy)) iy = piy;
            }

            const x = c.x;
            const y = c.y;
            const hexXOffset = cellShape === 'hex' && (iy & 1) === 1 ? spacingPx * 0.5 : 0;
            const xHex = x + hexXOffset;

            // Fill primitive
            if (cellShape === 'circle') {
                g.circle(x, y, half).fill({ color: fillHex, alpha });
            } else if (cellShape === 'diamond') {
                g.poly([x, y - half, x + half, y, x, y + half, x - half, y]).fill({
                    color: fillHex,
                    alpha,
                });
            } else if (cellShape === 'hex') {
                const pts: number[] = [];
                for (let k = 0; k < 6; k++) {
                    pts.push(
                        xHex + HEX_VERTICES_POINTY[k][0] * hexR,
                        y + HEX_VERTICES_POINTY[k][1] * hexR,
                    );
                }
                g.poly(pts).fill({ color: fillHex, alpha });
            } else if (cornerR > 0) {
                g.roundRect(x - half, y - half, size, size, cornerR).fill({
                    color: fillHex,
                    alpha,
                });
            } else {
                g.rect(x - half, y - half, size, size).fill({ color: fillHex, alpha });
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
            if (cellShape === 'circle') {
                g.circle(x, y, half).stroke(strokeOpts);
            } else if (cellShape === 'diamond') {
                g.poly([x, y - half, x + half, y, x, y + half, x - half, y]).stroke(strokeOpts);
            } else if (cellShape === 'hex') {
                const pts: number[] = [];
                for (let k = 0; k < 6; k++) {
                    pts.push(
                        xHex + HEX_VERTICES_POINTY[k][0] * hexR,
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
        if (drawBlendedEdges && effectiveColorIdxByGridIdx) {
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
                    if (borderChaikinPasses > 0) {
                        pts = chaikinSmooth(pts, borderChaikinPasses, closed);
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

        // Silence unused-var lint for `inwardOffsetPx` — it is intentionally
        // read + passed to the scene builder but the builder currently leaves
        // positions unchanged (see renderMetaballGridScene docstring). Keeping
        // the plumbing makes MG9 debug overlay work straightforward.
        void inwardOffsetPx;

        // ── Record paint-sig + stats (MG-PERF Phase A) ──────────────────────
        this.lastPaintSig = paintSig;
        this.frameCount += 1;
        let paintedCells = 0;
        for (let i = 0; i < scene.cells.length; i++) {
            if (scene.cells[i].alpha > 0) paintedCells++;
        }
        const elapsed = performance.now() - startMs;
        this.emaUpdateMs = this.emaUpdateMs === 0
            ? elapsed
            : this.emaUpdateMs * 0.9 + elapsed * 0.1;
        updateMetaballGridStats({
            requestedSpacingPx: cached.classification.requestedSpacingPx,
            effectiveSpacingPx: cached.classification.spacingPx,
            totalCells: cached.classification.cols * cached.classification.rows,
            emittableCells: cached.classification.emittableVstars.length,
            paintedCells,
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
        this.graphics.clear();
        this.root.removeChildren();
        this.root.addChild(this.graphics);
    }
}

export function createMetaballGridFamily(colorUtils: ColorUtils): MetaballGridFamily {
    return new MetaballGridFamily(colorUtils);
}
