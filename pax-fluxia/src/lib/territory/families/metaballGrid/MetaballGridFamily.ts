/**
 * metaball-grid — RenderFamily adapter (MG5)
 *
 * Wires the pure functions (classification → wave plan → scene) into the live
 * render loop. Converts the per-frame `GridRenderCell[]` into a
 * `MetaballSceneInput` and hands it to the shared `renderMetaball` compositor.
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
import type { MetaballInfluenceSample, MetaballSceneInput } from '$lib/renderers/MetaballRenderer';
import { renderMetaball, resetMetaballCache } from '$lib/renderers/MetaballRenderer';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarState } from '$lib/types/game.types';
import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
import { buildPerimeterFieldRenderFamilyGeometry } from '../buildFamilyGeometry';
import { buildMetaballBaseContext } from '../metaball/metaballSceneBase';
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
    // Shared knobs already consumed by the metaball compositor:
    'METABALL_INFLUENCE_RADIUS',
    'METABALL_FALLOFF',
    'METABALL_BLEND_SHARPNESS',
    'METABALL_ALPHA',
    'METABALL_CELL_SIZE',
    'METABALL_THRESHOLD',
    'METABALL_STRENGTH_MULT',
    'METABALL_EDGE_FADE',
    'METABALL_BORDER_WIDTH',
    'METABALL_BORDER_ALPHA',
    'METABALL_BLUR',
    'METABALL_CHAIKIN_PASSES',
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
    private readonly colorUtils: ColorUtils;
    private sessionKey: string | null = null;
    private cachedPlan: CachedPlan | null = null;

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
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

        const classification = buildGridClassification({
            world: { width: input.world.width, height: input.world.height },
            spacingPx,
            originMode,
            prevGeometry,
            nextGeometry: currentGeometry,
            conquestEvents,
            resolveStarPosition,
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
     * Build a steady-state plan (no active transition): prev === next, so the
     * classification yields natives everywhere and the wave plan is empty.
     */
    private buildSteadyStatePlan(params: {
        input: RenderFamilyInput;
        currentGeometry: CanonicalGeometrySnapshot;
    }): CachedPlan {
        const { input, currentGeometry } = params;

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

        const classification = buildGridClassification({
            world: { width: input.world.width, height: input.world.height },
            spacingPx,
            originMode,
            prevGeometry: currentGeometry,
            nextGeometry: currentGeometry,
            conquestEvents: [],
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

        // Build the palette bridge from the existing metaball base context. This
        // guarantees colour indices align with the shared compositor.
        const baseContext = buildMetaballBaseContext(input, this.colorUtils, new Map());
        const ownerColorIdx = new Map<string, number>();
        // ensureOwnerClusterIdx may add synthetic entries; seed with every known owner.
        for (const info of baseContext.clusterMap.values()) {
            ownerColorIdx.set(info.ownerId, baseContext.ensureOwnerClusterIdx(info.ownerId));
        }
        // Any event owners not yet seeded (e.g. from activeTransition).
        for (const entry of input.activeTransition?.events ?? []) {
            if (!ownerColorIdx.has(entry.event.previousOwner)) {
                ownerColorIdx.set(
                    entry.event.previousOwner,
                    baseContext.ensureOwnerClusterIdx(entry.event.previousOwner),
                );
            }
            if (!ownerColorIdx.has(entry.event.newOwner)) {
                ownerColorIdx.set(
                    entry.event.newOwner,
                    baseContext.ensureOwnerClusterIdx(entry.event.newOwner),
                );
            }
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

        // Convert grid cells → metaball influence samples. Fold alpha into
        // strength so the metaball field naturally weights each contribution.
        const samples: MetaballInfluenceSample[] = [];
        for (const c of scene.cells) {
            if (c.alpha <= 0 || c.strength <= 0) continue;
            samples.push({
                id: c.pass === 'single' ? c.vId : `${c.vId}#${c.pass}`,
                x: c.x,
                y: c.y,
                playerIdx: c.colorIdx,
                strength: c.strength * c.alpha,
            });
        }

        const sceneInput: MetaballSceneInput = {
            ownedStars: baseContext.ownedStars,
            clusterMap: baseContext.clusterMap,
            playerColors: baseContext.playerColors,
            clusterShips: baseContext.clusterShips,
            samples,
            fingerprint: `mg:${cached.transitionKey}:${progress.toFixed(4)}:${flipTransition}:${flipWindow}:${strength}:${samples.length}`,
        };

        renderMetaball(
            [...input.stars],
            this.root,
            this.colorUtils,
            input.world.width,
            input.world.height,
            [...input.lanes],
            { gameTick: input.gameTick, sceneInput },
        );

        return { container: this.root };
    }

    dispose(): void {
        resetMetaballCache();
        this.sessionKey = null;
        this.resetState();
        this.root.removeChildren();
    }
}

export function createMetaballGridFamily(colorUtils: ColorUtils): MetaballGridFamily {
    return new MetaballGridFamily(colorUtils);
}
