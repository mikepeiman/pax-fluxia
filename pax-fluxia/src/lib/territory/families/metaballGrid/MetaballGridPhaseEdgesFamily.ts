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
import {
    compileHighShaderGlProgram,
    localUniformBitGl,
} from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import {
    applyTerritoryFrontierFxFieldToFill,
    buildTerritoryFrontierFxSampleField,
    buildOwnershipGridFrontierDistanceField,
    buildTerritoryFrontierPresentation,
    createOwnershipGridFrontierDistanceFieldBuffers,
    computeVisibleSquareBoundsFromDistance,
    isTerritoryFrontierFxActive,
    resolveTerritoryFrontierSurfaceRecipe,
    TERRITORY_FRONTIER_TUNABLE_KEYS,
    type TerritoryFrontierBorderGeometryMode,
    type TerritoryFrontierContourLayerResult,
    type OwnershipGridFrontierDistanceFieldBuffers,
    type TerritoryFrontierFxSampleField,
    type TerritoryFrontierJunctionRenderMode,
    type TerritoryFrontierPhaseFieldLayer,
    type TerritoryFrontierPhaseSamplingMode,
    type TerritoryFrontierTechniqueId,
    type TerritoryFrontierTriangleDiagonalPolicy,
} from '$lib/territory/frontier';
import type { StarState } from '$lib/types/game.types';
import { adjustColorHSL, blendColors, hexToRGB } from '$lib/utils/colorUtils';
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
    computeBoundaryOffsetTargetPx,
    computeBoundaryInset,
    computeSharedBoundaryCornerRadius,
    isOwnershipBoundaryCell,
    trimOpenPolylineEndpoints,
} from './edgeShaping';
import {
    recordPerfDuration,
    recordPerfEvent,
} from '$lib/perf/perfProbe';
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
    'METABALL_FILL_ENABLED',
    'METABALL_BORDER_WIDTH',
    'METABALL_BORDER_ALPHA',
    'METABALL_BORDER_ENABLED',
    'METABALL_BORDER_SATURATION',
    'METABALL_BORDER_LIGHTNESS',
    'PERIMETER_FIELD_GEOMETRY_SOURCE', // reused for underlayer selection
    ...TERRITORY_FRONTIER_TUNABLE_KEYS,
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
    return `${input.world.minX ?? 0},${input.world.minY ?? 0}:${input.world.width}x${input.world.height}:${starIds}`;
}

type OuterPerimeterSide = 'left' | 'top' | 'right' | 'bottom';

interface OuterPerimeterInterval {
    readonly start: number;
    readonly end: number;
}

interface OuterPerimeterBounds {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
}

interface VisibleSquareCellBounds {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
}

const OUTER_PERIMETER_EDGE_EPSILON = 0.001;

function addOuterPerimeterInterval(
    intervalsByKey: Map<string, OuterPerimeterInterval[]>,
    side: OuterPerimeterSide,
    ownerIndex: number,
    start: number,
    end: number,
): void {
    if (!(end > start)) return;
    const key = `${side}:${ownerIndex}`;
    let intervals = intervalsByKey.get(key);
    if (!intervals) {
        intervals = [];
        intervalsByKey.set(key, intervals);
    }
    intervals.push({ start, end });
}

function resolveOuterPerimeterBounds(params: {
    classification: GridClassification;
    effectiveColorIdxByGridIdx: Int32Array;
    cellHalfExtent: number;
    cellBoundsByGridIdx?: readonly (VisibleSquareCellBounds | null)[] | null;
}): OuterPerimeterBounds | null {
    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    for (let iy = 0; iy < params.classification.rows; iy++) {
        for (let ix = 0; ix < params.classification.cols; ix++) {
            const gridIndex = iy * params.classification.cols + ix;
            if (params.effectiveColorIdxByGridIdx[gridIndex] < 0) continue;
            const cellBounds = params.cellBoundsByGridIdx?.[gridIndex];
            if (cellBounds) {
                left = Math.min(left, cellBounds.left);
                top = Math.min(top, cellBounds.top);
                right = Math.max(right, cellBounds.right);
                bottom = Math.max(bottom, cellBounds.bottom);
            } else {
                const vstar = params.classification.vstars[gridIndex];
                left = Math.min(left, vstar.x - params.cellHalfExtent);
                top = Math.min(top, vstar.y - params.cellHalfExtent);
                right = Math.max(right, vstar.x + params.cellHalfExtent);
                bottom = Math.max(bottom, vstar.y + params.cellHalfExtent);
            }
        }
    }
    if (
        !Number.isFinite(left) ||
        !Number.isFinite(top) ||
        !Number.isFinite(right) ||
        !Number.isFinite(bottom)
    ) {
        return null;
    }
    return { left, top, right, bottom };
}

function drawOuterPerimeterIntervals(params: {
    borderLayer: PIXI.Graphics;
    classification: GridClassification;
    effectiveColorIdxByGridIdx: Int32Array;
    borderHexByColorIdx: readonly Array<number | undefined>;
    borderAlpha: number;
    borderWidth: number;
    cellHalfExtent: number;
    cellBoundsByGridIdx?: readonly (VisibleSquareCellBounds | null)[] | null;
    markBorderDrawn: () => void;
}): void {
    const bounds = resolveOuterPerimeterBounds({
        classification: params.classification,
        effectiveColorIdxByGridIdx: params.effectiveColorIdxByGridIdx,
        cellHalfExtent: params.cellHalfExtent,
        cellBoundsByGridIdx: params.cellBoundsByGridIdx,
    });
    if (!bounds) return;
    const intervalsByKey = new Map<string, OuterPerimeterInterval[]>();
    const clampX = (value: number): number =>
        Math.max(bounds.left, Math.min(bounds.right, value));
    const clampY = (value: number): number =>
        Math.max(bounds.top, Math.min(bounds.bottom, value));

    for (let iy = 0; iy < params.classification.rows; iy++) {
        for (let ix = 0; ix < params.classification.cols; ix++) {
            const gridIndex = iy * params.classification.cols + ix;
            const ownerIndex = params.effectiveColorIdxByGridIdx[gridIndex];
            if (ownerIndex < 0) continue;
            const cellBounds = params.cellBoundsByGridIdx?.[gridIndex];
            const vstar = params.classification.vstars[gridIndex];
            const left = cellBounds ? cellBounds.left : vstar.x - params.cellHalfExtent;
            const right = cellBounds ? cellBounds.right : vstar.x + params.cellHalfExtent;
            const top = cellBounds ? cellBounds.top : vstar.y - params.cellHalfExtent;
            const bottom = cellBounds ? cellBounds.bottom : vstar.y + params.cellHalfExtent;

            if (
                left <= bounds.left + OUTER_PERIMETER_EDGE_EPSILON &&
                right >= bounds.left - OUTER_PERIMETER_EDGE_EPSILON
            ) {
                addOuterPerimeterInterval(
                    intervalsByKey,
                    'left',
                    ownerIndex,
                    clampY(top),
                    clampY(bottom),
                );
            }
            if (
                top <= bounds.top + OUTER_PERIMETER_EDGE_EPSILON &&
                bottom >= bounds.top - OUTER_PERIMETER_EDGE_EPSILON
            ) {
                addOuterPerimeterInterval(
                    intervalsByKey,
                    'top',
                    ownerIndex,
                    clampX(left),
                    clampX(right),
                );
            }
            if (
                right >= bounds.right - OUTER_PERIMETER_EDGE_EPSILON &&
                left <= bounds.right + OUTER_PERIMETER_EDGE_EPSILON
            ) {
                addOuterPerimeterInterval(
                    intervalsByKey,
                    'right',
                    ownerIndex,
                    clampY(top),
                    clampY(bottom),
                );
            }
            if (
                bottom >= bounds.bottom - OUTER_PERIMETER_EDGE_EPSILON &&
                top <= bounds.bottom + OUTER_PERIMETER_EDGE_EPSILON
            ) {
                addOuterPerimeterInterval(
                    intervalsByKey,
                    'bottom',
                    ownerIndex,
                    clampX(left),
                    clampX(right),
                );
            }
        }
    }

    const insetPx = Math.max(0.5, params.borderWidth * 0.5);
    const strokeOpts = {
        color: 0xffffff,
        alpha: params.borderAlpha,
        width: params.borderWidth,
        cap: 'round' as const,
        join: 'round' as const,
    };

    for (const [key, intervals] of intervalsByKey) {
        if (intervals.length === 0) continue;
        const sep = key.indexOf(':');
        const side = key.slice(0, sep) as OuterPerimeterSide;
        const ownerIndex = Number(key.slice(sep + 1));
        const ownerHex = params.borderHexByColorIdx[ownerIndex];
        if (ownerHex === undefined) continue;
        intervals.sort((a, b) => (a.start - b.start) || (a.end - b.end));
        strokeOpts.color = ownerHex;

        let currentStart = intervals[0].start;
        let currentEnd = intervals[0].end;
        const flush = (): void => {
            if (!(currentEnd > currentStart)) return;
            params.markBorderDrawn();
            switch (side) {
                case 'left':
                    params.borderLayer
                        .moveTo(bounds.left + insetPx, currentStart)
                        .lineTo(bounds.left + insetPx, currentEnd)
                        .stroke(strokeOpts);
                    break;
                case 'top':
                    params.borderLayer
                        .moveTo(currentStart, bounds.top + insetPx)
                        .lineTo(currentEnd, bounds.top + insetPx)
                        .stroke(strokeOpts);
                    break;
                case 'right': {
                    const x = Math.max(bounds.left + insetPx, bounds.right - insetPx);
                    params.borderLayer
                        .moveTo(x, currentStart)
                        .lineTo(x, currentEnd)
                        .stroke(strokeOpts);
                    break;
                }
                case 'bottom': {
                    const y = Math.max(bounds.top + insetPx, bounds.bottom - insetPx);
                    params.borderLayer
                        .moveTo(currentStart, y)
                        .lineTo(currentEnd, y)
                        .stroke(strokeOpts);
                    break;
                }
            }
        };

        for (let i = 1; i < intervals.length; i++) {
            const interval = intervals[i];
            if (interval.start <= currentEnd + 0.01) {
                currentEnd = Math.max(currentEnd, interval.end);
                continue;
            }
            flush();
            currentStart = interval.start;
            currentEnd = interval.end;
        }
        flush();
    }
}

interface CachedPlan {
    readonly planKey: string;
    readonly classification: GridClassification;
    readonly wavePlan: GridWavePlan;
    readonly prevGeometry: CanonicalGeometrySnapshot;
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
    readonly prevGeometry: CanonicalGeometrySnapshot;
    readonly nextGeometryRef: CanonicalGeometrySnapshot;
}

interface CapturedTransitionSession extends RenderFamilyTransitionSession {
    readonly prevGeometry: CanonicalGeometrySnapshot;
    readonly nextGeometry: CanonicalGeometrySnapshot;
    readonly prevOwnedStars: readonly GridOwnedStar[];
    readonly nextOwnedStars: readonly GridOwnedStar[];
}

