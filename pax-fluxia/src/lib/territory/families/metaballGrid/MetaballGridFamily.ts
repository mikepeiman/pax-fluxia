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
        const progress = input.activeTransition?.progress ?? 1;

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
            readTunableNumber(input, 'METABALL_GRID_STRENGTH', GAME_CONFIG.METABALL_GRID_STRENGTH ?? 1.35),
        );
        const inwardOffsetPx = readTunableNumber(
            input,
            'METABALL_GRID_INWARD_OFFSET_PX',
            GAME_CONFIG.METABALL_GRID_INWARD_OFFSET_PX ?? 0,
        );

        // Owner → (colorIdx, hex) palette. Indices are an internal, stable
        // per-owner id used by the scene builder; hex is what we actually draw.
        const ownerColorIdx = new Map<string, number>();
        const hexByColorIdx: number[] = [];
        const ensureOwner = (ownerId: string | null | undefined): void => {
            if (!ownerId) return;
            if (ownerColorIdx.has(ownerId)) return;
            const idx = hexByColorIdx.length;
            ownerColorIdx.set(ownerId, idx);
            hexByColorIdx.push(this.colorUtils.getPlayerColor(ownerId));
        };
        for (const s of input.stars) ensureOwner(s.ownerId);
        for (const entry of input.activeTransition?.events ?? []) {
            ensureOwner(entry.event.previousOwner);
            ensureOwner(entry.event.newOwner);
        }

        const scene = renderMetaballGridScene({
            classification: cached.classification,
            wavePlan: cached.wavePlan,
            progress,
            flipTransition,
            flipWindow,
            strength,
            inwardOffsetPx,
            ownerColorIdx,
        });

        // Direct rect painting — one quad per scene cell. O(N). Far cheaper
        // than the shared metaball compositor (O(samples × internal_cells)
        // with per-pair gaussian falloff) and also eliminates the
        // "star-bubbles" artifact for this mode.
        const g = this.graphics;
        g.clear();
        const spacingPx = cached.classification.spacingPx;
        const half = spacingPx * 0.5;
        for (let i = 0; i < scene.cells.length; i++) {
            const c = scene.cells[i];
            if (c.alpha <= 0) continue;
            const hex = hexByColorIdx[c.colorIdx];
            if (hex === undefined) continue;
            g.rect(c.x - half, c.y - half, spacingPx, spacingPx).fill({
                color: hex,
                alpha: c.alpha,
            });
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
