import * as PIXI from 'pixi.js';
import {
    createMetaballRuntime,
    renderMetaball,
    type MetaballRenderMetrics,
    type MetaballRendererRuntime,
} from '$lib/renderers/MetaballRenderer';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { StarState } from '$lib/types/game.types';
import type { ResolvedGeometrySnapshot } from '../../contracts/GeometryContracts';
import { normalizePerimeterFieldGeometrySource } from '../../geometry/geometrySource';
import { buildPerimeterFieldRenderFamilyGeometry } from '../buildFamilyGeometry';
import {
    buildTransitionPlan,
    sampleVSetFromGeometry,
} from './perimeterFieldPlanEngine';
import type {
    RenderFamily,
    RenderFamilyInput,
    RenderFamilyOutput,
} from '../RenderFamilyTypes';
import {
    buildPerimeterFieldScene,
    type PerimeterFieldDebugSnapshot,
} from './buildPerimeterFieldScene';
import type { TransitionPlan } from './perimeterFieldTransitionTypes';
import { measurePerf } from '$lib/perf/perfProbe';

const PERIMETER_FIELD_TUNABLE_KEYS = [
    'PERIMETER_FIELD_GEOMETRY_SOURCE',
    'PERIMETER_FIELD_TRANSITION_ENGINE',
    'PERIMETER_FIELD_SAMPLE_SPACING',
    'PERIMETER_FIELD_INWARD_OFFSET_PX',
    'PERIMETER_FIELD_INFLUENCE_RADIUS',
    'PERIMETER_FIELD_INFLUENCE_WEIGHT',
    'PERIMETER_FIELD_TRANSITION_RAY_COUNT',
    'PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION',
    'PERIMETER_FIELD_OLD_BOUNDARY_FADE',
    'PERIMETER_FIELD_NEW_BOUNDARY_GROW',
    'PERIMETER_FIELD_DEBUG_SHOW_GEOMETRY',
    'PERIMETER_FIELD_DEBUG_SHOW_VSTARS',
    'PERIMETER_FIELD_DEBUG_SCRUB_ENABLED',
    'PERIMETER_FIELD_DEBUG_REPLAY_SLOT',
    'PERIMETER_FIELD_DEBUG_SCRUB_PROGRESS',
    'TERRITORY_TRANSITION_MS',
    'TERRITORY_TRANSITION_BIND_TO_TICK',
    'TERRITORY_SURFACE_ALPHA',
    'METABALL_CELL_SIZE',
    'METABALL_THRESHOLD',
    'METABALL_EDGE_FADE',
    'TERRITORY_SURFACE_BORDER_WIDTH',
    'TERRITORY_SURFACE_BORDER_ALPHA',
    'METABALL_BLUR',
    'METABALL_BLUR_AFFECTS_BORDERS',
    'METABALL_COVERAGE',
    'TERRITORY_SURFACE_SATURATION',
    'TERRITORY_SURFACE_LIGHTNESS',
    'TERRITORY_SURFACE_BORDER_SATURATION',
    'TERRITORY_SURFACE_BORDER_LIGHTNESS',
    'METABALL_CHAIKIN_PASSES',
] as const;

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
        .map((star) => star.id)
        .sort((a, b) => a.localeCompare(b))
        .join('|');
    return `${input.world.width}x${input.world.height}:${starIds}`;
}

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

function readFreezeBaseDuringTransition(input: RenderFamilyInput): boolean {
    const value = input.tunables.get(
        'PERIMETER_FIELD_FREEZE_BASE_DURING_TRANSITION',
    );
    if (typeof value === 'boolean' && value === false) {
        // This mode currently requires PREV-base rendering for visible fill/frontier motion.
        // Allowing NEXT-base here collapses the transition into a snap plus moving diagnostics.
        return true;
    }
    return true;
}

