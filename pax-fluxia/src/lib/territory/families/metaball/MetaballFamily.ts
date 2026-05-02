import * as PIXI from 'pixi.js';
import { GAME_CONFIG } from '$lib/config/game.config';
import {
    createMetaballRuntime,
    renderMetaball,
    type MetaballRenderMetrics,
    type MetaballRendererRuntime,
} from '$lib/renderers/MetaballRenderer';
import {
    logPipelineStage,
    summarizeRendererMetrics,
    summarizeScene,
} from '$lib/perf/pipelineTelemetry';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import type { RenderFamily, RenderFamilyInput, RenderFamilyOutput } from '../RenderFamilyTypes';
import {
    buildMetaballScene,
    buildMetaballStaticScene,
    type MetaballStaticScene,
} from './buildMetaballScene';
import {
    buildDerivedMetaballSceneInput,
    buildLocalizedMetaballSceneInput,
    buildMetaballTransitionSolveBounds,
    updateMetaballLocalOverlayMask,
} from './metaballLocalOverlay';
import {
    reconcileMetaballConquestCache,
    type MetaballConquestCacheEntry,
} from './metaballConquestTransitions';
import { measurePerf } from '$lib/perf/perfProbe';
import { readTunableNumber } from './metaballSceneBase';

const METABALL_TUNABLE_KEYS = [
    'MODIFIED_VORONOI_STAR_MARGIN',
    'MODIFIED_VORONOI_CORRIDOR_ENABLED',
    'MODIFIED_VORONOI_CORRIDOR_SPACING',
    'MODIFIED_VORONOI_DISCONNECT_ENABLED',
    'MODIFIED_VORONOI_DISCONNECT_DISTANCE',
    'TERRITORY_CX_COUNT',
    'TERRITORY_CX_WEIGHT',
    'TERRITORY_DX_WEIGHT',
    'TERRITORY_CX_CONTEST_MIDPOINT_VSTARS',
    'TERRITORY_TRANSITION_MS',
    'TERRITORY_TRANSITION_BIND_TO_TICK',
    'BASE_TICK_MS',
    'VS_VICTOR_TRAVEL_MS',
    'VS_LOSER_TRAVEL_MS',
    'VS_POWER_LERP_START',
    'VS_POWER_LERP_END',
    'VS_POWER_LERP_DURATION_MS',
    'VS_BIND_TO_TICK',
    'VS_TRANSITION_MODE',
    'METABALL_BURST_BOUNDARY_BASIS',
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
    'METABALL_BLUR_AFFECTS_BORDERS',
    'METABALL_COVERAGE',
    'METABALL_SATURATION',
    'METABALL_LIGHTNESS',
    'METABALL_BORDER_SATURATION',
    'METABALL_BORDER_LIGHTNESS',
    'METABALL_CHAIKIN_PASSES',
    'METABALL_FILL_FOLLOWS_GEOM',
    'METABALL_COMBAT_BORDER_TICKS',
    'METABALL_COMBAT_BORDER_PROXIMITY_PX',
    'METABALL_COMBAT_BORDER_WIDTH_BOOST',
    'METABALL_COMBAT_BORDER_ALPHA_BOOST',
    'METABALL_BORDER_FORCE_RATIO',
] as const;

function buildStaticSceneKey(input: RenderFamilyInput): string {
    let key = `${input.world.width}x${input.world.height}`;
    for (const tunableKey of METABALL_TUNABLE_KEYS) {
        key += `|${tunableKey}:${String(input.tunables.get(tunableKey))}`;
    }
    key += '|stars:';
    for (const star of input.stars) {
        key += `${star.id}:${star.ownerId ?? ''}:${star.x}:${star.y}:${star.activeShips ?? 0}:${star.damagedShips ?? 0}|`;
    }
    key += 'lanes:';
    for (const lane of input.lanes) {
        key += `${lane.sourceId}->${lane.targetId}|`;
    }
    key += 'transitions:';
    for (const transition of input.activeTransition?.events ?? []) {
        const conquest = transition.event;
        key += [
            conquest.tick,
            conquest.starId,
            conquest.previousOwner ?? '',
            conquest.newOwner ?? '',
            transition.startedAtMs,
            transition.durationMs,
        ].join(':');
        key += '|';
    }
    return key;
}

/**
 * RenderFamily adapter that assembles the metaball influence scene, then hands
 * the explicit sample field to the low-level CPU grid renderer.
 */
