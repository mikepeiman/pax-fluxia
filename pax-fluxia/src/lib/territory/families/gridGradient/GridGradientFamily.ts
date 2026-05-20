import * as PIXI from 'pixi.js';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import { resolvePixiRendererDiagnostics } from '$lib/renderers/pixiRendererDiagnostics';
import { recordPerfDuration } from '$lib/perf/perfProbe';
import { log } from '$lib/utils/logger';
import {
    buildOwnershipGridFrontierDistanceField,
    createOwnershipGridFrontierDistanceFieldBuffers,
    type OwnershipGridFrontierDistanceField,
    type OwnershipGridFrontierDistanceFieldBuffers,
} from '$lib/territory/frontier';
import type { ResolvedGeometrySnapshot } from '../../contracts/GeometryContracts';
import type {
    RenderFamily,
    RenderFamilyInput,
    RenderFamilyOutput,
} from '../RenderFamilyTypes';
import type {
    GridOwnedStar,
} from '../metaballGrid/metaballGridTypes';
import type {
    MetaballGridPlanWorkerRequest,
    MetaballGridPlanWorkerResponse,
} from '../metaballGrid/metaballGridPlanWorkerTypes';
import { renderMetaballGridScene } from '../metaballGrid/renderMetaballGridScene';
import {
    buildGridGradientBorderDots,
    buildGridGradientOwnerDistanceSummary,
    buildOwnerIndexByCell,
    resolveGridGradientCellSize,
    type GridGradientOwnerDistanceSummary,
} from './gridGradientScene';
import {
    buildGridGradientPalette,
    drawGridGradientCell,
    drawGridGradientVectorBorders,
    type GridGradientPalette,
} from './paint';
import {
    buildGridGradientPlan,
    buildGridGradientPlanKey,
    toGridGradientOwnedStars,
    toGridGradientPreviousOwnedStars,
    type CachedGridGradientPlan,
} from './plan';
import {
    GRID_GRADIENT_TUNABLE_KEYS,
    resolveGridGradientSettings,
    type GridGradientSettings,
} from './settings';
import {
    resetGridGradientStats,
    updateGridGradientStats,
} from './gridGradientStats';
import { buildGridGradientShaderFieldTexturePlan } from './shaderField/gridGradientShaderFieldPacking';
import { GridGradientShaderFieldRenderer } from './shaderField/GridGradientShaderFieldRenderer';
import type {
    GridGradientDrawBackend,
    GridGradientShaderFieldStats,
    GridGradientShaderFieldTexturePlan,
} from './shaderField/gridGradientShaderFieldTypes';

interface PlanResolveResult {
    readonly plan: CachedGridGradientPlan;
    readonly cacheHit: boolean;
    readonly rebuildReason: string | null;
    readonly requestedPlanKey: string | null;
    readonly requestedPlanPending: boolean;
}

interface GridGradientPlanWorkerMeta {
    readonly requestId: number;
    readonly sessionKey: string;
    readonly planKey: string;
}

interface PendingGridGradientPlanWorker {
    readonly request: MetaballGridPlanWorkerRequest;
    readonly meta: GridGradientPlanWorkerMeta;
}

interface GridGradientVisualTransition {
    readonly planKey: string;
    readonly startedAtMs: number;
    readonly durationMs: number;
}

interface PendingGridGradientTransitionPlan {
    readonly planKey: string;
    readonly durationMs: number;
}

type GridGradientClockSource = 'none' | 'scheduler' | 'local';
type GridGradientVisibleFrameState =
    | 'steady'
    | 'holding_pre'
    | 'requested_plan'
    | 'fallback_plan';

interface GridGradientProgressState {
    readonly progress: number;
    readonly visibleFrameState: GridGradientVisibleFrameState;
    readonly clockSource: GridGradientClockSource;
    readonly holdingForPlan: boolean;
    readonly usingVisualTransition: boolean;
}

interface DistanceInputs {
    readonly ownerIndexByCell: Int32Array;
    readonly distanceField: OwnershipGridFrontierDistanceField;
    readonly distanceSummary: GridGradientOwnerDistanceSummary;
    readonly distanceBuildMs: number;
    readonly ownerSummaryBuildMs: number;
}

interface ShaderTextureResolveResult {
    readonly texturePlan: GridGradientShaderFieldTexturePlan;
    readonly cacheHit: boolean;
    readonly rebuildReason: string | null;
}

interface GraphicsPaintResult {
    readonly paintedCells: number;
    readonly sceneBuildMs: number;
    readonly paintMs: number;
}

interface RoleCounts {
    readonly activeTransitionCells: number;
    readonly outsideCells: number;
}

const EMPTY_SHADER_STATS: GridGradientShaderFieldStats = {
    drawBackend: 'graphics',
    neighborMode: 'eight',
    textureUploaded: false,
    textureUploadMs: 0,
    uniformUpdateMs: 0,
    ownerTextureBytes: 0,
    metricsTextureBytes: 0,
    paletteTextureBytes: 0,
    textureBytes: 0,
    totalCells: 0,
    emittableCells: 0,
    activeTransitionCells: 0,
    outsideCells: 0,
    fallbackReason: null,
};