function readNumber(input: RenderFamilyInput, key: string, fallback: number): number {
    const value = input.tunables.get(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readString(input: RenderFamilyInput, key: string, fallback: string): string {
    const value = input.tunables.get(key);
    return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function readTransitionEngine(input: RenderFamilyInput): 'legacy' | 'plan' {
    const value = readString(input, 'PERIMETER_FIELD_TRANSITION_ENGINE', 'plan');
    return value === 'legacy' ? 'legacy' : 'plan';
}

function buildOwnerToCluster(stars: ReadonlyArray<StarState>): ReadonlyMap<string, number> {
    const owners = [...new Set(
        stars
            .map((star) => star.ownerId)
            .filter((ownerId): ownerId is string => Boolean(ownerId)),
    )].sort();
    return new Map(owners.map((ownerId, index) => [ownerId, index] as const));
}


export class PerimeterFieldFamily implements RenderFamily {
    readonly id = 'perimeter_field';
    readonly label = 'Perimeter Field';
    readonly tunableKeys: readonly string[] = PERIMETER_FIELD_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    private readonly colorUtils: ColorUtils;
    private readonly runtime: MetaballRendererRuntime = createMetaballRuntime();
    private sessionKey: string | null = null;
    private oldGeometryKey: string | null = null;
    private oldGeometry: ResolvedGeometrySnapshot | null = null;
    private transitionPlanKey: string | null = null;
    private transitionPlan: TransitionPlan | null = null;
    private lastDebugSnapshot: PerimeterFieldDebugSnapshot | null = null;

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
    }

    get displayRoot(): PIXI.Container {
        return this.root;
    }

    get debugSnapshot(): PerimeterFieldDebugSnapshot | null {
        return this.lastDebugSnapshot;
    }

    private resetState(): void {
        this.oldGeometryKey = null;
        this.oldGeometry = null;
        this.transitionPlanKey = null;
        this.transitionPlan = null;
        this.lastDebugSnapshot = null;
    }

    private buildSceneForInput(params: {
        input: RenderFamilyInput;
        currentGeometry: ResolvedGeometrySnapshot;
    }) {
        const transitionKey = buildTransitionKey(params.input);
        const transitionEngine = readTransitionEngine(params.input);
        let displayStars = params.input.stars;
        let displayGeometry = params.currentGeometry;
        if (
            transitionKey &&
            readFreezeBaseDuringTransition(params.input)
        ) {
            const prevGeometry =
                transitionEngine === 'plan'
                    ? this.transitionPlan?.prevGeometry ?? this.oldGeometry
                    : this.oldGeometry;
            if (prevGeometry) {
                displayStars = revertStarsForTransition(params.input);
                displayGeometry = prevGeometry;
            }
        }

        const builtScene = buildPerimeterFieldScene({
            input: params.input,
            starsForDisplay: displayStars,
            geometry: displayGeometry,
            transitionTargetGeometry: transitionKey ? params.currentGeometry : null,
            transitionPlan: transitionEngine === 'plan' ? this.transitionPlan : null,
            colorUtils: this.colorUtils,
        });

        return { builtScene, displayStars };
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        return measurePerf('territory.perimeterFieldFamily.update', () => {
            const nextSessionKey = buildSessionKey(input);
            if (this.sessionKey !== nextSessionKey) {
                this.sessionKey = nextSessionKey;
                this.resetState();
            }

            const currentGeometry = input.geometry;
            if (!currentGeometry) {
                this.root.visible = false;
                this.lastDebugSnapshot = null;
                return { container: this.root };
            }


            const transitionKey = buildTransitionKey(input);
            const geometrySource =
                normalizePerimeterFieldGeometrySource(
                    input.tunables.get('PERIMETER_FIELD_GEOMETRY_SOURCE'),
                );
            const transitionEngine = readTransitionEngine(input);
            const oldGeometryCacheHit =
                Boolean(transitionKey) && this.oldGeometryKey === transitionKey;
            const transitionPlanCacheHit =
                transitionEngine === 'plan' &&
                Boolean(transitionKey) &&
                this.transitionPlanKey === transitionKey &&
                Boolean(this.transitionPlan);

            if (transitionKey && this.oldGeometryKey !== transitionKey) {
                const revertedStars = revertStarsForTransition(input);
                this.oldGeometry = measurePerf(
                    'territory.perimeterFieldFamily.buildOldGeometry',
                    () =>
                        buildPerimeterFieldRenderFamilyGeometry({
                            stars: revertedStars,
                            lanes: input.lanes,
                            worldWidth: input.world.width,
                            worldHeight: input.world.height,
                            nowMs: input.nowMs,
                            geometrySource,
                        }),
                );
                this.oldGeometryKey = transitionKey;
            } else if (!transitionKey) {
                this.oldGeometryKey = null;
                this.oldGeometry = null;
            }

            if (transitionEngine === 'plan' && transitionKey && this.oldGeometry) {
                if (this.transitionPlanKey !== transitionKey || !this.transitionPlan) {
                    const spacing = readNumber(
                        input,
                        'PERIMETER_FIELD_SAMPLE_SPACING',
                        28,
                    );
                    const offsetPx = Math.max(
                        0,
                        readNumber(input, 'PERIMETER_FIELD_INWARD_OFFSET_PX', 10),
                    );
                    const strength = readNumber(
                        input,
                        'PERIMETER_FIELD_INFLUENCE_WEIGHT',
                        1.35,
                    );
                    const prevStars = revertStarsForTransition(input);
                    const ownerToCluster = buildOwnerToCluster([
                        ...prevStars,
                        ...input.stars,
                    ]);
                    const prevVSet = measurePerf(
                        'territory.perimeterFieldFamily.buildPrevVSet',
                        () =>
                            sampleVSetFromGeometry({
                                geometry: this.oldGeometry!,
                                options: { spacing, offsetPx, strength, ownerToCluster },
                            }),
                    );
                    const nextVSet = measurePerf(
                        'territory.perimeterFieldFamily.buildNextVSet',
                        () =>
                            sampleVSetFromGeometry({
                                geometry: currentGeometry,
                                options: { spacing, offsetPx, strength, ownerToCluster },
                            }),
                    );

                    if (prevVSet.length > 0 && nextVSet.length > 0) {
                        this.transitionPlan = measurePerf(
                            'territory.perimeterFieldFamily.buildTransitionPlan',
                            () =>
                                buildTransitionPlan({
                                    conquestKey: transitionKey,
                                    prevVSet,
                                    nextVSet,
                                    conquestEvents: input.activeTransition?.events ?? [],
                                    prevGeometry: this.oldGeometry!,
                                    nextGeometry: currentGeometry,
                                }),
                        );
                        this.transitionPlanKey = transitionKey;
                    } else {
                        this.transitionPlan = null;
                        this.transitionPlanKey = null;
                    }
                }
            } else {
                this.transitionPlan = null;
                this.transitionPlanKey = null;
            }

            const { builtScene, displayStars } = measurePerf(
                'territory.perimeterFieldFamily.buildScene',
                () =>
                    this.buildSceneForInput({
                        input,
                        currentGeometry,
                    }),
            );
            this.lastDebugSnapshot = builtScene.debug;

            const renderMetrics: MetaballRenderMetrics = {
                solveMs: 0,
                textureUploadMs: 0,
                borderMs: 0,
                totalMs: 0,
                reusedFingerprint: false,
            };

            measurePerf('territory.perimeterFieldFamily.render', () => {
                renderMetaball(
                    displayStars,
                    this.root,
                    this.colorUtils,
                    input.world.width,
                    input.world.height,
                    input.lanes,
                    {
                        gameTick: input.gameTick,
                        sceneInput: builtScene.sceneInput,
                        runtime: this.runtime,
                        metrics: renderMetrics,
                    },
                );
            });


            return { container: this.root };
        });
    }

    dispose(): void {
        this.runtime.dispose();
        this.sessionKey = null;
        this.resetState();
        this.root.removeChildren();
    }
}

export function createPerimeterFieldFamily(colorUtils: ColorUtils): PerimeterFieldFamily {
    return new PerimeterFieldFamily(colorUtils);
}