interface ActiveSessionPlan {
    readonly session: CapturedTransitionSession;
    readonly plan: CachedPlan;
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

interface FrontierRenderLayerSource {
    readonly id: string;
    readonly label: string;
    readonly plan: CachedPlan;
    readonly eventIndex: number;
    readonly previousOwnerId: string | null;
    readonly nextOwnerId: string | null;
    readonly threshold: number;
}

interface FrontierShaderLayerState {
    readonly textureSource: PIXI.BufferImageSource;
    readonly texture: PIXI.Texture;
    readonly shader: PIXI.Shader;
    readonly mesh: PIXI.Mesh;
    buffer: Uint8Array;
    cols: number;
    rows: number;
    originX: number;
    originY: number;
    cellSizePx: number;
}

const frontierFillBitGl = {
    name: 'territory-frontier-fill-bit',
    vertex: {
        header: /* glsl */ `
            out vec2 vUV;
        `,
        main: /* glsl */ `
            vUV = uv;
        `,
    },
    fragment: {
        header: /* glsl */ `
            #version 300 es
            in vec2 vUV;
            uniform sampler2D uPhaseTexture;
            uniform float uThreshold;
            uniform float uSoftness;
            uniform float uFillAlpha;
            uniform vec3 uFillColor;
        `,
        main: /* glsl */ `
            vec4 sampleColor = texture(uPhaseTexture, vUV);
            if (sampleColor.a <= 0.001) {
                discard;
            }
            float phase = sampleColor.r;
            float reveal = uSoftness > 0.001
                ? smoothstep(uThreshold - uSoftness, uThreshold + uSoftness, phase)
                : step(uThreshold, phase);
            float alpha = reveal * uFillAlpha;
            if (alpha <= 0.001) {
                discard;
            }
            outColor = vec4(uFillColor * alpha, alpha);
        `,
    },
};

const frontierBandBitGl = {
    name: 'territory-frontier-band-bit',
    vertex: {
        header: /* glsl */ `
            out vec2 vUV;
        `,
        main: /* glsl */ `
            vUV = uv;
        `,
    },
    fragment: {
        header: /* glsl */ `
            #version 300 es
            in vec2 vUV;
            uniform sampler2D uPhaseTexture;
            uniform float uThreshold;
            uniform float uBandWidth;
            uniform float uSoftness;
            uniform float uFrontierAlpha;
            uniform vec3 uFrontierColor;
        `,
        main: /* glsl */ `
            vec4 sampleColor = texture(uPhaseTexture, vUV);
            if (sampleColor.a <= 0.001) {
                discard;
            }
            float phase = sampleColor.r;
            float inner = max(0.0, uBandWidth - uSoftness);
            float outer = max(inner + 0.0001, uBandWidth + uSoftness);
            float band = 1.0 - smoothstep(inner, outer, abs(phase - uThreshold));
            float alpha = band * uFrontierAlpha;
            if (alpha <= 0.001) {
                discard;
            }
            outColor = vec4(uFrontierColor * alpha, alpha);
        `,
    },
};

let cachedFrontierFillProgram: ReturnType<typeof compileHighShaderGlProgram> | null = null;
let cachedFrontierBandProgram: ReturnType<typeof compileHighShaderGlProgram> | null = null;

function getFrontierFillProgram() {
    if (!cachedFrontierFillProgram) {
        cachedFrontierFillProgram = compileHighShaderGlProgram({
            bits: [localUniformBitGl, frontierFillBitGl],
            name: 'territory-frontier-fill',
        });
    }
    return cachedFrontierFillProgram;
}

function getFrontierBandProgram() {
    if (!cachedFrontierBandProgram) {
        cachedFrontierBandProgram = compileHighShaderGlProgram({
            bits: [localUniformBitGl, frontierBandBitGl],
            name: 'territory-frontier-band',
        });
    }
    return cachedFrontierBandProgram;
}

function colorHexToVec3(hex: number): Float32Array {
    return new Float32Array([
        ((hex >> 16) & 0xff) / 255,
        ((hex >> 8) & 0xff) / 255,
        (hex & 0xff) / 255,
    ]);
}

function averageHexColors(hexes: readonly number[]): number {
    if (hexes.length === 0) return 0xffffff;
    let r = 0;
    let g = 0;
    let b = 0;
    for (const hex of hexes) {
        const [cr, cg, cb] = hexToRGB(hex);
        r += cr;
        g += cg;
        b += cb;
    }
    return (
        (Math.round(r / hexes.length) << 16) |
        (Math.round(g / hexes.length) << 8) |
        Math.round(b / hexes.length)
    );
}

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
export class MetaballGridPhaseEdgesFamily implements RenderFamily {
    readonly id: string;
    readonly label: string;
    readonly tunableKeys: readonly string[] = METABALL_GRID_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    private readonly graphics = new PIXI.Graphics();
    private readonly frontierFillMeshLayer = new PIXI.Container();
    private readonly borderGraphics = new PIXI.Graphics();
    private readonly frontierGraphics = new PIXI.Graphics();
    private readonly frontierMeshLayer = new PIXI.Container();
    private readonly nativeSpriteLayer = new PIXI.Container();
    private readonly transitionSpriteLayer = new PIXI.Container();
    private readonly nativeSprites: PIXI.Sprite[] = [];
    private readonly transitionSprites: PIXI.Sprite[] = [];
    private readonly frontierFillShaderLayers: FrontierShaderLayerState[] = [];
    private readonly frontierShaderLayers: FrontierShaderLayerState[] = [];
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
    private effectiveColorIdxScratch: Int32Array | null = null;
    private visibleSquareBoundsScratch:
        | Array<VisibleSquareCellBounds | null>
        | null = null;
    private frontierDistanceFieldBuffers:
        | OwnershipGridFrontierDistanceFieldBuffers
        | null = null;
    private frontierFxSampleField: TerritoryFrontierFxSampleField | null = null;
    private readonly ownerOccupancyScratchByColor = new Map<number, Float32Array>();
    private readonly ownerOccupancyViewByColor = new Map<number, Float32Array>();
    private readonly ownerOccupancyActiveColors: number[] = [];
    private ownerOccupancyScratchSize = 0;
    private lastSceneOwnerOccupancyBuildMs = 0;
    private lastSceneOwnerOccupancyActiveColorCount = 0;
    private lastSceneOwnerOccupancyCellCount = 0;
    private lastSceneOwnerLayerBuildMs = 0;
    private lastScenePairLayerBuildMs = 0;
    private lastSceneSurfacePhaseLayerSourceKind: 'scene_pairs' | 'scene_owners' | 'none' = 'none';
    private lastCapturedSessionPlanBuildMs = 0;
    private capturedSessionPlanRebuildCount = 0;