function clamp01(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
}

function buildGridGradientSessionKey(input: RenderFamilyInput): string {
    const starIds = [...input.stars]
        .map((star) => star.id)
        .sort((a, b) => a.localeCompare(b))
        .join('|');
    return [
        input.world.minX ?? 0,
        input.world.minY ?? 0,
        input.world.width,
        input.world.height,
        starIds,
    ].join(':');
}

export class GridGradientFamily implements RenderFamily {
    readonly id = 'grid_gradient';
    readonly label = 'Grid Gradient';
    readonly tunableKeys: readonly string[] = GRID_GRADIENT_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    private readonly shaderFieldRenderer = new GridGradientShaderFieldRenderer();
    private readonly fillGraphics = new PIXI.Graphics();
    private readonly borderDotGraphics = new PIXI.Graphics();
    private readonly vectorBorderGraphics = new PIXI.Graphics();
    private readonly colorUtils: ColorUtils;
    private cachedPlan: CachedGridGradientPlan | null = null;
    private cachedShaderTexturePlan: GridGradientShaderFieldTexturePlan | null = null;
    private sessionKey: string | null = null;
    private planWorker: Worker | null = null;
    private nextPlanWorkerRequestId = 1;
    private activePlanWorkerMeta: GridGradientPlanWorkerMeta | null = null;
    private queuedPlanWorker: PendingGridGradientPlanWorker | null = null;
    private latestPlanWorkerResponse: MetaballGridPlanWorkerResponse | null = null;
    private latestPlanWorkerMeta: GridGradientPlanWorkerMeta | null = null;
    private activeVisualTransition: GridGradientVisualTransition | null = null;
    private pendingTransitionPlan: PendingGridGradientTransitionPlan | null = null;
    private distanceFieldBuffers: OwnershipGridFrontierDistanceFieldBuffers | null =
        null;
    private borderDotSignature: string | null = null;
    private vectorBorderSignature: string | null = null;
    private borderDotCount = 0;
    private vectorBorderCount = 0;
    private lastDebugSnapshot: Record<string, unknown> | null = null;
    private emaUpdateMs = 0;
    private loggedShaderFailure = false;

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
        this.root.addChild(
            this.shaderFieldRenderer.container,
            this.fillGraphics,
            this.borderDotGraphics,
            this.vectorBorderGraphics,
        );
    }

    get displayRoot(): PIXI.Container {
        return this.root;
    }

    getDebugSnapshot(): Record<string, unknown> | null {
        return this.lastDebugSnapshot;
    }

    private resetPlanState(): void {
        this.cachedPlan = null;
        this.cachedShaderTexturePlan = null;
        this.latestPlanWorkerResponse = null;
        this.latestPlanWorkerMeta = null;
        this.activePlanWorkerMeta = null;
        this.queuedPlanWorker = null;
        this.activeVisualTransition = null;
        this.pendingTransitionPlan = null;
        this.distanceFieldBuffers = null;
        this.borderDotSignature = null;
        this.vectorBorderSignature = null;
    }

    private ensurePlanWorker(): Worker | null {
        if (typeof window === 'undefined' || typeof Worker === 'undefined') {
            return null;
        }
        if (this.planWorker) return this.planWorker;
        const worker = new Worker(
            new URL('../metaballGrid/metaballGridPlan.worker.ts', import.meta.url),
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

    private enqueuePlanWorkerRequest(params: PendingGridGradientPlanWorker): boolean {
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

    private isPlanRequestPending(planKey: string | null): boolean {
        if (!planKey) return false;
        return (
            this.pendingTransitionPlan?.planKey === planKey ||
            this.activePlanWorkerMeta?.planKey === planKey ||
            this.queuedPlanWorker?.meta.planKey === planKey ||
            this.latestPlanWorkerMeta?.planKey === planKey
        );
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
    }

    private expireVisualTransition(nowMs: number): void {
        const active = this.activeVisualTransition;
        if (!active) return;
        if (nowMs - active.startedAtMs < Math.max(1, active.durationMs)) {
            return;
        }
        this.activeVisualTransition = null;
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
            classificationBuildMs: response.classificationBuildMs,
            wavePlanBuildMs: response.wavePlanBuildMs,
        };
        this.cachedShaderTexturePlan = null;
        this.borderDotSignature = null;
        if (this.pendingTransitionPlan?.planKey === response.planKey) {
            this.beginVisualTransition(
                response.planKey,
                nowMs,
                this.pendingTransitionPlan.durationMs,
            );
        }
        return true;
    }

    private buildWorkerRequest(params: {
        readonly input: RenderFamilyInput;
        readonly geometry: ResolvedGeometrySnapshot;
        readonly prevGeometry: ResolvedGeometrySnapshot;
        readonly settings: GridGradientSettings;
        readonly planKey: string;
        readonly prevOwnedStars: readonly GridOwnedStar[];
        readonly nextOwnedStars: readonly GridOwnedStar[];
    }): PendingGridGradientPlanWorker {
        const requestId = this.nextPlanWorkerRequestId++;
        const sameSnapshot =
            params.prevGeometry === params.geometry &&
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
                conquestEvents: params.input.activeTransition?.conquestEvents ?? [],
                prevRegions: params.prevGeometry.territoryRegions,
                nextRegions: sameSnapshot
                    ? params.prevGeometry.territoryRegions
                    : params.geometry.territoryRegions,
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
            },
        };
    }

    private resolvePlan(params: {
        readonly input: RenderFamilyInput;
        readonly geometry: ResolvedGeometrySnapshot;
        readonly settings: GridGradientSettings;
    }): PlanResolveResult {
        const prevGeometry =
            params.input.activeTransition && params.input.prevGeometry
                ? params.input.prevGeometry
                : params.geometry;
        const planKey = buildGridGradientPlanKey({
            input: params.input,
            geometry: params.geometry,
            prevGeometry,
            settings: params.settings,
        });
        const hasActiveTransition =
            (params.input.activeTransition?.events.length ?? 0) > 0;
        const requestedPlanKey = hasActiveTransition ? planKey : null;

        if (this.cachedPlan?.planKey === planKey) {
            return {
                plan: this.cachedPlan,
                cacheHit: true,
                rebuildReason: null,
                requestedPlanKey,
                requestedPlanPending: this.isPlanRequestPending(requestedPlanKey),
            };
        }

        const visualTransitionStillActive =
            !hasActiveTransition &&
            this.activeVisualTransition !== null &&
            this.cachedPlan?.planKey === this.activeVisualTransition.planKey;
        if (visualTransitionStillActive && this.cachedPlan) {
            return {
                plan: this.cachedPlan,
                cacheHit: true,
                rebuildReason: null,
                requestedPlanKey: null,
                requestedPlanPending: false,
            };
        }

        const ownedStars = toGridGradientOwnedStars(params.input.stars);
        const previousOwnedStars = hasActiveTransition
            ? toGridGradientPreviousOwnedStars(params.input)
            : ownedStars;
        if (this.cachedPlan) {
            const scheduled = this.enqueuePlanWorkerRequest(
                this.buildWorkerRequest({
                    input: params.input,
                    geometry: params.geometry,
                    prevGeometry,
                    settings: params.settings,
                    planKey,
                    prevOwnedStars: previousOwnedStars,
                    nextOwnedStars: ownedStars,
                }),
            );
            if (scheduled) {
                if (hasActiveTransition && params.input.activeTransition) {
                    this.pendingTransitionPlan = {
                        planKey,
                        durationMs: params.input.activeTransition.durationMs,
                    };
                }
                return {
                    plan: this.cachedPlan,
                    cacheHit: true,
                    rebuildReason: 'worker_pending',
                    requestedPlanKey,
                    requestedPlanPending: true,
                };
            }
        }

        const rebuildReason = this.cachedPlan ? 'key_change' : 'initial';
        this.cachedPlan = buildGridGradientPlan({
            input: params.input,
            geometry: params.geometry,
            prevGeometry,
            settings: params.settings,
            planKey,
        });
        this.cachedShaderTexturePlan = null;
        this.borderDotSignature = null;
        if (hasActiveTransition && params.input.activeTransition) {
            this.beginVisualTransition(
                planKey,
                params.input.nowMs,
                params.input.activeTransition.durationMs,
            );
        }
        return {
            plan: this.cachedPlan,
            cacheHit: false,
            rebuildReason,
            requestedPlanKey,
            requestedPlanPending: false,
        };
    }

    private resolveProgressState(params: {
        readonly input: RenderFamilyInput;
        readonly plan: CachedGridGradientPlan;
        readonly requestedPlanKey: string | null;
    }): GridGradientProgressState {
        const activeVisual = this.activeVisualTransition;
        if (activeVisual && activeVisual.planKey === params.plan.planKey) {
            const durationMs = Math.max(1, activeVisual.durationMs);
            return {
                progress: clamp01((params.input.nowMs - activeVisual.startedAtMs) / durationMs),
                visibleFrameState: 'requested_plan',
                clockSource: 'local',
                holdingForPlan: false,
                usingVisualTransition: true,
            };
        }

        if (
            params.input.activeTransition &&
            params.requestedPlanKey !== null &&
            params.plan.planKey !== params.requestedPlanKey
        ) {
            return {
                progress: 0,
                visibleFrameState: 'holding_pre',
                clockSource: 'none',
                holdingForPlan: true,
                usingVisualTransition: false,
            };
        }

        if (params.input.activeTransition) {
            return {
                progress: clamp01(params.input.activeTransition.progress),
                visibleFrameState:
                    params.plan.planKey === params.requestedPlanKey
                        ? 'requested_plan'
                        : 'fallback_plan',
                clockSource: 'scheduler',
                holdingForPlan: false,
                usingVisualTransition: false,
            };
        }

        return {
            progress: 1,
            visibleFrameState: 'steady',
            clockSource: 'none',
            holdingForPlan: false,
            usingVisualTransition: false,
        };
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        const updateStartMs = performance.now();
        const geometry = input.geometry;
        const settings = resolveGridGradientSettings(input);

        if (!geometry || !settings.enabled) {
            this.clearForDisabledFrame();
            resetGridGradientStats();
            return { container: this.root };
        }

        const nextSessionKey = buildGridGradientSessionKey(input);
        if (this.sessionKey !== nextSessionKey) {
            this.sessionKey = nextSessionKey;
            this.resetPlanState();
        }
        this.commitPendingWorkerPlan(input.nowMs);
        this.expireVisualTransition(input.nowMs);

        this.root.visible = true;
        const rendererDiagnostics = resolvePixiRendererDiagnostics(input.renderer);
        const planResult = this.resolvePlan({ input, geometry, settings });
        const { plan } = planResult;
        const progressState = this.resolveProgressState({
            input,
            plan,
            requestedPlanKey: planResult.requestedPlanKey,
        });
        const palette = buildGridGradientPalette({
            colorUtils: this.colorUtils,
            input,
            geometry,
            settings,
        });
        const progress = progressState.progress;

        let requestedDrawBackend = settings.drawBackend;
        let drawBackend = requestedDrawBackend;
        let backendFallbackReason: string | null = null;
        let shaderTextureResult: ShaderTextureResolveResult | null = null;
        let shaderStats: GridGradientShaderFieldStats = EMPTY_SHADER_STATS;
        let graphicsPaint: GraphicsPaintResult = {
            paintedCells: 0,
            sceneBuildMs: 0,
            paintMs: 0,
        };
        let distanceTimings = {
            distanceBuildMs: 0,
            ownerSummaryBuildMs: 0,
        };

        if (requestedDrawBackend === 'mesh_quads') {
            drawBackend = 'graphics';
            backendFallbackReason = 'mesh_quads_pending';
        }

        if (
            drawBackend === 'shader_field' &&
            rendererDiagnostics.rendererType === 'webgpu'
        ) {
            drawBackend = 'graphics';
            backendFallbackReason = 'webgpu_gl_shader_unavailable';
        }

        if (drawBackend === 'shader_field') {
            try {
                shaderTextureResult = this.resolveShaderTexturePlan({
                    input,
                    plan,
                    palette,
                    settings,
                });
                shaderStats = this.shaderFieldRenderer.update({
                    plan: shaderTextureResult.texturePlan,
                    settings,
                    shaderSettings: {
                        backend: settings.drawBackend,
                        neighborMode: settings.shaderNeighborMode,
                        shaderMarkSoftness: settings.shaderMarkSoftness,
                        shaderEdgeSoftnessPx: settings.shaderEdgeSoftnessPx,
                        shaderNoiseStrength: settings.shaderNoiseStrength,
                        shaderPulseStrength: settings.shaderPulseStrength,
                        shaderPulseSpeed: settings.shaderPulseSpeed,
                        shaderTransitionScaleMin: settings.shaderTransitionScaleMin,
                        shaderFieldDriftPx: settings.shaderFieldDriftPx,
                        shaderFieldDriftSpeed: settings.shaderFieldDriftSpeed,
                        shaderGlowStrength: settings.shaderGlowStrength,
                        shaderInteriorAlphaBoost: settings.shaderInteriorAlphaBoost,
                        shaderEdgeAlphaBoost: settings.shaderEdgeAlphaBoost,
                        shaderColorMixPower: settings.shaderColorMixPower,
                        borderBlendRangePx: settings.borderBlendRangePx,
                        borderBlendStrength: settings.borderBlendStrength,
                        shaderDebugMode: settings.shaderDebugMode,
                    },
                    progress,
                    nowMs: input.nowMs,
                    renderer: input.renderer,
                });
                this.loggedShaderFailure = false;
                this.fillGraphics.visible = false;
                this.fillGraphics.clear();
            } catch (err) {
                drawBackend = 'graphics';
                backendFallbackReason = 'shader_field_error';
                shaderStats = { ...EMPTY_SHADER_STATS, fallbackReason: backendFallbackReason };
                this.shaderFieldRenderer.hide();
                if (!this.loggedShaderFailure) {
                    log.error(
                        'GridGradientFamily',
                        'Shader-field backend failed; using graphics fallback.',
                        err,
                    );
                    this.loggedShaderFailure = true;
                }
            }
        } else {
            this.shaderFieldRenderer.hide();
        }

        if (drawBackend === 'graphics') {
            const distanceInputs = this.buildDistanceInputs({
                plan,
                palette,
            });
            distanceTimings = {
                distanceBuildMs: distanceInputs.distanceBuildMs,
                ownerSummaryBuildMs: distanceInputs.ownerSummaryBuildMs,
            };
            graphicsPaint = this.paintGraphicsFill({
                plan,
                palette,
                settings,
                progress,
                distanceInputs,
            });
            this.fillGraphics.visible = true;
            shaderStats = {
                ...shaderStats,
                drawBackend: 'graphics',
                neighborMode: settings.shaderNeighborMode,
                totalCells: plan.classification.vstars.length,
                emittableCells: plan.classification.emittableVstars.length,
            };
        }

        const borderDotCount = this.paintBorderDots({
            plan,
            palette,
            settings,
        });
        const vectorBorderCount = this.paintVectorBorders({
            geometry,
            palette,
            settings,
        });
        const roleCounts = this.countRoles(plan);

        const updateMs = performance.now() - updateStartMs;
        this.emaUpdateMs =
            this.emaUpdateMs === 0 ? updateMs : this.emaUpdateMs * 0.85 + updateMs * 0.15;

        this.recordStats({
            input,
            geometry,
            plan,
            settings,
            requestedDrawBackend,
            drawBackend,
            backendFallbackReason,
            planCacheHit: planResult.cacheHit,
            planRebuildReason: planResult.rebuildReason,
            presentationCacheHit: shaderTextureResult?.cacheHit ?? false,
            presentationRebuildReason:
                shaderTextureResult?.rebuildReason ??
                (drawBackend === 'shader_field' ? 'missing_texture_plan' : null),
            shaderStats,
            paintedCells:
                drawBackend === 'shader_field'
                    ? shaderStats.emittableCells
                    : graphicsPaint.paintedCells,
            activeTransitionCells:
                shaderTextureResult?.texturePlan.activeTransitionCells ??
                roleCounts.activeTransitionCells,
            outsideCells:
                shaderTextureResult?.texturePlan.outsideCells ?? roleCounts.outsideCells,
            borderDotCount,
            vectorBorderCount,
            progress,
            progressState,
            requestedPlanPending: planResult.requestedPlanPending,
            distanceBuildMs:
                shaderTextureResult?.texturePlan.distanceBuildMs ??
                distanceTimings.distanceBuildMs,
            ownerSummaryBuildMs:
                shaderTextureResult?.texturePlan.ownerSummaryBuildMs ??
                distanceTimings.ownerSummaryBuildMs,
            sceneBuildMs: graphicsPaint.sceneBuildMs,
            texturePackMs: shaderTextureResult?.texturePlan.texturePackMs ?? 0,
            paintMs: graphicsPaint.paintMs,
            updateMs,
            rendererDiagnostics,
        });
        recordPerfDuration(
            'territory.gridGradient.update',
            updateMs,
            {
                drawBackend,
                requestedDrawBackend,
                cells: plan.classification.vstars.length,
                planCacheHit: planResult.cacheHit,
                requestedPlanPending: planResult.requestedPlanPending,
                presentationCacheHit: shaderTextureResult?.cacheHit ?? false,
            },
            updateStartMs,
        );

        return { container: this.root };
    }

    private clearForDisabledFrame(): void {
        this.fillGraphics.clear();
        this.borderDotGraphics.clear();
        this.vectorBorderGraphics.clear();
        this.shaderFieldRenderer.hide();
        this.root.visible = false;
        this.resetPlanState();
        this.sessionKey = null;
        this.borderDotSignature = null;
        this.vectorBorderSignature = null;
        this.borderDotCount = 0;
        this.vectorBorderCount = 0;
    }

    private countRoles(plan: CachedGridGradientPlan): RoleCounts {
        let activeTransitionCells = 0;
        let outsideCells = 0;
        for (const cell of plan.classification.vstars) {
            if (cell.role === 'outside') {
                outsideCells += 1;
            } else if (cell.role !== 'native') {
                activeTransitionCells += 1;
            }
        }
        return { activeTransitionCells, outsideCells };
    }

    private buildDistanceInputs(params: {
        readonly plan: CachedGridGradientPlan;
        readonly palette: GridGradientPalette;
    }): DistanceInputs {
        const ownerSummaryStartMs = performance.now();
        const ownerIndexByCell = buildOwnerIndexByCell({
            classification: params.plan.classification,
            ownerIndexByOwnerId: params.palette.ownerColorIdx,
        });
        const ownerIndexBuildMs = performance.now() - ownerSummaryStartMs;

        const size = params.plan.classification.cols * params.plan.classification.rows;
        if (
            !this.distanceFieldBuffers ||
            this.distanceFieldBuffers.nearestBoundaryPxByCell.length !== size
        ) {
            this.distanceFieldBuffers =
                createOwnershipGridFrontierDistanceFieldBuffers(size);
        }

        const distanceStartMs = performance.now();
        const distanceField = buildOwnershipGridFrontierDistanceField({
            cols: params.plan.classification.cols,
            rows: params.plan.classification.rows,
            ownerIndexByCell,
            spacingPx: params.plan.classification.spacingPx,
            includeWorldEdge: true,
            reuseBuffers: this.distanceFieldBuffers,
        });
        const distanceBuildMs = performance.now() - distanceStartMs;

        const summaryStartMs = performance.now();
        const distanceSummary = buildGridGradientOwnerDistanceSummary({
            classification: params.plan.classification,
            ownerIndexByOwnerId: params.palette.ownerColorIdx,
            distanceField,
        });
        const ownerSummaryBuildMs =
            ownerIndexBuildMs + performance.now() - summaryStartMs;

        return {
            ownerIndexByCell,
            distanceField,
            distanceSummary,
            distanceBuildMs,
            ownerSummaryBuildMs,
        };
    }

    private resolveShaderTexturePlan(params: {
        readonly input: RenderFamilyInput;
        readonly plan: CachedGridGradientPlan;
        readonly palette: GridGradientPalette;
        readonly settings: GridGradientSettings;
    }): ShaderTextureResolveResult {
        const presentationKey = this.buildShaderPresentationKey({
            plan: params.plan,
            palette: params.palette,
            settings: params.settings,
        });
        if (this.cachedShaderTexturePlan?.presentationKey === presentationKey) {
            return {
                texturePlan: this.cachedShaderTexturePlan,
                cacheHit: true,
                rebuildReason: null,
            };
        }

        const distanceInputs = this.buildDistanceInputs({
            plan: params.plan,
            palette: params.palette,
        });
        this.cachedShaderTexturePlan = buildGridGradientShaderFieldTexturePlan({
            planKey: params.plan.planKey,
            presentationKey,
            classification: params.plan.classification,
            wavePlan: params.plan.wavePlan,
            palette: params.palette,
            settings: params.settings,
            distanceField: distanceInputs.distanceField,
            ownerIndexByCell: distanceInputs.ownerIndexByCell,
            ownerMaxDistancePxByIndex:
                distanceInputs.distanceSummary.ownerMaxDistancePxByIndex,
            world: params.input.world,
            distanceBuildMs: distanceInputs.distanceBuildMs,
            ownerSummaryBuildMs: distanceInputs.ownerSummaryBuildMs,
        });
        return {
            texturePlan: this.cachedShaderTexturePlan,
            cacheHit: false,
            rebuildReason: 'presentation_key_change',
        };
    }

    private buildShaderPresentationKey(params: {
        readonly plan: CachedGridGradientPlan;
        readonly palette: GridGradientPalette;
        readonly settings: GridGradientSettings;
    }): string {
        const ownerMapKey = [...params.palette.ownerColorIdx.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([ownerId, idx]) => `${ownerId}:${idx}`)
            .join(',');
        const fillKey = params.palette.fillHexByColorIdx
            .map((color) => color.toString(16))
            .join(',');
        return [
            params.plan.planKey,
            ownerMapKey,
            fillKey,
            params.settings.borderOffsetPx,
        ].join('|');
    }

    private paintGraphicsFill(params: {
        readonly plan: CachedGridGradientPlan;
        readonly palette: GridGradientPalette;
        readonly settings: GridGradientSettings;
        readonly progress: number;
        readonly distanceInputs: DistanceInputs;
    }): GraphicsPaintResult {
        const sceneStartMs = performance.now();
        const scene = renderMetaballGridScene({
            classification: params.plan.classification,
            wavePlan: params.plan.wavePlan,
            progress: params.progress,
            flipTransition: params.settings.flipTransition,
            flipWindow: params.settings.flipWindow,
            strength: 1,
            inwardOffsetPx: 0,
            ownerColorIdx: params.palette.ownerColorIdx,
        });
        const sceneBuildMs = performance.now() - sceneStartMs;

        const paintStartMs = performance.now();
        this.fillGraphics.clear();
        let paintedCells = 0;
        for (const cell of scene.cells) {
            if (cell.alpha <= 0) continue;
            const color = params.palette.fillHexByColorIdx[cell.colorIdx];
            if (color === undefined) continue;
            const cellIndex = cell.iy * params.plan.classification.cols + cell.ix;
            const ownerIndex =
                params.distanceInputs.distanceSummary.ownerIndexByCell[cellIndex];
            if (ownerIndex < 0) continue;
            const distancePx =
                params.distanceInputs.distanceField.nearestBoundaryPxByCell[cellIndex];
            const sizePx = resolveGridGradientCellSize({
                distancePx,
                ownerMaxDistancePx:
                    params.distanceInputs.distanceSummary.ownerMaxDistancePxByIndex[
                        ownerIndex
                    ] ?? distancePx,
                edgeSizePx: params.settings.edgeSizePx,
                centerSizePx: params.settings.centerSizePx,
                curvePower: params.settings.curvePower,
                borderOffsetPx: params.settings.borderOffsetPx,
            });
            if (sizePx <= 0) continue;
            drawGridGradientCell({
                graphics: this.fillGraphics,
                shape: params.settings.cellShape,
                id: cell.vId,
                x: cell.x,
                y: cell.y,
                sizePx,
                color,
                alpha: params.settings.fillAlpha * cell.alpha,
            });
            paintedCells += 1;
        }

        return {
            paintedCells,
            sceneBuildMs,
            paintMs: performance.now() - paintStartMs,
        };
    }

    private paintBorderDots(params: {
        readonly plan: CachedGridGradientPlan;
        readonly palette: GridGradientPalette;
        readonly settings: GridGradientSettings;
    }): number {
        const signature = [
            params.plan.planKey,
            params.settings.borderDotsEnabled,
            params.settings.borderDotSizePx,
            params.settings.borderDotStyle,
            params.settings.borderAlpha,
            [...params.palette.colorByOwnerId.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([ownerId, color]) => `${ownerId}:${color.toString(16)}`)
                .join(','),
        ].join('|');
        if (this.borderDotSignature === signature) {
            return this.borderDotCount;
        }

        this.borderDotGraphics.clear();
        this.borderDotSignature = signature;
        if (
            !params.settings.borderDotsEnabled ||
            params.settings.borderDotSizePx <= 0 ||
            params.settings.borderAlpha <= 0
        ) {
            this.borderDotCount = 0;
            return 0;
        }

        const dots = buildGridGradientBorderDots({
            classification: params.plan.classification,
            colorByOwnerId: params.palette.colorByOwnerId,
            dotSizePx: params.settings.borderDotSizePx,
            style: params.settings.borderDotStyle,
            alpha: params.settings.borderAlpha,
        });
        for (const dot of dots) {
            this.borderDotGraphics.circle(dot.x, dot.y, dot.sizePx * 0.5).fill({
                color: dot.color,
                alpha: dot.alpha,
            });
        }
        this.borderDotCount = dots.length;
        return dots.length;
    }

    private paintVectorBorders(params: {
        readonly geometry: ResolvedGeometrySnapshot;
        readonly palette: GridGradientPalette;
        readonly settings: GridGradientSettings;
    }): number {
        const signature = [
            params.geometry.version,
            params.settings.vectorBordersEnabled,
            params.settings.borderWidthPx,
            params.settings.borderAlpha,
            params.settings.borderSaturation,
            params.settings.borderLightness,
            [...params.palette.colorByOwnerId.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([ownerId, color]) => `${ownerId}:${color.toString(16)}`)
                .join(','),
        ].join('|');
        if (this.vectorBorderSignature === signature) {
            return this.vectorBorderCount;
        }

        this.vectorBorderGraphics.clear();
        this.vectorBorderSignature = signature;
        this.vectorBorderCount = drawGridGradientVectorBorders({
            graphics: this.vectorBorderGraphics,
            geometry: params.geometry,
            settings: params.settings,
            colorByOwnerId: params.palette.colorByOwnerId,
        });
        return this.vectorBorderCount;
    }

    private recordStats(params: {
        readonly input: RenderFamilyInput;
        readonly geometry: ResolvedGeometrySnapshot;
        readonly plan: CachedGridGradientPlan;
        readonly settings: GridGradientSettings;
        readonly requestedDrawBackend: GridGradientDrawBackend;
        readonly drawBackend: GridGradientDrawBackend;
        readonly backendFallbackReason: string | null;
        readonly planCacheHit: boolean;
        readonly planRebuildReason: string | null;
        readonly presentationCacheHit: boolean;
        readonly presentationRebuildReason: string | null;
        readonly shaderStats: GridGradientShaderFieldStats;
        readonly paintedCells: number;
        readonly activeTransitionCells: number;
        readonly outsideCells: number;
        readonly borderDotCount: number;
        readonly vectorBorderCount: number;
        readonly progress: number;
        readonly distanceBuildMs: number;
        readonly ownerSummaryBuildMs: number;
        readonly sceneBuildMs: number;
        readonly texturePackMs: number;
        readonly paintMs: number;
        readonly updateMs: number;
        readonly rendererDiagnostics: ReturnType<typeof resolvePixiRendererDiagnostics>;
        readonly progressState: GridGradientProgressState;
        readonly requestedPlanPending: boolean;
    }): void {
        const debugSnapshot = {
            familyId: this.id,
            familyLabel: this.label,
            rendererDiagnostics: params.rendererDiagnostics,
            requestedDrawBackend: params.requestedDrawBackend,
            drawBackend: params.drawBackend,
            backendFallbackReason: params.backendFallbackReason,
            planCacheHit: params.planCacheHit,
            presentationCacheHit: params.presentationCacheHit,
            planKey: params.plan.planKey,
            geometryVersion: params.geometry.version,
            requestedSpacingPx: params.plan.classification.requestedSpacingPx,
            effectiveSpacingPx: params.plan.classification.spacingPx,
            totalCells: params.plan.classification.vstars.length,
            emittableCells: params.plan.classification.emittableVstars.length,
            paintedCells: params.paintedCells,
            borderDotCount: params.borderDotCount,
            vectorBorderCount: params.vectorBorderCount,
            cellShape: params.settings.cellShape,
            borderDotStyle: params.settings.borderDotStyle,
            shaderNeighborMode: params.settings.shaderNeighborMode,
            shaderDebugMode: params.settings.shaderDebugMode,
            progress: params.progress,
            clockSource: params.progressState.clockSource,
            visibleFrameState: params.progressState.visibleFrameState,
        };
        this.lastDebugSnapshot = debugSnapshot;
        updateGridGradientStats({
            familyId: this.id,
            familyLabel: this.label,
            geometrySource:
                (params.input.configSource?.PERIMETER_FIELD_GEOMETRY_SOURCE as string | undefined) ??
                null,
            rendererType: params.rendererDiagnostics.rendererType,
            rendererTypeSource: params.rendererDiagnostics.rendererTypeSource,
            rendererConstructorName:
                params.rendererDiagnostics.rendererConstructorName,
            rendererReportedType: params.rendererDiagnostics.rendererReportedType,
            requestedDrawBackend: params.requestedDrawBackend,
            drawBackend: params.drawBackend,
            backendFallbackReason: params.backendFallbackReason,
            planCacheHit: params.planCacheHit,
            planRebuildReason: params.planRebuildReason,
            presentationCacheHit: params.presentationCacheHit,
            presentationRebuildReason: params.presentationRebuildReason,
            requestedSpacingPx: params.plan.classification.requestedSpacingPx,
            effectiveSpacingPx: params.plan.classification.spacingPx,
            totalCells: params.plan.classification.vstars.length,
            emittableCells: params.plan.classification.emittableVstars.length,
            paintedCells: params.paintedCells,
            activeTransitionCells: params.activeTransitionCells,
            outsideCells: params.outsideCells,
            borderDotCount: params.borderDotCount,
            vectorBorderCount: params.vectorBorderCount,
            cellShape: params.settings.cellShape,
            borderDotStyle: params.settings.borderDotStyle,
            borderDotsEnabled: params.settings.borderDotsEnabled,
            vectorBordersEnabled: params.settings.vectorBordersEnabled,
            shaderNeighborMode: params.settings.shaderNeighborMode,
            shaderDebugMode: params.settings.shaderDebugMode,
            centerSizePx: params.settings.centerSizePx,
            edgeSizePx: params.settings.edgeSizePx,
            curvePower: params.settings.curvePower,
            borderOffsetPx: params.settings.borderOffsetPx,
            lastClassificationBuildMs: params.plan.classificationBuildMs,
            lastWavePlanBuildMs: params.plan.wavePlanBuildMs,
            lastDistanceBuildMs: params.distanceBuildMs,
            lastOwnerSummaryBuildMs: params.ownerSummaryBuildMs,
            lastSceneBuildMs: params.sceneBuildMs,
            lastTexturePackMs: params.texturePackMs,
            lastTextureUploadMs: params.shaderStats.textureUploadMs,
            lastUniformUpdateMs: params.shaderStats.uniformUpdateMs,
            lastPaintMs: params.paintMs,
            lastUpdateMs: params.updateMs,
            emaUpdateMs: this.emaUpdateMs,
            textureUploaded: params.shaderStats.textureUploaded,
            ownerTextureBytes: params.shaderStats.ownerTextureBytes,
            metricsTextureBytes: params.shaderStats.metricsTextureBytes,
            paletteTextureBytes: params.shaderStats.paletteTextureBytes,
            textureBytes: params.shaderStats.textureBytes,
            transitionEventCount: params.input.activeTransition?.events.length ?? 0,
            rawProgress:
                params.input.activeTransition || params.progressState.usingVisualTransition
                    ? params.progress
                    : null,
            schedulerRawProgress: params.input.activeTransition?.progress ?? null,
            visualTransitionActive: params.progressState.usingVisualTransition,
            localVisualTransitionDurationMs:
                this.activeVisualTransition?.durationMs ?? null,
            requestedPlanPending: params.requestedPlanPending,
            clockSource: params.progressState.clockSource,
            visibleFrameState: params.progressState.visibleFrameState,
        });
    }

    dispose(): void {
        this.shaderFieldRenderer.dispose();
        this.planWorker?.terminate();
        this.planWorker = null;
        this.fillGraphics.destroy();
        this.borderDotGraphics.destroy();
        this.vectorBorderGraphics.destroy();
        this.root.destroy({ children: true });
        this.sessionKey = null;
        this.cachedPlan = null;
        this.cachedShaderTexturePlan = null;
        this.distanceFieldBuffers = null;
    }
}

export function createGridGradientFamily(colorUtils: ColorUtils): GridGradientFamily {
    return new GridGradientFamily(colorUtils);
}