export class MetaballFamily implements RenderFamily {
    readonly id = 'metaball';
    readonly label = 'Metaball';
    readonly tunableKeys: readonly string[] = METABALL_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    private readonly baseLayer = new PIXI.Container();
    private readonly baseRenderLayer = new PIXI.Container();
    private readonly baseCutoutMask = new PIXI.Graphics();
    private readonly overlayLayer = new PIXI.Container();
    private readonly overlayRenderLayer = new PIXI.Container();
    private readonly colorUtils: ColorUtils;
    private readonly baseRuntime: MetaballRendererRuntime = createMetaballRuntime();
    private readonly overlayRuntime: MetaballRendererRuntime = createMetaballRuntime();
    private readonly conquestCache = new Map<string, MetaballConquestCacheEntry>();
    private staticSceneKey: string | null = null;
    private staticScene: MetaballStaticScene | null = null;

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
        this.rebuildDisplayGraph();
    }

    private rebuildDisplayGraph(): void {
        this.root.removeChildren();
        this.baseLayer.removeChildren();
        this.overlayLayer.removeChildren();
        this.baseLayer.addChild(this.baseRenderLayer);
        this.baseLayer.addChild(this.baseCutoutMask);
        this.overlayLayer.addChild(this.overlayRenderLayer);
        this.root.addChild(this.baseLayer);
        this.root.addChild(this.overlayLayer);
    }

    private ensureDisplayGraph(): void {
        if (
            this.baseLayer.parent === this.root &&
            this.overlayLayer.parent === this.root &&
            this.baseRenderLayer.parent === this.baseLayer &&
            this.baseCutoutMask.parent === this.baseLayer &&
            this.overlayRenderLayer.parent === this.overlayLayer
        ) {
            return;
        }
        this.rebuildDisplayGraph();
    }

    /** PIXI root for this family (detach when switching to another render mode). */
    get displayRoot(): PIXI.Container {
        return this.root;
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        return measurePerf('territory.metaballFamily.update', () => {
            this.ensureDisplayGraph();
            reconcileMetaballConquestCache({
                input,
                colorUtils: this.colorUtils,
                conquestCache: this.conquestCache,
            });
            const staticSceneKey = buildStaticSceneKey(input);
            const staticSceneCacheHit =
                this.staticSceneKey === staticSceneKey && Boolean(this.staticScene);
            if (!staticSceneCacheHit) {
                this.staticScene = measurePerf(
                    'territory.metaballFamily.buildStaticScene',
                    () => buildMetaballStaticScene(input, this.colorUtils),
                );
                this.staticSceneKey = staticSceneKey;
            }
            const sceneInput = measurePerf(
                'territory.metaballFamily.buildScene',
                () =>
                    buildMetaballScene(
                        input,
                        this.colorUtils,
                        this.conquestCache,
                        this.staticScene ?? undefined,
                    ),
            );
            logPipelineStage({
                channel: 'renderer',
                context: 'MetaballFamily',
                stage: 'family_scene',
                from: 'RenderFamilyInput',
                to: 'MetaballSceneInput',
                purpose: 'Hand off stable and dynamic sample fields to the grid renderer',
                summary: summarizeScene(sceneInput),
                perfEventName: 'territory.metaball.familySceneReady',
                perfDetail: {
                    staticSceneCacheHit,
                    conquestCacheEntries: this.conquestCache.size,
                    staticSceneKeyLength: staticSceneKey.length,
                },
                logDetail: {
                    renderInput: {
                        world: input.world,
                        gameTick: input.gameTick,
                        nowMs: input.nowMs,
                        paused: input.paused,
                        activeTransition: input.activeTransition,
                        ownershipVersion: input.ownership?.version ?? null,
                        geometryVersion: input.geometry?.version ?? null,
                    },
                    staticSceneCacheHit,
                    staticSceneKey,
                    conquestCacheKeys: [...this.conquestCache.keys()],
                    sceneInput,
                },
            });
            const renderMetrics: MetaballRenderMetrics = {
                solveMs: 0,
                textureUploadMs: 0,
                borderMs: 0,
                totalMs: 0,
                reusedFingerprint: false,
            };
            const overlayRenderMetrics: MetaballRenderMetrics = {
                solveMs: 0,
                textureUploadMs: 0,
                borderMs: 0,
                totalMs: 0,
                reusedFingerprint: false,
            };
            const influenceRadiusPx = readTunableNumber(
                input,
                'METABALL_INFLUENCE_RADIUS',
                GAME_CONFIG.METABALL_INFLUENCE_RADIUS ?? 90,
            );
            const blurPx = Math.max(
                0,
                readTunableNumber(
                    input,
                    'METABALL_BLUR',
                    GAME_CONFIG.METABALL_BLUR ?? 0,
                ),
            );
            const borderWidth = Math.max(
                0,
                readTunableNumber(
                    input,
                    'METABALL_BORDER_WIDTH',
                    GAME_CONFIG.METABALL_BORDER_WIDTH ?? 1.5,
                ),
            );
            const cellSize = Math.max(
                1,
                readTunableNumber(
                    input,
                    'METABALL_CELL_SIZE',
                    GAME_CONFIG.METABALL_CELL_SIZE ?? 10,
                ),
            );
            const coverage = Math.max(
                0,
                readTunableNumber(
                    input,
                    'METABALL_COVERAGE',
                    GAME_CONFIG.METABALL_COVERAGE ?? 0.25,
                ),
            );
            const solveBounds = this.staticScene
                ? buildMetaballTransitionSolveBounds({
                      input,
                      baseContext: this.staticScene.baseContext,
                      conquestCache: this.conquestCache,
                      influenceRadiusPx,
                      blurPx,
                      borderWidth,
                      cellSize,
                  })
                : null;
            const shouldUseLocalOverlay =
                Boolean(solveBounds) &&
                (sceneInput.dynamicSamples?.length ?? 0) > 0 &&
                Boolean(input.activeTransition?.events.length);
            const displayPad =
                Math.max(input.world.width, input.world.height) * coverage +
                influenceRadiusPx * 2 +
                blurPx * 6 +
                borderWidth * 2;
            const displayBounds = {
                minX: -displayPad,
                minY: -displayPad,
                maxX: input.world.width + displayPad,
                maxY: input.world.height + displayPad,
            };
            measurePerf('territory.metaballFamily.render', () => {
                if (shouldUseLocalOverlay && solveBounds) {
                    const baseSceneInput = buildDerivedMetaballSceneInput({
                        sceneInput,
                        staticSamples: sceneInput.staticSamples ?? [],
                        dynamicSamples: [],
                        sceneTag: 'staticBase',
                    });
                    const overlaySceneInput = buildLocalizedMetaballSceneInput({
                        sceneInput,
                        solveBounds,
                        sampleMarginPx: influenceRadiusPx * 2,
                        sceneTag: 'localOverlay',
                    });

                    updateMetaballLocalOverlayMask({
                        baseRenderLayer: this.baseRenderLayer,
                        baseMask: this.baseCutoutMask,
                        solveBounds,
                        displayBounds,
                    });
                    this.baseLayer.visible = true;
                    renderMetaball(
                        input.stars,
                        this.baseRenderLayer,
                        this.colorUtils,
                        input.world.width,
                        input.world.height,
                        input.lanes,
                        {
                            gameTick: input.gameTick,
                            sceneInput: baseSceneInput,
                            runtime: this.baseRuntime,
                            allowWorker: false,
                            metrics: renderMetrics,
                        },
                    );

                    this.overlayLayer.visible = overlaySceneInput.samples.length > 0;
                    if (this.overlayLayer.visible) {
                        renderMetaball(
                            input.stars,
                            this.overlayRenderLayer,
                            this.colorUtils,
                            input.world.width,
                            input.world.height,
                            input.lanes,
                            {
                                gameTick: input.gameTick,
                                sceneInput: overlaySceneInput,
                                runtime: this.overlayRuntime,
                                allowWorker: false,
                                metrics: overlayRenderMetrics,
                            },
                        );
                    }
                    return;
                }

                updateMetaballLocalOverlayMask({
                    baseRenderLayer: this.baseRenderLayer,
                    baseMask: this.baseCutoutMask,
                    solveBounds: null,
                    displayBounds,
                });
                this.baseLayer.visible = true;
                this.overlayLayer.visible = false;
                renderMetaball(
                    input.stars,
                    this.baseRenderLayer,
                    this.colorUtils,
                    input.world.width,
                    input.world.height,
                    input.lanes,
                    {
                        gameTick: input.gameTick,
                        sceneInput,
                        runtime: this.baseRuntime,
                        allowWorker: false,
                        metrics: renderMetrics,
                    },
                );
            });
            logPipelineStage({
                channel: 'renderer',
                context: 'MetaballFamily',
                stage: 'family_render',
                from: 'MetaballSceneInput',
                to: 'PIXI display root',
                purpose: 'Upload metaball texture and borders for presentation',
                summary:
                    shouldUseLocalOverlay && solveBounds
                        ? `base{${summarizeRendererMetrics(renderMetrics)}} overlay{${summarizeRendererMetrics(overlayRenderMetrics)}}`
                        : summarizeRendererMetrics(renderMetrics),
                perfEventName: 'territory.metaball.familyRendered',
                perfDetail: {
                    sceneFingerprint: sceneInput.sceneFingerprint,
                    staticSceneCacheHit,
                    localOverlay: shouldUseLocalOverlay,
                },
                logDetail: {
                    sceneFingerprint: sceneInput.sceneFingerprint,
                    staticSceneCacheHit,
                    solveBounds,
                    renderMetrics,
                    overlayRenderMetrics,
                },
            });
            return { container: this.root };
        });
    }

    dispose(): void {
        this.baseRuntime.dispose();
        this.overlayRuntime.dispose();
        this.conquestCache.clear();
        this.staticSceneKey = null;
        this.staticScene = null;
        this.baseRenderLayer.mask = null;
        this.baseCutoutMask.clear();
        this.rebuildDisplayGraph();
    }
}

export function createMetaballFamily(colorUtils: ColorUtils): MetaballFamily {
    return new MetaballFamily(colorUtils);
}