    constructor(
        colorUtils: ColorUtils,
        mode: { id: string; label: string } = {
            id: 'metaball_grid_phase_edges',
            label: 'Phase Edges',
        },
    ) {
        this.colorUtils = colorUtils;
        this.id = mode.id;
        this.label = mode.label;
        this.root.addChild(this.graphics);
        this.frontierFillMeshLayer.visible = false;
        this.borderGraphics.visible = false;
        this.frontierGraphics.visible = false;
        this.frontierMeshLayer.visible = false;
        this.root.addChild(this.frontierFillMeshLayer);
        this.root.addChild(this.borderGraphics);
        this.root.addChild(this.frontierGraphics);
        this.root.addChild(this.frontierMeshLayer);
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
        this.frontierFillMeshLayer.visible = false;
        this.borderGraphics.clear();
        this.borderGraphics.visible = false;
        this.frontierGraphics.clear();
        this.frontierGraphics.visible = false;
        this.frontierMeshLayer.visible = false;
        this.hideUnusedFrontierFillShaderLayers(0);
        this.hideUnusedFrontierShaderLayers(0);
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
        this.effectiveColorIdxScratch = null;
        this.visibleSquareBoundsScratch = null;
        this.frontierDistanceFieldBuffers = null;
        this.frontierFxSampleField = null;
        this.ownerOccupancyScratchByColor.clear();
        this.ownerOccupancyViewByColor.clear();
        this.ownerOccupancyActiveColors.length = 0;
        this.ownerOccupancyScratchSize = 0;
        this.lastSceneOwnerOccupancyBuildMs = 0;
        this.lastSceneOwnerOccupancyActiveColorCount = 0;
        this.lastSceneOwnerOccupancyCellCount = 0;
        this.lastSceneOwnerLayerBuildMs = 0;
        this.lastScenePairLayerBuildMs = 0;
        this.lastSceneSurfacePhaseLayerSourceKind = 'none';
        this.lastCapturedSessionPlanBuildMs = 0;
        this.capturedSessionPlanRebuildCount = 0;
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

    private prepareOwnerOccupancyScratch(
        size: number,
    ): Map<number, Float32Array> {
        if (this.ownerOccupancyScratchSize !== size) {
            this.ownerOccupancyScratchByColor.clear();
            this.ownerOccupancyViewByColor.clear();
            this.ownerOccupancyActiveColors.length = 0;
            this.ownerOccupancyScratchSize = size;
            return this.ownerOccupancyViewByColor;
        }

        for (const colorIdx of this.ownerOccupancyActiveColors) {
            this.ownerOccupancyScratchByColor.get(colorIdx)?.fill(0);
        }
        this.ownerOccupancyActiveColors.length = 0;
        this.ownerOccupancyViewByColor.clear();
        return this.ownerOccupancyViewByColor;
    }

    private hideUnusedFrontierShaderLayers(fromIndex: number): void {
        for (let i = fromIndex; i < this.frontierShaderLayers.length; i++) {
            this.frontierShaderLayers[i].mesh.visible = false;
        }
    }

    private hideUnusedFrontierFillShaderLayers(fromIndex: number): void {
        for (let i = fromIndex; i < this.frontierFillShaderLayers.length; i++) {
            this.frontierFillShaderLayers[i].mesh.visible = false;
        }
    }

    private ensureFrontierShaderLayer(
        index: number,
        cols: number,
        rows: number,
        originX: number,
        originY: number,
        cellSizePx: number,
    ): FrontierShaderLayerState {
        while (this.frontierShaderLayers.length <= index) {
            const buffer = new Uint8Array(4);
            const textureSource = new PIXI.BufferImageSource({
                resource: buffer,
                width: 1,
                height: 1,
                format: 'rgba8unorm',
                alphaMode: 'no-premultiply-alpha',
                scaleMode: 'nearest',
                autoGarbageCollect: false,
            });
            const texture = new PIXI.Texture({ source: textureSource });
            const shader = new PIXI.Shader({
                glProgram: getFrontierBandProgram(),
                resources: {
                    frontierUniforms: {
                        uThreshold: { value: 0.5, type: 'f32' },
                        uBandWidth: { value: 0.18, type: 'f32' },
                        uSoftness: { value: 0.75, type: 'f32' },
                        uFrontierAlpha: { value: 0.5, type: 'f32' },
                        uFrontierColor: {
                            value: new Float32Array([1, 1, 1]),
                            type: 'vec3<f32>',
                        },
                    },
                    uPhaseTexture: texture.source,
                },
            });
            const geometry = new PIXI.MeshGeometry({
                positions: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
                uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
                indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
                topology: 'triangle-list',
            });
            const mesh = new PIXI.Mesh({ geometry, shader }) as PIXI.Mesh;
            mesh.visible = false;
            this.frontierMeshLayer.addChild(mesh);
            this.frontierShaderLayers.push({
                textureSource,
                texture,
                shader,
                mesh,
                buffer,
                cols: 1,
                rows: 1,
                originX: 0,
                originY: 0,
                cellSizePx: 1,
            });
        }

        const layer = this.frontierShaderLayers[index];
        const needsResize = layer.cols !== cols || layer.rows !== rows;
        if (needsResize) {
            const buffer = new Uint8Array(Math.max(1, cols * rows * 4));
            layer.buffer = buffer;
            layer.textureSource.resource = buffer;
            layer.textureSource.width = Math.max(1, cols);
            layer.textureSource.height = Math.max(1, rows);
            layer.cols = cols;
            layer.rows = rows;
        }
        layer.originX = originX;
        layer.originY = originY;
        layer.cellSizePx = cellSizePx;
        return layer;
    }

    private ensureFrontierFillShaderLayer(
        index: number,
        cols: number,
        rows: number,
        originX: number,
        originY: number,
        cellSizePx: number,
    ): FrontierShaderLayerState {
        while (this.frontierFillShaderLayers.length <= index) {
            const buffer = new Uint8Array(4);
            const textureSource = new PIXI.BufferImageSource({
                resource: buffer,
                width: 1,
                height: 1,
                format: 'rgba8unorm',
                alphaMode: 'no-premultiply-alpha',
                scaleMode: 'nearest',
                autoGarbageCollect: false,
            });
            const texture = new PIXI.Texture({ source: textureSource });
            const shader = new PIXI.Shader({
                glProgram: getFrontierFillProgram(),
                resources: {
                    frontierUniforms: {
                        uThreshold: { value: 0.5, type: 'f32' },
                        uSoftness: { value: 0, type: 'f32' },
                        uFillAlpha: { value: 1, type: 'f32' },
                        uFillColor: {
                            value: new Float32Array([1, 1, 1]),
                            type: 'vec3<f32>',
                        },
                    },
                    uPhaseTexture: texture.source,
                },
            });
            const geometry = new PIXI.MeshGeometry({
                positions: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
                uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
                indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
                topology: 'triangle-list',
            });
            const mesh = new PIXI.Mesh({ geometry, shader }) as PIXI.Mesh;
            mesh.visible = false;
            this.frontierFillMeshLayer.addChild(mesh);
            this.frontierFillShaderLayers.push({
                textureSource,
                texture,
                shader,
                mesh,
                buffer,
                cols: 1,
                rows: 1,
                originX: 0,
                originY: 0,
                cellSizePx: 1,
            });
        }

        const layer = this.frontierFillShaderLayers[index];
        const needsResize = layer.cols !== cols || layer.rows !== rows;
        if (needsResize) {
            const buffer = new Uint8Array(Math.max(1, cols * rows * 4));
            layer.buffer = buffer;
            layer.textureSource.resource = buffer;
            layer.textureSource.width = Math.max(1, cols);
            layer.textureSource.height = Math.max(1, rows);
            layer.cols = cols;
            layer.rows = rows;
        }
        layer.originX = originX;
        layer.originY = originY;
        layer.cellSizePx = cellSizePx;
        return layer;
    }

    private writeFrontierPhaseTexture(
        state: FrontierShaderLayerState,
        phaseLayer: TerritoryFrontierPhaseFieldLayer,
        samplingMode: TerritoryFrontierPhaseSamplingMode,
    ): void {
        state.textureSource.scaleMode = samplingMode;
        const pixelCount = phaseLayer.cols * phaseLayer.rows;
        if (state.buffer.length !== pixelCount * 4) {
            state.buffer = new Uint8Array(pixelCount * 4);
            state.textureSource.resource = state.buffer;
        }
        for (let i = 0; i < pixelCount; i++) {
            const base = i * 4;
            const value = Math.max(0, Math.min(1, phaseLayer.values[i]));
            state.buffer[base] = Math.round(value * 255);
            state.buffer[base + 1] = 0;
            state.buffer[base + 2] = 0;
            state.buffer[base + 3] =
                phaseLayer.validMask && phaseLayer.validMask[i] === 0 ? 0 : 255;
        }
        state.textureSource.update();
        state.mesh.position.set(
            phaseLayer.originX - phaseLayer.cellSizePx * 0.5,
            phaseLayer.originY - phaseLayer.cellSizePx * 0.5,
        );
        state.mesh.scale.set(
            phaseLayer.cols * phaseLayer.cellSizePx,
            phaseLayer.rows * phaseLayer.cellSizePx,
        );
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
            prevGeometryVersion: meta.prevGeometry.version,
            classificationBuildMs: response.classificationBuildMs,
            wavePlanBuildMs: response.wavePlanBuildMs,
            planBuildMs: response.planBuildMs,
            nextGeometryVersion: meta.nextGeometryRef.version,
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
        const startedAt = performance.now();
        const conquestEvents = session.conquestEvents;
        const starById = new Map<string, StarState>();
        for (const s of input.stars) starById.set(s.id, s);
        const resolveStarPosition = (starId: string) => {
            const s = starById.get(starId);
            return s ? { x: s.x, y: s.y } : null;
        };

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
        const totalBuildMs = performance.now() - startedAt;
        this.lastCapturedSessionPlanBuildMs = totalBuildMs;
        recordPerfDuration(
            'territory.phaseEdges.buildPlanForCapturedSession',
            totalBuildMs,
            {
                planKey,
                cols: classification.cols,
                rows: classification.rows,
                eventCount: session.events.length,
                emittableCells: classification.emittableVstars.length,
            },
            startedAt,
        );

        return {
            planKey,
            classification,
            wavePlan,
            prevGeometry: session.prevGeometry,
            prevGeometryVersion: session.prevGeometry.version,
            classificationBuildMs,
            wavePlanBuildMs,
            planBuildMs: totalBuildMs,
            nextGeometryVersion: session.nextGeometry.version,
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
            perf: {
                transitionPlanCacheSize: this.transitionPlanCache.size,
                capturedTransitionSessionCount: this.capturedTransitionSessions.size,
                capturedSessionPlanRebuildCount: this.capturedSessionPlanRebuildCount,
                lastCapturedSessionPlanBuildMs: this.lastCapturedSessionPlanBuildMs,
                lastSceneOwnerOccupancyBuildMs: this.lastSceneOwnerOccupancyBuildMs,
                lastSceneOwnerOccupancyActiveColorCount:
                    this.lastSceneOwnerOccupancyActiveColorCount,
                lastSceneOwnerOccupancyCellCount:
                    this.lastSceneOwnerOccupancyCellCount,
                lastSceneOwnerLayerBuildMs: this.lastSceneOwnerLayerBuildMs,
                lastScenePairLayerBuildMs: this.lastScenePairLayerBuildMs,
                lastSceneSurfacePhaseLayerSourceKind:
                    this.lastSceneSurfacePhaseLayerSourceKind,
                ownerOccupancyScratchColorCount:
                    this.ownerOccupancyScratchByColor.size,
                ownerOccupancyScratchSize: this.ownerOccupancyScratchSize,
                frontierDistanceFieldBufferSize:
                    this.frontierDistanceFieldBuffers
                        ?.leftDistancePxByCell.length ?? 0,
                frontierFxSampleFieldLength:
                    this.frontierFxSampleField?.length ?? 0,
            },
        };
    }

    private readFrontierTechnique(input: RenderFamilyInput): TerritoryFrontierTechniqueId {
        return readTunableString(
            input,
            'TERRITORY_FRONTIER_TECHNIQUE',
            'control',
            [
                'control',
                'shader_frontier_band',
                'marching_squares_midpoint',
                'marching_squares_scalar',
                'marching_triangles_fixed',
                'marching_triangles_checkerboard',
                'marching_triangles_gradient',
            ],
        );
    }

    private readFrontierBorderGeometryMode(
        input: RenderFamilyInput,
    ): TerritoryFrontierBorderGeometryMode {
        return readTunableString(
            input,
            'TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE',
            metaballGridPhaseEdgesModeDefaults.TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE,
            ['shared_edge', 'contour_matched'],
        );
    }

    private readFrontierPhaseSampling(
        input: RenderFamilyInput,
    ): TerritoryFrontierPhaseSamplingMode {
        return readTunableString(
            input,
            'TERRITORY_FRONTIER_PHASE_SAMPLING',
            'nearest',
            ['nearest', 'linear'],
        );
    }

    private readFrontierTriangleDiagonalPolicy(
        input: RenderFamilyInput,
    ): TerritoryFrontierTriangleDiagonalPolicy {
        return readTunableString(
            input,
            'TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY',
            'fixed',
            ['fixed', 'checkerboard', 'gradient'],
        );
    }

    private readFrontierJunctionRenderMode(
        input: RenderFamilyInput,
    ): TerritoryFrontierJunctionRenderMode {
        return readTunableString(
            input,
            'TERRITORY_FRONTIER_JUNCTION_RENDER_MODE',
            GAME_CONFIG.TERRITORY_FRONTIER_JUNCTION_RENDER_MODE ?? 'gap',
            ['gap', 'bubble'],
        );
    }

    private buildFrontierRenderLayerSources(params: {
        input: RenderFamilyInput;
        cached: CachedPlan;
        activeSessionPlans: readonly ActiveSessionPlan[];
        waveEase: GridWaveEase;
    }): FrontierRenderLayerSource[] {
        const sources: FrontierRenderLayerSource[] = [];
        if (params.activeSessionPlans.length > 0) {
            for (const { session, plan } of params.activeSessionPlans) {
                const threshold = easeProgress(params.waveEase, session.rawProgress);
                const eventCount = Math.min(
                    plan.wavePlan.perEvent.length,
                    session.events.length,
                );
                for (let eventIndex = 0; eventIndex < eventCount; eventIndex++) {
                    const event = session.events[eventIndex]?.event;
                    if (!event) continue;
                    sources.push({
                        id: `${session.sessionKey}:${eventIndex}`,
                        label: `${event.previousOwner}->${event.newOwner}`,
                        plan,
                        eventIndex,
                        previousOwnerId: event.previousOwner ?? null,
                        nextOwnerId: event.newOwner ?? null,
                        threshold,
                    });
                }
            }
            return sources;
        }

        const activeEvents = params.input.activeTransition?.events ?? [];
        const eventCount = Math.min(
            params.cached.wavePlan.perEvent.length,
            activeEvents.length,
        );
        for (let eventIndex = 0; eventIndex < eventCount; eventIndex++) {
            const event = activeEvents[eventIndex]?.event;
            if (!event) continue;
            sources.push({
                id: `active:${eventIndex}`,
                label: `${event.previousOwner}->${event.newOwner}`,
                plan: params.cached,
                eventIndex,
                previousOwnerId: event.previousOwner ?? null,
                nextOwnerId: event.newOwner ?? null,
                threshold: easeProgress(
                    params.waveEase,
                    params.input.activeTransition?.rawProgress ?? 0,
                ),
            });
        }
        return sources;
    }

    private buildFrontierPhaseFieldLayers(params: {
        sources: readonly FrontierRenderLayerSource[];
        ownerColorIdx: ReadonlyMap<string, number>;
        flipTimeJitter: number;
    }): TerritoryFrontierPhaseFieldLayer[] {
        const layers: TerritoryFrontierPhaseFieldLayer[] = [];
        for (const source of params.sources) {
            const classification = source.plan.classification;
            const eventPlan = source.plan.wavePlan.perEvent[source.eventIndex];
            if (!eventPlan || eventPlan.flipTimeByVId.size === 0) continue;
            const nextOwnerIndex =
                source.nextOwnerId === null
                    ? undefined
                    : params.ownerColorIdx.get(source.nextOwnerId);
            const previousOwnerIndex =
                source.previousOwnerId === null
                    ? undefined
                    : params.ownerColorIdx.get(source.previousOwnerId);
            if (nextOwnerIndex === undefined || previousOwnerIndex === undefined) {
                continue;
            }

            let minIx = classification.cols;
            let minIy = classification.rows;
            let maxIx = -1;
            let maxIy = -1;
            for (const vId of eventPlan.flipTimeByVId.keys()) {
                const parts = vId.split(':');
                const ix = Number(parts[1]);
                const iy = Number(parts[2]);
                if (!Number.isFinite(ix) || !Number.isFinite(iy)) continue;
                if (ix < minIx) minIx = ix;
                if (iy < minIy) minIy = iy;
                if (ix > maxIx) maxIx = ix;
                if (iy > maxIy) maxIy = iy;
            }
            if (maxIx < minIx || maxIy < minIy) continue;
            minIx = Math.max(0, minIx - 1);
            minIy = Math.max(0, minIy - 1);
            maxIx = Math.min(classification.cols - 1, maxIx + 1);
            maxIy = Math.min(classification.rows - 1, maxIy + 1);

            const cols = maxIx - minIx + 1;
            const rows = maxIy - minIy + 1;
            const values = new Float32Array(cols * rows);
            const ownerIndexByCell = new Int32Array(cols * rows);
            ownerIndexByCell.fill(-1);
            const validMask = new Uint8Array(cols * rows);

            for (let iy = minIy; iy <= maxIy; iy++) {
                for (let ix = minIx; ix <= maxIx; ix++) {
                    const gridIndex = iy * classification.cols + ix;
                    const localIndex = (iy - minIy) * cols + (ix - minIx);
                    const vstar = classification.vstars[gridIndex];
                    const flipTime = eventPlan.flipTimeByVId.get(vstar.id);
                    if (flipTime !== undefined) {
                        const jittered =
                            params.flipTimeJitter > 0
                                ? Math.max(
                                      0,
                                      Math.min(
                                          1,
                                          flipTime +
                                              (hash01(vstar.id) * 2 - 1) *
                                                  params.flipTimeJitter,
                                      ),
                                  )
                                : flipTime;
                        values[localIndex] = jittered;
                        ownerIndexByCell[localIndex] =
                            jittered >= source.threshold
                                ? nextOwnerIndex
                                : previousOwnerIndex;
                        validMask[localIndex] = 1;
                        continue;
                    }

                    const isPreviousNative =
                        vstar.prevOwnerId === source.previousOwnerId &&
                        vstar.nextOwnerId === source.previousOwnerId;
                    const isNextNative =
                        vstar.prevOwnerId === source.nextOwnerId &&
                        vstar.nextOwnerId === source.nextOwnerId;
                    if (isPreviousNative) {
                        values[localIndex] = 0;
                        ownerIndexByCell[localIndex] = previousOwnerIndex;
                        validMask[localIndex] = 1;
                    } else if (isNextNative) {
                        values[localIndex] = 1;
                        ownerIndexByCell[localIndex] = nextOwnerIndex;
                        validMask[localIndex] = 1;
                    }
                }
            }

            let validCount = 0;
            for (let i = 0; i < validMask.length; i++) {
                if (validMask[i] > 0) validCount += 1;
            }
            if (validCount === 0) continue;
            const originIndex = minIy * classification.cols + minIx;
            const origin = classification.vstars[originIndex];
            layers.push({
                id: source.id,
                label: source.label,
                cols,
                rows,
                originX: origin.x,
                originY: origin.y,
                cellSizePx: classification.spacingPx,
                threshold: source.threshold,
                values,
                ownerIndexByCell,
                validMask,
                ownerIndex: nextOwnerIndex,
                opposingOwnerIndex: previousOwnerIndex,
            });
        }
        return layers;
    }

    private buildSceneOwnerOccupancy(params: {
        scene: GridMetaballScene;
        classification: GridClassification;
    }): Map<number, Float32Array> {
        const startedAt = performance.now();
        const cellCount =
            params.classification.cols * params.classification.rows;
        const occupancyByColor = this.prepareOwnerOccupancyScratch(cellCount);
        for (const cell of params.scene.cells) {
            if (cell.alpha <= 0) continue;
            if (
                cell.ix < 0 ||
                cell.ix >= params.classification.cols ||
                cell.iy < 0 ||
                cell.iy >= params.classification.rows
            ) {
                continue;
            }
            let values = this.ownerOccupancyScratchByColor.get(cell.colorIdx);
            if (!values) {
                values = new Float32Array(cellCount);
                this.ownerOccupancyScratchByColor.set(cell.colorIdx, values);
            }
            if (!occupancyByColor.has(cell.colorIdx)) {
                this.ownerOccupancyActiveColors.push(cell.colorIdx);
                occupancyByColor.set(cell.colorIdx, values);
            }
            const index = cell.iy * params.classification.cols + cell.ix;
            values[index] = Math.max(values[index], cell.alpha);
        }
        const elapsed = performance.now() - startedAt;
        this.lastSceneOwnerOccupancyBuildMs = elapsed;
        this.lastSceneOwnerOccupancyActiveColorCount = occupancyByColor.size;
        this.lastSceneOwnerOccupancyCellCount = cellCount;
        recordPerfDuration(
            'territory.phaseEdges.buildSceneOwnerOccupancy',
            elapsed,
            {
                cols: params.classification.cols,
                rows: params.classification.rows,
                sceneCellCount: params.scene.cells.length,
                activeOwnerColors: occupancyByColor.size,
            },
            startedAt,
        );
        return occupancyByColor;
    }

    private buildFrontierPhaseLayersFromOccupancy(params: {
        classification: GridClassification;
        occupancyByColor: ReadonlyMap<number, Float32Array>;
    }): TerritoryFrontierPhaseFieldLayer[] {
        const startedAt = performance.now();
        const layers: TerritoryFrontierPhaseFieldLayer[] = [];
        for (const [colorIdx, values] of params.occupancyByColor) {
            let minIx = params.classification.cols;
            let minIy = params.classification.rows;
            let maxIx = -1;
            let maxIy = -1;
            for (let iy = 0; iy < params.classification.rows; iy++) {
                for (let ix = 0; ix < params.classification.cols; ix++) {
                    const index = iy * params.classification.cols + ix;
                    if (values[index] <= 0) continue;
                    if (ix < minIx) minIx = ix;
                    if (iy < minIy) minIy = iy;
                    if (ix > maxIx) maxIx = ix;
                    if (iy > maxIy) maxIy = iy;
                }
            }
            if (maxIx < minIx || maxIy < minIy) continue;
            minIx = Math.max(0, minIx - 1);
            minIy = Math.max(0, minIy - 1);
            maxIx = Math.min(params.classification.cols - 1, maxIx + 1);
            maxIy = Math.min(params.classification.rows - 1, maxIy + 1);

            const cols = maxIx - minIx + 1;
            const rows = maxIy - minIy + 1;
            const localValues = new Float32Array(cols * rows);
            const ownerIndexByCell = new Int32Array(cols * rows);
            ownerIndexByCell.fill(colorIdx);
            for (let iy = minIy; iy <= maxIy; iy++) {
                for (let ix = minIx; ix <= maxIx; ix++) {
                    const globalIndex = iy * params.classification.cols + ix;
                    const localIndex = (iy - minIy) * cols + (ix - minIx);
                    localValues[localIndex] = values[globalIndex];
                }
            }
            const origin =
                params.classification.vstars[minIy * params.classification.cols + minIx];
            layers.push({
                id: `scene:${colorIdx}`,
                label: `scene:${colorIdx}`,
                cols,
                rows,
                originX: origin.x,
                originY: origin.y,
                cellSizePx: params.classification.spacingPx,
                threshold: 0.5,
                values: localValues,
                ownerIndexByCell,
                ownerIndex: colorIdx,
                opposingOwnerIndex: null,
            });
        }
        const elapsed = performance.now() - startedAt;
        this.lastSceneOwnerLayerBuildMs = elapsed;
        recordPerfDuration(
            'territory.phaseEdges.buildFrontierPhaseLayersFromOccupancy',
            elapsed,
            {
                cols: params.classification.cols,
                rows: params.classification.rows,
                occupancyOwners: params.occupancyByColor.size,
                layerCount: layers.length,
            },
            startedAt,
        );
        return layers;
    }

    private buildSceneFallbackFrontierPhaseLayers(params: {
        scene: GridMetaballScene;
        classification: GridClassification;
    }): TerritoryFrontierPhaseFieldLayer[] {
        return this.buildFrontierPhaseLayersFromOccupancy({
            classification: params.classification,
            occupancyByColor: this.buildSceneOwnerOccupancy(params),
        });
    }

    private buildScenePairFrontierPhaseLayers(params: {
        classification: GridClassification;
        occupancyByColor: ReadonlyMap<number, Float32Array>;
        effectiveColorIdxByGridIdx: Int32Array;
    }): TerritoryFrontierPhaseFieldLayer[] {
        const startedAt = performance.now();
        interface PairCells {
            readonly ownerIndex: number;
            readonly opposingOwnerIndex: number;
            readonly indices: Set<number>;
        }

        const cols = params.classification.cols;
        const rows = params.classification.rows;
        const pairs = new Map<string, PairCells>();
        const pushPairCell = (
            aIndex: number,
            bIndex: number,
            cellIndex: number,
            otherCellIndex: number,
        ): void => {
            if (aIndex < 0 || bIndex < 0 || aIndex === bIndex) return;
            const ownerIndex = Math.min(aIndex, bIndex);
            const opposingOwnerIndex = Math.max(aIndex, bIndex);
            const key = `${ownerIndex}|${opposingOwnerIndex}`;
            let pair = pairs.get(key);
            if (!pair) {
                pair = {
                    ownerIndex,
                    opposingOwnerIndex,
                    indices: new Set<number>(),
                };
                pairs.set(key, pair);
            }
            pair.indices.add(cellIndex);
            pair.indices.add(otherCellIndex);
        };

        for (let iy = 0; iy < rows; iy++) {
            for (let ix = 0; ix < cols; ix++) {
                const cellIndex = iy * cols + ix;
                const selfIndex = params.effectiveColorIdxByGridIdx[cellIndex];
                if (selfIndex < 0) continue;
                if (ix + 1 < cols) {
                    const rightIndex = params.effectiveColorIdxByGridIdx[cellIndex + 1];
                    pushPairCell(selfIndex, rightIndex, cellIndex, cellIndex + 1);
                }
                if (iy + 1 < rows) {
                    const downIndex = params.effectiveColorIdxByGridIdx[cellIndex + cols];
                    pushPairCell(selfIndex, downIndex, cellIndex, cellIndex + cols);
                }
            }
        }

        const layers: TerritoryFrontierPhaseFieldLayer[] = [];
        for (const pair of pairs.values()) {
            const occupancy = params.occupancyByColor.get(pair.ownerIndex);
            if (!occupancy) continue;
            const opposingOccupancy =
                params.occupancyByColor.get(pair.opposingOwnerIndex) ?? null;
            const validGlobal = new Set<number>();
            for (const cellIndex of pair.indices) {
                const ix = cellIndex % cols;
                const iy = (cellIndex - ix) / cols;
                for (let ny = Math.max(0, iy - 1); ny <= Math.min(rows - 1, iy + 1); ny++) {
                    for (let nx = Math.max(0, ix - 1); nx <= Math.min(cols - 1, ix + 1); nx++) {
                        const globalIndex = ny * cols + nx;
                        const dominantOwner = params.effectiveColorIdxByGridIdx[globalIndex];
                        if (
                            dominantOwner === pair.ownerIndex ||
                            dominantOwner === pair.opposingOwnerIndex ||
                            dominantOwner < 0 ||
                            occupancy[globalIndex] > 0 ||
                            (opposingOccupancy && opposingOccupancy[globalIndex] > 0)
                        ) {
                            validGlobal.add(globalIndex);
                        }
                    }
                }
            }
            if (validGlobal.size === 0) continue;

            let minIx = cols;
            let minIy = rows;
            let maxIx = -1;
            let maxIy = -1;
            for (const globalIndex of validGlobal) {
                const ix = globalIndex % cols;
                const iy = (globalIndex - ix) / cols;
                if (ix < minIx) minIx = ix;
                if (iy < minIy) minIy = iy;
                if (ix > maxIx) maxIx = ix;
                if (iy > maxIy) maxIy = iy;
            }
            if (maxIx < minIx || maxIy < minIy) continue;

            const localCols = maxIx - minIx + 1;
            const localRows = maxIy - minIy + 1;
            const values = new Float32Array(localCols * localRows);
            const ownerIndexByCell = new Int32Array(localCols * localRows);
            const validMask = new Uint8Array(localCols * localRows);
            const suppressMask = new Uint8Array(localCols * localRows);
            for (let iy = minIy; iy <= maxIy; iy++) {
                for (let ix = minIx; ix <= maxIx; ix++) {
                    const globalIndex = iy * cols + ix;
                    if (!validGlobal.has(globalIndex)) continue;
                    const localIndex = (iy - minIy) * localCols + (ix - minIx);
                    const value = occupancy[globalIndex];
                    values[localIndex] = value;
                    ownerIndexByCell[localIndex] =
                        value >= 0.5 ? pair.ownerIndex : pair.opposingOwnerIndex;
                    validMask[localIndex] = 1;
                    suppressMask[localIndex] = pair.indices.has(globalIndex) ? 1 : 0;
                }
            }
            const origin = params.classification.vstars[minIy * cols + minIx];
            layers.push({
                id: `pair:${pair.ownerIndex}:${pair.opposingOwnerIndex}`,
                label: `pair:${pair.ownerIndex}:${pair.opposingOwnerIndex}`,
                cols: localCols,
                rows: localRows,
                originX: origin.x,
                originY: origin.y,
                cellSizePx: params.classification.spacingPx,
                threshold: 0.5,
                values,
                ownerIndexByCell,
                validMask,
                suppressMask,
                ownerIndex: pair.ownerIndex,
                opposingOwnerIndex: pair.opposingOwnerIndex,
            });
        }

        const elapsed = performance.now() - startedAt;
        this.lastScenePairLayerBuildMs = elapsed;
        recordPerfDuration(
            'territory.phaseEdges.buildScenePairFrontierPhaseLayers',
            elapsed,
            {
                cols,
                rows,
                occupancyOwners: params.occupancyByColor.size,
                pairCount: pairs.size,
                layerCount: layers.length,
            },
            startedAt,
        );
        return layers;
    }

    private mirrorFrontierPhaseLayer(
        layer: TerritoryFrontierPhaseFieldLayer,
    ): TerritoryFrontierPhaseFieldLayer | null {
        if (layer.ownerIndex === undefined || layer.opposingOwnerIndex == null) {
            return null;
        }
        const values = new Float32Array(layer.values.length);
        const ownerIndexByCell = new Int32Array(layer.ownerIndexByCell.length);
        ownerIndexByCell.fill(layer.opposingOwnerIndex);
        for (let i = 0; i < layer.values.length; i++) {
            if (layer.validMask && layer.validMask[i] === 0) {
                values[i] = 0;
                continue;
            }
            values[i] = 1 - layer.values[i];
        }
        return {
            ...layer,
            id: `${layer.id}:mirror`,
            label: `${layer.label}:mirror`,
            values,
            ownerIndexByCell,
            ownerIndex: layer.opposingOwnerIndex,
            opposingOwnerIndex: layer.ownerIndex,
        };
    }

    private buildSceneSurfacePhaseLayers(params: {
        classification: GridClassification;
        scene: GridMetaballScene;
        effectiveColorIdxByGridIdx: Int32Array | null;
        occupancyByColor?: ReadonlyMap<number, Float32Array> | null;
    }): {
        fillLayers: TerritoryFrontierPhaseFieldLayer[];
        borderLayers: TerritoryFrontierPhaseFieldLayer[];
        sourceKind: 'scene_pairs' | 'scene_owners' | 'none';
    } {
        const occupancyByColor =
            params.occupancyByColor
            ?? this.buildSceneOwnerOccupancy({
                scene: params.scene,
                classification: params.classification,
            });
        const ownerLayers = this.buildFrontierPhaseLayersFromOccupancy({
            classification: params.classification,
            occupancyByColor,
        });
        if (params.effectiveColorIdxByGridIdx) {
            const pairLayers = this.buildScenePairFrontierPhaseLayers({
                classification: params.classification,
                occupancyByColor,
                effectiveColorIdxByGridIdx: params.effectiveColorIdxByGridIdx,
            });
            if (pairLayers.length > 0) {
                this.lastSceneSurfacePhaseLayerSourceKind = 'scene_pairs';
                return {
                    fillLayers: ownerLayers,
                    borderLayers: pairLayers,
                    sourceKind: 'scene_pairs',
                };
            }
        }
        if (ownerLayers.length > 0) {
            this.lastSceneSurfacePhaseLayerSourceKind = 'scene_owners';
            return {
                fillLayers: ownerLayers,
                borderLayers: ownerLayers,
                sourceKind: 'scene_owners',
            };
        }

        this.lastSceneSurfacePhaseLayerSourceKind = 'none';
        return {
            fillLayers: [],
            borderLayers: [],
            sourceKind: 'none',
        };
    }

    private renderFrontierContours(params: {
        contourLayers: readonly TerritoryFrontierContourLayerResult[];
        borderHexByColorIdx: readonly number[];
        borderAlpha: number;
        borderWidth: number;
        trimPx?: number;
    }): void {
        this.frontierMeshLayer.visible = false;
        this.hideUnusedFrontierShaderLayers(0);
        const graphics = this.frontierGraphics;
        graphics.clear();
        if (params.borderWidth <= 0 || params.borderAlpha <= 0) {
            graphics.visible = false;
            return;
        }

        let drewPolyline = false;
        for (const layer of params.contourLayers) {
            let strokeColor = 0xffffff;
            const opposingOwnerIndex = layer.opposingOwnerIndex;
            if (
                layer.ownerIndex !== undefined &&
                opposingOwnerIndex != null &&
                params.borderHexByColorIdx[layer.ownerIndex] !== undefined &&
                params.borderHexByColorIdx[opposingOwnerIndex] !== undefined
            ) {
                strokeColor = blendColors(
                    params.borderHexByColorIdx[layer.ownerIndex],
                    params.borderHexByColorIdx[opposingOwnerIndex],
                    0.5,
                );
            } else if (
                layer.ownerIndex !== undefined &&
                params.borderHexByColorIdx[layer.ownerIndex] !== undefined
            ) {
                strokeColor = params.borderHexByColorIdx[layer.ownerIndex];
            }
            const strokeOptions = {
                color: strokeColor,
                alpha: params.borderAlpha,
                width: params.borderWidth,
                cap: 'round' as const,
                join: 'round' as const,
            };
            for (const polyline of layer.polylines) {
                const points =
                    !polyline.closed && (params.trimPx ?? 0) > 0
                        ? trimOpenPolylineEndpoints(polyline.points, params.trimPx ?? 0)
                        : polyline.points;
                if (points.length < 4) continue;
                drewPolyline = true;
                graphics.moveTo(points[0], points[1]);
                for (let i = 2; i < points.length; i += 2) {
                    graphics.lineTo(points[i], points[i + 1]);
                }
                if (polyline.closed) {
                    graphics.lineTo(points[0], points[1]);
                }
                graphics.stroke(strokeOptions);
            }
        }

        graphics.visible = drewPolyline;
    }

    private renderFrontierFillFromPhase(params: {
        layers: readonly TerritoryFrontierPhaseFieldLayer[];
        samplingMode: TerritoryFrontierPhaseSamplingMode;
        fillHexByColorIdx: readonly number[];
        fillAlpha: number;
        softnessPx: number;
        thresholdOffsetPx: number;
    }): void {
        if (params.fillAlpha <= 0) {
            this.hideUnusedFrontierFillShaderLayers(0);
            this.frontierFillMeshLayer.visible = false;
            return;
        }
        let writeIndex = 0;
        for (const phaseLayer of params.layers) {
            if (
                phaseLayer.cols <= 0 ||
                phaseLayer.rows <= 0 ||
                phaseLayer.ownerIndex === undefined
            ) {
                continue;
            }
            const fillHex = params.fillHexByColorIdx[phaseLayer.ownerIndex];
            if (fillHex === undefined) continue;
            const state = this.ensureFrontierFillShaderLayer(
                writeIndex,
                phaseLayer.cols,
                phaseLayer.rows,
                phaseLayer.originX,
                phaseLayer.originY,
                phaseLayer.cellSizePx,
            );
            this.writeFrontierPhaseTexture(state, phaseLayer, params.samplingMode);
            const uniforms = (state.shader.resources as any).frontierUniforms.uniforms;
            uniforms.uThreshold = Math.max(
                0.001,
                Math.min(
                    0.999,
                    phaseLayer.threshold
                        + params.thresholdOffsetPx / Math.max(1, phaseLayer.cellSizePx),
                ),
            );
            uniforms.uSoftness = Math.max(
                0,
                params.softnessPx / Math.max(1, phaseLayer.cellSizePx),
            );
            uniforms.uFillAlpha = params.fillAlpha;
            uniforms.uFillColor = colorHexToVec3(fillHex);
            state.mesh.visible = true;
            writeIndex += 1;
        }
        this.hideUnusedFrontierFillShaderLayers(writeIndex);
        this.frontierFillMeshLayer.visible = writeIndex > 0;
    }

    private renderFrontierBand(params: {
        layers: readonly TerritoryFrontierPhaseFieldLayer[];
        samplingMode: TerritoryFrontierPhaseSamplingMode;
        borderHexByColorIdx: readonly number[];
        borderAlpha: number;
        bandWidth: number;
        softness: number;
    }): void {
        this.frontierGraphics.clear();
        this.frontierGraphics.visible = false;
        if (params.borderAlpha <= 0 || params.bandWidth <= 0) {
            this.hideUnusedFrontierShaderLayers(0);
            this.frontierMeshLayer.visible = false;
            return;
        }
        let writeIndex = 0;
        for (const phaseLayer of params.layers) {
            if (phaseLayer.cols <= 0 || phaseLayer.rows <= 0) continue;
            const state = this.ensureFrontierShaderLayer(
                writeIndex,
                phaseLayer.cols,
                phaseLayer.rows,
                phaseLayer.originX,
                phaseLayer.originY,
                phaseLayer.cellSizePx,
            );
            this.writeFrontierPhaseTexture(state, phaseLayer, params.samplingMode);
            const uniforms = (state.shader.resources as any).frontierUniforms.uniforms;
            const phaseBandWidth = Math.max(
                0.001,
                params.bandWidth / Math.max(1, phaseLayer.cellSizePx),
            );
            const phaseSoftness = Math.max(
                0.001,
                params.softness / Math.max(1, phaseLayer.cellSizePx),
            );
            uniforms.uThreshold = phaseLayer.threshold;
            uniforms.uBandWidth = phaseBandWidth;
            uniforms.uSoftness = phaseSoftness;
            uniforms.uFrontierAlpha = params.borderAlpha;
            let colorHex = 0xffffff;
            const opposingOwnerIndex = phaseLayer.opposingOwnerIndex;
            if (
                phaseLayer.ownerIndex !== undefined &&
                opposingOwnerIndex != null &&
                params.borderHexByColorIdx[phaseLayer.ownerIndex] !== undefined &&
                params.borderHexByColorIdx[opposingOwnerIndex] !== undefined
            ) {
                colorHex = blendColors(
                    params.borderHexByColorIdx[phaseLayer.ownerIndex],
                    params.borderHexByColorIdx[opposingOwnerIndex],
                    0.5,
                );
            } else if (
                phaseLayer.ownerIndex !== undefined &&
                params.borderHexByColorIdx[phaseLayer.ownerIndex] !== undefined
            ) {
                colorHex = params.borderHexByColorIdx[phaseLayer.ownerIndex];
            }
            uniforms.uFrontierColor = colorHexToVec3(colorHex);
            state.mesh.visible = true;
            writeIndex += 1;
        }
        this.hideUnusedFrontierShaderLayers(writeIndex);
        this.frontierMeshLayer.visible = writeIndex > 0;
    }

    private shouldSuppressSceneCellForFrontierFill(
        cell: GridMetaballScene['cells'][number],
        phaseLayers: readonly TerritoryFrontierPhaseFieldLayer[],
    ): boolean {
        for (const layer of phaseLayers) {
            if (layer.ownerIndex === undefined || cell.colorIdx !== layer.ownerIndex) {
                continue;
            }
            const localX = Math.round((cell.x - layer.originX) / layer.cellSizePx);
            const localY = Math.round((cell.y - layer.originY) / layer.cellSizePx);
            if (
                localX < 0 ||
                localX >= layer.cols ||
                localY < 0 ||
                localY >= layer.rows
            ) {
                continue;
            }
            const localIndex = localY * layer.cols + localX;
            if (layer.validMask && layer.validMask[localIndex] === 0) {
                continue;
            }
            if (
                layer.suppressMask &&
                layer.suppressMask.length === layer.values.length
            ) {
                if (layer.suppressMask[localIndex] > 0) {
                    return true;
                }
                continue;
            }
            if (layer.opposingOwnerIndex != null) {
                return true;
            }
        }
        return false;
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
        currentGeometry: CanonicalGeometrySnapshot;
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
        let rebuiltPlan = this.commitPendingWorkerPlan();

        const currentGeometry = input.geometry;
        if (!currentGeometry) {
            this.root.visible = false;
            this.frontierGraphics.clear();
            this.frontierGraphics.visible = false;
            this.frontierMeshLayer.visible = false;
            this.hideUnusedFrontierShaderLayers(0);
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
            this.frontierGraphics.clear();
            this.frontierGraphics.visible = false;
            this.frontierMeshLayer.visible = false;
            this.hideUnusedFrontierShaderLayers(0);
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
        const frontierRequestedTechnique = this.readFrontierTechnique(input);
        const frontierRequestedBorderGeometryMode =
            this.readFrontierBorderGeometryMode(input);
        const frontierPhaseSampling = this.readFrontierPhaseSampling(input);
        const frontierBlurPasses = Math.max(
            0,
            Math.floor(
                readTunableNumber(
                    input,
                    'TERRITORY_FRONTIER_BLUR_PASSES',
                    GAME_CONFIG.TERRITORY_FRONTIER_BLUR_PASSES ?? 0,
                ),
            ),
        );
        const frontierTriangleDiagonalPolicy =
            this.readFrontierTriangleDiagonalPolicy(input);
        const frontierJunctionRenderMode =
            this.readFrontierJunctionRenderMode(input);
        const frontierChaikinPasses = Math.max(
            0,
            Math.floor(
                readTunableNumber(
                    input,
                    'TERRITORY_FRONTIER_CHAIKIN_PASSES',
                    GAME_CONFIG.TERRITORY_FRONTIER_CHAIKIN_PASSES ?? 0,
                ),
            ),
        );
        const frontierShaderSoftnessPx = Math.max(
            0.001,
            readTunableNumber(
                input,
                'TERRITORY_FRONTIER_SHADER_SOFTNESS_PX',
                GAME_CONFIG.TERRITORY_FRONTIER_SHADER_SOFTNESS_PX ?? 5,
            ),
        );
        const frontierBandWidthPx = Math.max(
            0.001,
            readTunableNumber(
                input,
                'TERRITORY_FRONTIER_BAND_WIDTH_PX',
                GAME_CONFIG.TERRITORY_FRONTIER_BAND_WIDTH_PX ?? 2,
            ),
        );
        const frontierJunctionRadiusPx = Math.max(
            0,
            readTunableNumber(
                input,
                'TERRITORY_FRONTIER_JUNCTION_RADIUS_PX',
                GAME_CONFIG.TERRITORY_FRONTIER_JUNCTION_RADIUS_PX ?? 6,
            ),
        );
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
        const activeSessionPlans: ActiveSessionPlan[] = [];

        // Rebuild the plan from semantic geometry identity, not fresh object
        // identity. Localized geometry snapshots may be equivalent but newly
        // allocated; the plan key carries the authoritative geometry versions.
        const shouldUseTerminalSteadyFallback =
            transitionSessions.length === 0 &&
            !!transitionKey &&
            (input.activeTransition?.rawProgress ?? 0) >= 1;

        if (transitionSessions.length > 0) {
            if (
                !this.cachedPlan
                || this.cachedPlan.planKey !== steadyPlanKey
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
                ) {
                    this.capturedSessionPlanRebuildCount += 1;
                    recordPerfEvent('territory.phaseEdges.capturedSessionPlanRebuild', {
                        sessionKey: session.sessionKey,
                        cause: sessionPlan ? 'plan_key_changed' : 'cache_miss',
                        planKey: sessionPlanKey,
                        eventCount: session.events.length,
                    });
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
        } else if (transitionKey && !shouldUseTerminalSteadyFallback) {
            const prevGeometry = this.resolvePrevGeometryForTransition({
                input,
                settings,
            });
            const planKey = buildMetaballGridPlanKey({
                transitionKey,
                geometryVersion: `${prevGeometry.version}->${currentGeometry.version}`,
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
            ) {
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
        const visualSessionPlans = activeSessionPlans.filter(
            ({ session }) => session.rawProgress < 1,
        );
        const visualSessionCount = visualSessionPlans.length;

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
        const boundaryFillFlush = readTunableBoolean(
            input,
            'METABALL_GRID_BOUNDARY_FILL_FLUSH',
            metaballGridPhaseEdgesModeDefaults.METABALL_GRID_BOUNDARY_FILL_FLUSH,
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
        const outerBorderEnabled = readTunableBoolean(
            input,
            'TERRITORY_FRONTIER_OUTER_BORDER_ENABLED',
            metaballGridPhaseEdgesModeDefaults.TERRITORY_FRONTIER_OUTER_BORDER_ENABLED ??
                false,
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
        const fillEnabled = readTunableBoolean(
            input,
            'METABALL_FILL_ENABLED',
            GAME_CONFIG.METABALL_FILL_ENABLED ?? true,
        );
        const fillAlphaMult = Math.max(
            0,
            Math.min(1, readTunableNumber(input, 'METABALL_ALPHA', GAME_CONFIG.METABALL_ALPHA ?? 0.5)),
        );
        const effectiveFillAlphaMult = fillEnabled ? fillAlphaMult : 0;
        const borderEnabled = readTunableBoolean(
            input,
            'METABALL_BORDER_ENABLED',
            GAME_CONFIG.METABALL_BORDER_ENABLED ?? true,
        );
        const borderWidth = Math.max(
            0,
            readTunableNumber(input, 'METABALL_BORDER_WIDTH', GAME_CONFIG.METABALL_BORDER_WIDTH ?? 1.5),
        );
        const borderAlpha = Math.max(
            0,
            Math.min(1, readTunableNumber(input, 'METABALL_BORDER_ALPHA', GAME_CONFIG.METABALL_BORDER_ALPHA ?? 0.6)),
        );
        const effectiveBorderWidth = borderEnabled ? borderWidth : 0;
        const effectiveBorderAlpha = borderEnabled ? borderAlpha : 0;
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
            [
                'off',
                'soft_fade',
                'stepped_moat',
                'plasma_rim',
                'ion_drift',
                'geometry_strip',
            ],
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
        const frontierFxEmissive = Math.max(
            0,
            readTunableNumber(
                input,
                'TERRITORY_FRONTIER_FX_EMISSIVE',
                GAME_CONFIG.TERRITORY_FRONTIER_FX_EMISSIVE ?? 1,
            ),
        );
        const frontierFxParticleDensity = Math.max(
            0,
            Math.min(
                1,
                readTunableNumber(
                    input,
                    'TERRITORY_FRONTIER_FX_PARTICLE_DENSITY',
                    GAME_CONFIG.TERRITORY_FRONTIER_FX_PARTICLE_DENSITY ?? 0.45,
                ),
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
            emissive: frontierFxEmissive,
            particleDensity: frontierFxParticleDensity,
            pulseSpeed: frontierFxPulseSpeed,
            applySteadyState: frontierFxApplySteadyState,
            applyTransition: frontierFxApplyTransition,
        };
        const frontierFxActiveForFrame = isTerritoryFrontierFxActive(
            frontierFxTuning,
            visualSessionCount > 0,
        );
        const frontierFxAnimatedForFrame =
            frontierFxActiveForFrame
            && (
                frontierFxMode === 'plasma_rim'
                || frontierFxMode === 'ion_drift'
                || frontierFxMode === 'geometry_strip'
            );
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
        for (const { plan } of visualSessionPlans) {
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
        const suppressedBaseSig = visualSessionPlans
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
        const visualTransitionSessionCount = visualSessionCount;
        const transitionTotalCount = activeSessionPlans.reduce(
            (total, { plan }) => total + plan.wavePlan.orderedTransitionVIds.length,
            0,
        );
        const activeWindowCount = visualSessionPlans.reduce(
            (total, { session, plan }) => {
                const sessionProgress = easeProgress(waveEase, session.rawProgress);
                return (
                    total
                    + plan.wavePlan.orderedFlipTimes.filter(
                        (flipTime) =>
                            sessionProgress >= flipTime - flipWindow / 2
                            && sessionProgress <= flipTime + flipWindow / 2,
                    ).length
                );
            },
            0,
        );
        let frontierTechnique = frontierRequestedTechnique;
        let frontierFallbackReason: string | null = null;
        if (frontierTechnique !== 'control') {
            if (cached.classification.distribution !== 'square') {
                frontierTechnique = 'control';
                frontierFallbackReason = 'requires_square_distribution';
            } else if (
                frontierTechnique === 'shader_frontier_band' &&
                !input.renderer
            ) {
                frontierTechnique = 'control';
                frontierFallbackReason = 'renderer_unavailable';
            }
        }
        let frontierBorderGeometryMode = frontierRequestedBorderGeometryMode;
        let frontierBorderGeometryFallbackReason: string | null = null;
        if (frontierTechnique !== 'control') {
            frontierBorderGeometryMode = 'shared_edge';
            if (frontierRequestedBorderGeometryMode !== 'shared_edge') {
                frontierBorderGeometryFallbackReason =
                    'requires_control_frontier';
            }
        } else if (frontierRequestedBorderGeometryMode === 'contour_matched') {
            if (borderMode !== 'territory_edge') {
                frontierBorderGeometryMode = 'shared_edge';
                frontierBorderGeometryFallbackReason =
                    'requires_territory_edge_border_mode';
            } else if (!borderBlend) {
                frontierBorderGeometryMode = 'shared_edge';
                frontierBorderGeometryFallbackReason =
                    'requires_centered_blended_borders';
            } else if (cached.classification.distribution !== 'square') {
                frontierBorderGeometryMode = 'shared_edge';
                frontierBorderGeometryFallbackReason =
                    'requires_square_distribution';
            } else if (!input.renderer || typeof document === 'undefined') {
                frontierBorderGeometryMode = 'shared_edge';
                frontierBorderGeometryFallbackReason =
                    'renderer_unavailable';
            }
        }
        const frontierSurfaceRecipe =
            resolveTerritoryFrontierSurfaceRecipe({
                technique: frontierTechnique,
                borderGeometryMode: frontierBorderGeometryMode,
            });
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
            frontierRequestedTechnique,
            frontierTechnique,
            frontierRequestedBorderGeometryMode,
            frontierBorderGeometryMode,
            frontierBorderGeometryFallbackReason,
            frontierSurfaceGeometryFamily:
                frontierSurfaceRecipe.geometryFamily,
            frontierStableGeometryFamily:
                frontierSurfaceRecipe.stableGeometryFamily,
            frontierTransitionGeometryFamily:
                frontierSurfaceRecipe.transitionGeometryFamily,
            frontierSurfaceInvariantViolation:
                frontierSurfaceRecipe.invariantViolation,
            frontierPhaseSampling,
            frontierBlurPasses,
            frontierTriangleDiagonalPolicy,
            frontierChaikinPasses,
            frontierShaderSoftnessPx,
            frontierBandWidthPx,
            frontierFallbackReason,
            frontierPhaseLayerCount: 0,
            frontierPhaseGridCols: 0,
            frontierPhaseGridRows: 0,
            frontierBlurMs: 0,
            frontierContourExtractionMs: 0,
            frontierSmoothingMs: 0,
            frontierPolylineCount: 0,
            frontierEmittedVertexCount: 0,
            transitionEventCount:
                input.activeTransition?.events.length ??
                input.transitionSessions?.reduce(
                    (count, session) => count + session.events.length,
                    0,
                ) ??
                0,
            planWorkerPending: false,
            holdingForPlan: false,
            visualTransitionActive: visualTransitionSessionCount > 0,
            visibleFrameState: visualTransitionSessionCount > 0 ? 'fallback_plan' : 'steady',
            clockSource: visualTransitionSessionCount > 0 ? 'scheduler' : 'none',
            renderCacheMode: 'live_vectors',
            activeWindowCount,
            transitionTotalCount,
            promotedToActiveCount: 0,
            demotedToSettledCount: 0,
            transitionSpriteWrites: 0,
            fastPathUsed: false,
            fallbackReason:
                visualTransitionSessionCount > 0 ? 'session_overlay_renderer' : 'steady_scene',
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
        const activeSessionPaintSig = visualSessionPlans
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
            boundaryFillFlush ? '1' : '0',
            borderMode,
            borderBlend ? '1' : '0',
            sharedEdgeSmoothingPasses,
            edgeTrimPx.toFixed(2),
            borderChaikinPasses,
            fillSat.toFixed(4),
            fillLight.toFixed(4),
            effectiveFillAlphaMult.toFixed(4),
            effectiveBorderWidth.toFixed(4),
            effectiveBorderAlpha.toFixed(4),
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
            frontierFxMode,
            frontierFxWidthPx.toFixed(3),
            frontierFxStrength.toFixed(3),
            frontierFxSteps,
            frontierFxSoftness.toFixed(3),
            frontierFxEmissive.toFixed(3),
            frontierFxParticleDensity.toFixed(3),
            frontierFxPulseSpeed.toFixed(3),
            frontierFxApplySteadyState ? '1' : '0',
            frontierFxApplyTransition ? '1' : '0',
            frontierFxPulseBucket,
            frontierTechnique,
            frontierBorderGeometryMode,
            frontierSurfaceRecipe.geometryFamily,
            frontierPhaseSampling,
            frontierBlurPasses,
            frontierTriangleDiagonalPolicy,
            frontierChaikinPasses,
            frontierShaderSoftnessPx.toFixed(3),
            frontierBandWidthPx.toFixed(3),
            frontierJunctionRenderMode,
            frontierJunctionRadiusPx.toFixed(3),
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
        const baseSceneCells = renderMetaballGridScene({
            classification: cached.classification,
            wavePlan: applyFlipTimeJitter(cached.wavePlan, flipTimeJitter),
            progress: visualTransitionSessionCount > 0 ? 1 : progress,
            flipTransition,
            flipWindow,
            strength,
            inwardOffsetPx,
            ownerColorIdx,
            omitVIds: suppressedBaseVIds.size > 0 ? suppressedBaseVIds : undefined,
        }).cells;
        const sceneCells =
            visualTransitionSessionCount > 0
                ? baseSceneCells.slice()
                : baseSceneCells;
        for (const { session, plan } of visualSessionPlans) {
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

        const usingControlFrontier = frontierTechnique === 'control';
        let frontierPhaseLayerCount = 0;
        let frontierPhaseGridCols = 0;
        let frontierPhaseGridRows = 0;
        let frontierBlurMs = 0;
        let frontierContourExtractionMs = 0;
        let frontierSmoothingMs = 0;
        let frontierPolylineCount = 0;
        let frontierEmittedVertexCount = 0;
        let effectiveFrontierPhaseLayers: TerritoryFrontierPhaseFieldLayer[] = [];
        let frontierPresentation:
            | ReturnType<typeof buildTerritoryFrontierPresentation>
            | null = null;

        // ── Paint: one shape per scene cell. O(N). ──────────────────────────
        const paintStartMs = performance.now();
        const g = this.graphics;
        const borderLayer = this.borderGraphics;
        g.clear();
        borderLayer.clear();
        borderLayer.visible = false;
        this.frontierGraphics.clear();
        this.frontierGraphics.visible = false;
        this.frontierMeshLayer.visible = false;
        this.hideUnusedFrontierShaderLayers(0);
        const spacingPx = cached.classification.spacingPx;
        // Clamp inset so a cell never collapses to 0. Interior cells always
        // honor `cellInsetPx`. Boundary cells can either stay flush to the
        // visible frontier (preferred Phase Edges path) or fall back to the
        // legacy "inherit cell inset + junction trim" behavior when the user
        // explicitly disables flush boundary fill.
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
        const drawTerritoryEdgeOnly = borderMode === 'territory_edge';
        const drawPerCellBorders =
            borderMode === 'per_cell' &&
            effectiveBorderWidth > 0 &&
            effectiveBorderAlpha > 0;
        const canBuildScenePairPhaseSurface =
            drawTerritoryEdgeOnly &&
            borderBlend &&
            cached.classification.distribution === 'square' &&
            (
                frontierSurfaceRecipe.usesPhaseFill ||
                frontierSurfaceRecipe.usesPhaseBorder
            );
        const canRenderPhaseFillSurface =
            frontierSurfaceRecipe.usesPhaseFill &&
            !!input.renderer &&
            typeof document !== 'undefined';
        const drawSceneSharedEdgeBorders =
            drawTerritoryEdgeOnly &&
            effectiveBorderWidth > 0 &&
            effectiveBorderAlpha > 0 &&
            frontierSurfaceRecipe.usesBaseSceneBorders;
        const drawBaseBorders =
            drawPerCellBorders ||
            drawSceneSharedEdgeBorders;
        const canUseSplitFillOnlyFastPath =
            usingControlFrontier &&
            !canRenderPhaseFillSurface &&
            !drawBaseBorders &&
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
            borderMode !== 'off' &&
            effectiveBorderWidth > 0 &&
            effectiveBorderAlpha > 0 &&
            borderBlend &&
            cached.classification.distribution === 'square' &&
            frontierSurfaceRecipe.borderSource === 'shared_edge';
        const shouldRenderPhaseBorder =
            borderMode !== 'off' &&
            effectiveBorderWidth > 0 &&
            effectiveBorderAlpha > 0 &&
            frontierSurfaceRecipe.usesPhaseBorder;
        const shouldDrawOuterPerimeter =
            outerBorderEnabled &&
            borderMode !== 'off' &&
            effectiveBorderWidth > 0 &&
            effectiveBorderAlpha > 0 &&
            cached.classification.distribution === 'square';
        const sceneOwnerOccupancy =
            drawBlendedEdges ||
            canBuildScenePairPhaseSurface ||
            frontierSurfaceRecipe.usesPhaseFill ||
            frontierSurfaceRecipe.usesPhaseBorder
                ? this.buildSceneOwnerOccupancy({
                      scene,
                      classification: cached.classification,
                  })
                : null;

        // Build an effective per-grid-index colorIdx so both "per-cell stroke
        // gating" and "centered blended edge drawing" read the same truth.
        // Populated from scene cells — so during transitions the boundary
        // follows whichever side is currently dominant.
        const cols = cached.classification.cols;
        const rows = cached.classification.rows;
        const vstarCount = cached.classification.vstars.length;
        const shouldUseSceneCellBoundaryClassification =
            frontierSurfaceRecipe.fillSource === 'scene_cells' &&
            (
                borderMode === 'territory_edge' ||
                inwardOffsetPx > 0 ||
                !boundaryFillFlush ||
                outerBorderEnabled ||
                frontierFxActiveForFrame
            );
        let effectiveColorIdxByGridIdx: Int32Array | null = null;
        const needsEffectiveColorIdxByGridIdx =
            !canUseSplitFillOnlyFastPath &&
            (
                shouldUseSceneCellBoundaryClassification ||
                (
                    borderMode !== 'off' &&
                    effectiveBorderWidth > 0 &&
                    effectiveBorderAlpha > 0 &&
                    (
                        drawTerritoryEdgeOnly ||
                        drawBlendedEdges ||
                        shouldDrawOuterPerimeter
                    )
                ) ||
                canBuildScenePairPhaseSurface ||
                frontierFxActiveForFrame ||
                frontierSurfaceRecipe.usesPhaseFill ||
                frontierSurfaceRecipe.usesPhaseBorder
            );
        if (
            needsEffectiveColorIdxByGridIdx
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
                    hasActiveTransition: visualTransitionSessionCount > 0,
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

        let sceneSurfaceFillLayers: TerritoryFrontierPhaseFieldLayer[] = [];
        let sceneSurfaceBorderLayers: TerritoryFrontierPhaseFieldLayer[] = [];
        if (canBuildScenePairPhaseSurface && effectiveColorIdxByGridIdx) {
            const sceneSurfaceLayers = this.buildSceneSurfacePhaseLayers({
                classification: cached.classification,
                scene,
                effectiveColorIdxByGridIdx,
                occupancyByColor: sceneOwnerOccupancy,
            });
            sceneSurfaceFillLayers = sceneSurfaceLayers.fillLayers;
            sceneSurfaceBorderLayers = sceneSurfaceLayers.borderLayers;
        } else if (
            frontierSurfaceRecipe.geometryFamily !== 'shared_edge' &&
            (
                frontierSurfaceRecipe.usesPhaseFill ||
                frontierSurfaceRecipe.usesPhaseBorder
            )
        ) {
            const sceneSurfaceLayers = this.buildSceneSurfacePhaseLayers({
                classification: cached.classification,
                scene,
                effectiveColorIdxByGridIdx: null,
                occupancyByColor: sceneOwnerOccupancy,
            });
            if (sceneSurfaceLayers.sourceKind !== 'none') {
                sceneSurfaceFillLayers = sceneSurfaceLayers.fillLayers;
                sceneSurfaceBorderLayers = sceneSurfaceLayers.borderLayers;
            }
        }
        if (sceneSurfaceFillLayers.length > 0) {
            effectiveFrontierPhaseLayers = sceneSurfaceFillLayers;
            frontierPhaseLayerCount = Math.max(
                frontierPhaseLayerCount,
                sceneSurfaceFillLayers.length,
            );
            frontierPhaseGridCols = Math.max(
                frontierPhaseGridCols,
                ...sceneSurfaceFillLayers.map((layer) => layer.cols),
            );
            frontierPhaseGridRows = Math.max(
                frontierPhaseGridRows,
                ...sceneSurfaceFillLayers.map((layer) => layer.rows),
            );
            frontierEmittedVertexCount = Math.max(
                frontierEmittedVertexCount,
                sceneSurfaceFillLayers.reduce(
                    (total, layer) => total + layer.values.length,
                    0,
                ),
            );
        }
        if (shouldRenderPhaseBorder && sceneSurfaceBorderLayers.length > 0) {
            frontierPresentation = buildTerritoryFrontierPresentation({
                phaseField: { layers: sceneSurfaceBorderLayers },
                technique:
                    usingControlFrontier
                        ? 'marching_squares_scalar'
                        : frontierTechnique,
                blurPasses: usingControlFrontier ? 0 : frontierBlurPasses,
                chaikinPasses:
                    usingControlFrontier
                        ? borderChaikinPasses
                        : frontierChaikinPasses,
                triangleDiagonalPolicy: frontierTriangleDiagonalPolicy,
            });
            frontierPhaseLayerCount = Math.max(
                frontierPhaseLayerCount,
                frontierPresentation.metrics.phaseLayerCount,
            );
            frontierPhaseGridCols = Math.max(
                frontierPhaseGridCols,
                frontierPresentation.metrics.phaseGridCols,
            );
            frontierPhaseGridRows = Math.max(
                frontierPhaseGridRows,
                frontierPresentation.metrics.phaseGridRows,
            );
            frontierBlurMs = Math.max(
                frontierBlurMs,
                frontierPresentation.metrics.blurMs,
            );
            frontierContourExtractionMs = Math.max(
                frontierContourExtractionMs,
                frontierPresentation.metrics.contourExtractionMs,
            );
            frontierSmoothingMs = Math.max(
                frontierSmoothingMs,
                frontierPresentation.metrics.smoothingMs,
            );
            frontierPolylineCount = Math.max(
                frontierPolylineCount,
                frontierPresentation.metrics.polylineCount,
            );
            frontierEmittedVertexCount = Math.max(
                frontierEmittedVertexCount,
                frontierPresentation.metrics.emittedVertexCount,
            );
            effectiveFrontierPhaseLayers =
                sceneSurfaceFillLayers.length > sceneSurfaceBorderLayers.length
                    ? frontierPresentation.phaseField.layers.flatMap((layer) => {
                          const mirrored = this.mirrorFrontierPhaseLayer(layer);
                          return mirrored ? [layer, mirrored] : [layer];
                      })
                    : [...frontierPresentation.phaseField.layers];
        }
        const shouldRenderPhaseFillOverlay =
            canRenderPhaseFillSurface &&
            effectiveFrontierPhaseLayers.length > 0;
        let baseBorderDrawn = false;

        // Per-cell fill + (for per_cell and territory_edge non-blend) per-cell stroke.
        const nativeLayerSig = [
            this.sessionKey ?? '',
            cached.planKey,
            territoryEpoch,
            cellShape,
            nativeSize.toFixed(2),
            nativeCornerR.toFixed(2),
            nativeHexR.toFixed(2),
            effectiveFillAlphaMult.toFixed(4),
            suppressedBaseSig,
            palFillSig,
        ].join('|');

        g.visible = !canUseSplitFillOnlyFastPath && effectiveFillAlphaMult > 0;
        this.nativeSpriteLayer.visible =
            canUseSplitFillOnlyFastPath && effectiveFillAlphaMult > 0;
        this.transitionSpriteLayer.visible =
            canUseSplitFillOnlyFastPath && effectiveFillAlphaMult > 0;

        if (canUseSplitFillOnlyFastPath) {
            if (this.lastSplitNativeSig !== nativeLayerSig) {
                let nativeCount = 0;
                if (effectiveFillAlphaMult > 0) {
                    for (let i = 0; i < cached.classification.vstars.length; i++) {
                        const v = cached.classification.vstars[i];
                        if (v.role === 'native' && !suppressedBaseVIds.has(v.id)) {
                            nativeCount += 1;
                        }
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
                        effectiveFillAlphaMult,
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
                if (c.alpha * effectiveFillAlphaMult <= 0) continue;
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
                const alpha = c.alpha * effectiveFillAlphaMult;
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
                if (
                    shouldRenderPhaseFillOverlay &&
                    this.shouldSuppressSceneCellForFrontierFill(
                        c,
                        effectiveFrontierPhaseLayers,
                    )
                ) {
                    continue;
                }
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
                    c.alpha
                    * effectiveFillAlphaMult
                    * fxAlphaMultiplier;
                if (alpha <= 0) continue;

                // Trust the scene cell's (x, y) — classification already applied
                // any distribution-driven row shift (hex_offset) or jitter. A
                // previous revision double-shifted odd rows here when cellShape
                // was 'hex', which misaligned fill vs. border polylines.
                const x = c.x;
                const y = c.y;

                // Scene roles describe conquest-transition semantics, not the
                // steady ownership frontier. For the shared-edge surface, the
                // visible fill/border contract must instead come from the
                // current ownership grid so steady-state and transition frames
                // share the same boundary truth.
                const isOwnershipBoundary =
                    shouldUseSceneCellBoundaryClassification &&
                    effectiveColorIdxByGridIdx &&
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
                if (!drawBaseBorders) continue;
                if (drawBlendedEdges && drawTerritoryEdgeOnly) continue; // handled by the edge pass below
                if (drawTerritoryEdgeOnly && effectiveColorIdxByGridIdx) {
                    if (ix >= 0 && iy >= 0) {
                        const self = c.colorIdx;
                        const neighbourDiffers = (nx: number, ny: number): boolean => {
                            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) {
                                return outerBorderEnabled;
                            }
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
                    alpha: effectiveBorderAlpha,
                    width: effectiveBorderWidth,
                    cap: 'round' as const,
                    join: 'round' as const,
                };
                baseBorderDrawn = true;
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
                    strokeSquareBounds(borderLayer, squareBounds, squareCornerR, strokeOpts);
                } else if (cellShape === 'circle') {
                    borderLayer.circle(x, y, half).stroke(strokeOpts);
                } else if (cellShape === 'diamond') {
                    borderLayer
                        .poly([x, y - half, x + half, y, x, y + half, x - half, y])
                        .stroke(strokeOpts);
                } else if (cellShape === 'hex') {
                    const pts: number[] = [];
                    for (let k = 0; k < 6; k++) {
                        pts.push(
                            x + HEX_VERTICES_POINTY[k][0] * hexR,
                            y + HEX_VERTICES_POINTY[k][1] * hexR,
                        );
                    }
                    borderLayer.poly(pts).stroke(strokeOpts);
                } else if (cornerR > 0) {
                    borderLayer
                        .roundRect(x - half, y - half, size, size, cornerR)
                        .stroke(strokeOpts);
                } else {
                    borderLayer
                        .rect(x - half, y - half, size, size)
                        .stroke(strokeOpts);
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
                readonly cellIndex0: number;
                readonly cellIndex1: number;
            }
            interface BoundaryEdgeBucket {
                readonly edges: BoundaryEdge[];
                ownerWeight: number;
                opposingWeight: number;
            }
            const edgesByPair = new Map<string, BoundaryEdgeBucket>();
            const ownerSetByVertex = new Map<string, Set<number>>();
            const coordsByVertex = new Map<string, readonly [number, number]>();
            const vertexKey = (x: number, y: number): string =>
                `${x.toFixed(4)},${y.toFixed(4)}`;
            const recordVertexOwners = (vertexId: string, a: number, b: number): void => {
                let ownerSet = ownerSetByVertex.get(vertexId);
                if (!ownerSet) {
                    ownerSet = new Set<number>();
                    ownerSetByVertex.set(vertexId, ownerSet);
                }
                ownerSet.add(a);
                ownerSet.add(b);
            };
            const samplePairWeight = (
                colorIdx: number,
                cellIndex0: number,
                cellIndex1: number,
            ): number => {
                if (!sceneOwnerOccupancy) return 0;
                const occupancy = sceneOwnerOccupancy.get(colorIdx);
                if (!occupancy) return 0;
                return (
                    ((occupancy[cellIndex0] ?? 0) + (occupancy[cellIndex1] ?? 0)) * 0.5
                );
            };
            const pushEdge = (
                a: number,
                b: number,
                x0: number,
                y0: number,
                x1: number,
                y1: number,
                cellIndex0: number,
                cellIndex1: number,
            ): void => {
                if (!(Math.abs(x1 - x0) > 0.001 || Math.abs(y1 - y0) > 0.001)) return;
                const v0 = vertexKey(x0, y0);
                const v1 = vertexKey(x1, y1);
                coordsByVertex.set(v0, [x0, y0]);
                coordsByVertex.set(v1, [x1, y1]);
                const lo = a < b ? a : b;
                const hi = a < b ? b : a;
                const key = `${lo}|${hi}`;
                let bucket = edgesByPair.get(key);
                if (!bucket) {
                    bucket = {
                        edges: [],
                        ownerWeight: 0,
                        opposingWeight: 0,
                    };
                    edgesByPair.set(key, bucket);
                }
                bucket.edges.push({ v0, v1, cellIndex0, cellIndex1 });
                bucket.ownerWeight += samplePairWeight(lo, cellIndex0, cellIndex1);
                bucket.opposingWeight += samplePairWeight(hi, cellIndex0, cellIndex1);
                recordVertexOwners(v0, lo, hi);
                recordVertexOwners(v1, lo, hi);
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
                            pushEdge(
                                selfIdx,
                                rIdx,
                                x,
                                y0,
                                x,
                                y1,
                                cellIndex,
                                rightIndex,
                            );
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
                            pushEdge(
                                selfIdx,
                                dIdx,
                                x0,
                                y,
                                x1,
                                y,
                                cellIndex,
                                downIndex,
                            );
                        }
                    }
                }
            }

            const strokeOpts = {
                color: 0xffffff,
                alpha: effectiveBorderAlpha,
                width: effectiveBorderWidth,
                cap: 'round' as const,
                join: 'round' as const,
            };

            const endpointTrimPx =
                frontierJunctionRenderMode === 'bubble'
                    ? Math.max(edgeTrimPx, frontierJunctionRadiusPx)
                    : edgeTrimPx;
            const drawBoundaryEdgeBucket = (
                edges: readonly BoundaryEdge[],
                color: number,
                trimOpenEndpoints: boolean,
            ): void => {
                if (edges.length === 0) return;
                strokeOpts.color = color;
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
                    if (trimOpenEndpoints && !closed && endpointTrimPx > 0) {
                        pts = trimOpenPolylineEndpoints(pts, endpointTrimPx);
                    }
                    baseBorderDrawn = true;
                    borderLayer.moveTo(pts[0], pts[1]);
                    for (let k = 2; k < pts.length; k += 2) {
                        borderLayer.lineTo(pts[k], pts[k + 1]);
                    }
                    if (closed) borderLayer.lineTo(pts[0], pts[1]);
                    borderLayer.stroke(strokeOpts);
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
            };

            for (const [key, bucket] of edgesByPair) {
                if (bucket.edges.length === 0) continue;
                const sep = key.indexOf('|');
                const aIdx = Number(key.slice(0, sep));
                const bIdx = Number(key.slice(sep + 1));
                const hexA = borderHexByColorIdx[aIdx];
                const hexB = borderHexByColorIdx[bIdx];
                if (hexA === undefined || hexB === undefined) continue;
                const totalPairWeight = bucket.ownerWeight + bucket.opposingWeight;
                const pairBlendT =
                    totalPairWeight > 0
                        ? bucket.opposingWeight / totalPairWeight
                        : 0.5;
                drawBoundaryEdgeBucket(
                    bucket.edges,
                    blendColors(hexA, hexB, pairBlendT),
                    true,
                );
            }
            if (frontierJunctionRenderMode === 'bubble' && frontierJunctionRadiusPx > 0) {
                const bubbleStrokeWidth = Math.max(1, effectiveBorderWidth * 0.35);
                for (const [vertexId, ownerSet] of ownerSetByVertex) {
                    if (ownerSet.size < 3) continue;
                    const bubbleHexes = [...ownerSet]
                        .map((ownerIndex) => borderHexByColorIdx[ownerIndex])
                        .filter((hex): hex is number => hex !== undefined);
                    if (bubbleHexes.length === 0) continue;
                    const bubbleColor = averageHexColors(bubbleHexes);
                    const coords = coordsByVertex.get(vertexId);
                    if (!coords) continue;
                    const [vx, vy] = coords;
                    baseBorderDrawn = true;
                    borderLayer
                        .circle(vx, vy, frontierJunctionRadiusPx)
                        .fill({
                            color: bubbleColor,
                            alpha: Math.min(1, effectiveBorderAlpha * 0.9),
                        })
                        .stroke({
                            color: bubbleColor,
                            alpha: effectiveBorderAlpha,
                            width: bubbleStrokeWidth,
                            cap: 'round' as const,
                            join: 'round' as const,
                        });
                }
            }
        }
        if (shouldDrawOuterPerimeter && effectiveColorIdxByGridIdx) {
            drawOuterPerimeterIntervals({
                borderLayer,
                classification: cached.classification,
                effectiveColorIdxByGridIdx,
                borderHexByColorIdx,
                borderAlpha: effectiveBorderAlpha,
                borderWidth: effectiveBorderWidth,
                cellHalfExtent: trueHalf,
                cellBoundsByGridIdx: visibleSquareBoundsByGridIdx,
                markBorderDrawn: () => {
                    baseBorderDrawn = true;
                },
            });
        }
        borderLayer.visible = baseBorderDrawn;

        if (shouldRenderPhaseFillOverlay) {
            const fillSamplingMode =
                frontierSurfaceRecipe.geometryFamily === 'shared_edge'
                    ? inwardOffsetPx > 0
                        ? 'linear'
                        : 'nearest'
                    : frontierTechnique === 'shader_frontier_band'
                      ? frontierPhaseSampling
                      : 'linear';
            const fillSoftnessPx =
                frontierTechnique === 'shader_frontier_band'
                    ? frontierShaderSoftnessPx
                    : 0;
            this.renderFrontierFillFromPhase({
                layers: effectiveFrontierPhaseLayers,
                samplingMode: fillSamplingMode,
                fillHexByColorIdx,
                fillAlpha: effectiveFillAlphaMult,
                softnessPx: fillSoftnessPx,
                thresholdOffsetPx: Math.max(0, inwardOffsetPx),
            });
        } else {
            this.frontierFillMeshLayer.visible = false;
            this.hideUnusedFrontierFillShaderLayers(0);
        }

        if (frontierPresentation) {
            if (frontierSurfaceRecipe.borderSource === 'frontier_band') {
                this.renderFrontierBand({
                    layers: frontierPresentation.frontierBandLayers,
                    samplingMode: frontierPhaseSampling,
                    borderHexByColorIdx,
                    borderAlpha: effectiveBorderAlpha,
                    bandWidth: frontierBandWidthPx,
                    softness: frontierShaderSoftnessPx,
                });
                this.frontierGraphics.clear();
                this.frontierGraphics.visible = false;
            } else {
                this.frontierMeshLayer.visible = false;
                this.hideUnusedFrontierShaderLayers(0);
                this.renderFrontierContours({
                    contourLayers: frontierPresentation.contourLayers,
                    borderHexByColorIdx,
                    borderAlpha: effectiveBorderAlpha,
                    borderWidth: effectiveBorderWidth,
                });
            }
        } else {
            this.frontierGraphics.clear();
            this.frontierGraphics.visible = false;
            this.frontierMeshLayer.visible = false;
            this.hideUnusedFrontierShaderLayers(0);
        }

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
            frontierPhaseLayerCount,
            frontierPhaseGridCols,
            frontierPhaseGridRows,
            frontierBlurMs,
            frontierContourExtractionMs,
            frontierSmoothingMs,
            frontierPolylineCount,
            frontierEmittedVertexCount,
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
        this.frontierFillMeshLayer.visible = false;
        this.borderGraphics.clear();
        this.borderGraphics.visible = false;
        this.frontierGraphics.clear();
        this.frontierGraphics.visible = false;
        this.frontierMeshLayer.visible = false;
        this.hideUnusedFrontierFillShaderLayers(0);
        this.hideUnusedFrontierShaderLayers(0);
        this.hideUnusedSprites(this.nativeSprites, 0);
        this.hideUnusedSprites(this.transitionSprites, 0);
        this.root.removeChildren();
        this.root.addChild(this.graphics);
        this.root.addChild(this.frontierFillMeshLayer);
        this.root.addChild(this.borderGraphics);
        this.root.addChild(this.frontierGraphics);
        this.root.addChild(this.frontierMeshLayer);
        this.root.addChild(this.nativeSpriteLayer);
        this.root.addChild(this.transitionSpriteLayer);
    }
}

export function createMetaballGridPhaseEdgesFamily(
    colorUtils: ColorUtils,
): MetaballGridPhaseEdgesFamily {
    return new MetaballGridPhaseEdgesFamily(colorUtils, {
        id: 'metaball_grid_phase_edges',
        label: 'Phase Edges',
    });
}

export function createMetaballGridEmberLatticeFamily(
    colorUtils: ColorUtils,
): MetaballGridPhaseEdgesFamily {
    return new MetaballGridPhaseEdgesFamily(colorUtils, {
        id: 'metaball_grid_ember_lattice',
        label: 'Ember Lattice',
    });
}
