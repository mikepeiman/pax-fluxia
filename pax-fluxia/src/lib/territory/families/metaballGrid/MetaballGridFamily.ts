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
import { adjustColorHSL } from '$lib/utils/colorUtils';
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
    GridFlipTransition,
    GridOriginMode,
    GridOwnedStar,
    GridWaveGeometry,
    GridWavePlan,
    GridWaveSeeding,
} from './metaballGridTypes';
import { planGridWave } from './planGridWave';
import { renderMetaballGridScene } from './renderMetaballGridScene';

// ─── Tunable option unions (mirror METABALL_GRID_* keys) ──────────────────────

type GridCellShape = 'square' | 'circle' | 'diamond';
type GridBorderMode = 'off' | 'per_cell' | 'territory_edge';
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
    'METABALL_GRID_WAVE_EASE',
    'METABALL_GRID_FLIP_WINDOW_JITTER',
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
            ['square', 'circle', 'diamond'],
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

        // For 'territory_edge' borders we need to know the cell's neighbours in
        // the classification grid to decide whether to stroke. Pre-build an id→cell
        // map from the full vstar list lazily.
        let neighborOwnerLookup: ((x: number, y: number, ownerIdx: number) => boolean) | null = null;
        if (drawTerritoryEdgeOnly) {
            // Scene cells carry colorIdx (= palette index). We need to compare
            // against the NEXT-owner colorIdx of the 4 grid neighbours.
            const cols = cached.classification.cols;
            const vstars = cached.classification.vstars;
            const ownerIdxByGridIdx = new Int32Array(vstars.length);
            for (let i = 0; i < vstars.length; i++) {
                const v = vstars[i];
                const ownerId = v.nextOwnerId ?? v.prevOwnerId;
                const idx = ownerId ? ownerColorIdx.get(ownerId) : undefined;
                ownerIdxByGridIdx[i] = idx === undefined ? -1 : idx;
            }
            const originMode = cached.classification.originMode;
            const offset = originMode === 'centered' ? spacingPx * 0.5 : 0;
            neighborOwnerLookup = (cx, cy, cellOwnerIdx) => {
                // Recover grid indices from world coords.
                const ix = Math.round((cx - offset) / spacingPx);
                const iy = Math.round((cy - offset) / spacingPx);
                const rows = cached.classification.rows;
                const check = (nx: number, ny: number): boolean => {
                    if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) return true; // world edge = edge
                    const nIdx = ownerIdxByGridIdx[ny * cols + nx];
                    return nIdx !== cellOwnerIdx;
                };
                return (
                    check(ix - 1, iy) || check(ix + 1, iy) || check(ix, iy - 1) || check(ix, iy + 1)
                );
            };
        }

        for (let i = 0; i < scene.cells.length; i++) {
            const c = scene.cells[i];
            if (c.alpha <= 0) continue;
            const fillHex = fillHexByColorIdx[c.colorIdx];
            if (fillHex === undefined) continue;
            const alpha = c.alpha * fillAlphaMult;
            if (alpha <= 0) continue;

            const x = c.x;
            const y = c.y;

            // Fill primitive
            if (cellShape === 'circle') {
                g.circle(x, y, half).fill({ color: fillHex, alpha });
            } else if (cellShape === 'diamond') {
                g.poly([x, y - half, x + half, y, x, y + half, x - half, y]).fill({
                    color: fillHex,
                    alpha,
                });
            } else if (cornerR > 0) {
                g.roundRect(x - half, y - half, size, size, cornerR).fill({
                    color: fillHex,
                    alpha,
                });
            } else {
                g.rect(x - half, y - half, size, size).fill({ color: fillHex, alpha });
            }

            // Border stroke (optional)
            if (!drawBorders) continue;
            if (drawTerritoryEdgeOnly && neighborOwnerLookup && !neighborOwnerLookup(x, y, c.colorIdx)) {
                continue; // interior cell, skip stroke
            }
            const borderHex = borderHexByColorIdx[c.colorIdx];
            if (borderHex === undefined) continue;
            const strokeOpts = { color: borderHex, alpha: borderAlpha, width: borderWidth };
            if (cellShape === 'circle') {
                g.circle(x, y, half).stroke(strokeOpts);
            } else if (cellShape === 'diamond') {
                g.poly([x, y - half, x + half, y, x, y + half, x - half, y]).stroke(strokeOpts);
            } else if (cornerR > 0) {
                g.roundRect(x - half, y - half, size, size, cornerR).stroke(strokeOpts);
            } else {
                g.rect(x - half, y - half, size, size).stroke(strokeOpts);
            }
        }

        // Silence unused-var lint for `inwardOffsetPx` — it is intentionally
        // read + passed to the scene builder but the builder currently leaves
        // positions unchanged (see renderMetaballGridScene docstring). Keeping
        // the plumbing makes MG9 debug overlay work straightforward.
        void inwardOffsetPx;

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
