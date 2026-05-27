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
import {
    buildGridGradientBorderDots,
    buildGridGradientOwnerDistanceSummary,
    buildOwnerIndexByCell,
    isGridGradientTransitionRole,
    resolveGridGradientDrawableCellSize,
    resolveGridGradientTransitionBlendT,
    resolveGridGradientTransitionSideAlphas,
    resolveGridGradientTransitionScale,
    type GridGradientOwnerDistanceSummary,
} from './gridGradientScene';
import {
    buildGridGradientPalette,
    drawGridGradientCell,
    drawGridGradientSolidFill,
    drawGridGradientVectorBorders,
    type GridGradientPalette,
} from './paint';
import {
    buildGridGradientPlan,
    buildGridGradientPlanKey,
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
}

interface GridGradientVisualTransition {
    readonly planKey: string;
    readonly startedAtMs: number;
    readonly durationMs: number;
}

type GridGradientClockSource = 'none' | 'scheduler' | 'local';
type GridGradientVisibleFrameState = 'steady' | 'transition';

interface GridGradientProgressState {
    readonly progress: number;
    readonly clockSource: GridGradientClockSource;
    readonly visibleFrameState: GridGradientVisibleFrameState;
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
    readonly activeDrawableTransitionCells: number;
    readonly activeOffsetZoneTransitionCells: number;
    readonly sceneBuildMs: number;
    readonly paintMs: number;
}

interface RoleCounts {
    readonly activeTransitionCells: number;
    readonly activeDrawableTransitionCells: number;
    readonly activeMixingTransitionCells: number;
    readonly activeOffsetZoneTransitionCells: number;
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
    activeDrawableTransitionCells: 0,
    activeOffsetZoneTransitionCells: 0,
    outsideCells: 0,
    uniformProgress: null,
    uniformTimeSec: null,
    fallbackReason: null,
};

function clamp01(value: number): number {
    if (!Number.isFinite(value) || value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
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
    private activeVisualTransition: GridGradientVisualTransition | null = null;
    private lastVisualTransitionPlanKey: string | null = null;
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

    private logTransitionDebug(
        settings: GridGradientSettings,
        stage: string,
        data: Record<string, unknown>,
    ): void {
        if (!settings.debugTransitions) return;
        log.renderer('GG_TRANSITION', `[GG_TRANSITION] family.${stage}`, data);
    }

    private summarizeInputTransition(input: RenderFamilyInput): Record<string, unknown> {
        const transition = input.activeTransition ?? null;
        if (!transition) {
            return {
                present: false,
                eventCount: 0,
                sessionCount: input.transitionSessions?.length ?? 0,
            };
        }
        return {
            present: true,
            sessionKey: transition.sessionKey,
            eventCount: transition.events.length,
            sessionCount: input.transitionSessions?.length ?? 0,
            progress: transition.progress,
            rawProgress: transition.rawProgress,
            startedAtMs: transition.startedAtMs,
            durationMs: transition.durationMs,
            ageMs: input.nowMs - transition.startedAtMs,
            events: transition.events.map((entry) => ({
                starId: entry.event.starId,
                previousOwner: entry.event.previousOwner,
                newOwner: entry.event.newOwner,
                progress: entry.progress,
                rawProgress: entry.rawProgress,
            })),
        };
    }

    private summarizePlanRoles(plan: CachedGridGradientPlan): Record<string, unknown> {
        return {
            planKey: plan.planKey,
            totalCells: plan.classification.vstars.length,
            emittableCells: plan.classification.emittableVstars.length,
            roles: Object.fromEntries(
                Object.entries(plan.classification.byRole).map(([role, ids]) => [
                    role,
                    Array.isArray(ids) ? ids.length : 0,
                ]),
            ),
            orderedTransitionCells: plan.wavePlan.orderedTransitionVIds.length,
            firstFlipTimes: plan.wavePlan.orderedFlipTimes.slice(0, 8),
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
        this.lastVisualTransitionPlanKey = planKey;
    }

    private expireVisualTransition(nowMs: number): void {
        const active = this.activeVisualTransition;
        if (!active) return;
        if (nowMs - active.startedAtMs < active.durationMs) return;
        this.activeVisualTransition = null;
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
        this.logTransitionDebug(params.settings, 'resolve_plan.gate', {
            hasActiveTransition,
            hasPrevGeometryInput: Boolean(params.input.prevGeometry),
            usingPrevGeometryInput: prevGeometry !== params.geometry,
            geometryVersion: params.geometry.version,
            prevGeometryVersion: prevGeometry.version,
            cachedPlanKey: this.cachedPlan?.planKey ?? null,
            nextPlanKey: planKey,
            inputTransition: this.summarizeInputTransition(params.input),
        });
        if (this.cachedPlan?.planKey === planKey) {
            if (
                hasActiveTransition &&
                params.input.activeTransition &&
                this.activeVisualTransition?.planKey !== planKey &&
                this.lastVisualTransitionPlanKey !== planKey
            ) {
                this.logTransitionDebug(params.settings, 'resolve_plan.begin_visual_transition.cache_hit', {
                    planKey,
                    nowMs: params.input.nowMs,
                    durationMs: params.input.activeTransition.durationMs,
                });
                this.beginVisualTransition(
                    planKey,
                    params.input.nowMs,
                    params.input.activeTransition.durationMs,
                );
            }
            this.logTransitionDebug(params.settings, 'resolve_plan.cache_hit', {
                planKey,
                activeVisualTransition: this.activeVisualTransition,
            });
            return {
                plan: this.cachedPlan,
                cacheHit: true,
                rebuildReason: null,
            };
        }

        const visualTransitionStillActive =
            !hasActiveTransition &&
            this.activeVisualTransition !== null &&
            this.cachedPlan?.planKey === this.activeVisualTransition.planKey;
        if (visualTransitionStillActive && this.cachedPlan) {
            this.logTransitionDebug(params.settings, 'resolve_plan.keep_visual_transition_plan', {
                planKey: this.cachedPlan.planKey,
                activeVisualTransition: this.activeVisualTransition,
            });
            return {
                plan: this.cachedPlan,
                cacheHit: true,
                rebuildReason: null,
            };
        }

        const rebuildReason = this.cachedPlan ? 'key_change' : 'initial';
        this.logTransitionDebug(params.settings, 'resolve_plan.rebuild_start', {
            rebuildReason,
            planKey,
            geometryVersion: params.geometry.version,
            prevGeometryVersion: prevGeometry.version,
        });
        this.cachedPlan = buildGridGradientPlan({
            input: params.input,
            geometry: params.geometry,
            prevGeometry,
            settings: params.settings,
            planKey,
        });
        this.logTransitionDebug(params.settings, 'resolve_plan.rebuild_done', {
            rebuildReason,
            plan: this.summarizePlanRoles(this.cachedPlan),
            classificationBuildMs: this.cachedPlan.classificationBuildMs,
            wavePlanBuildMs: this.cachedPlan.wavePlanBuildMs,
        });
        this.cachedShaderTexturePlan = null;
        this.borderDotSignature = null;
        if (
            hasActiveTransition &&
            params.input.activeTransition &&
            this.lastVisualTransitionPlanKey !== planKey
        ) {
            this.logTransitionDebug(params.settings, 'resolve_plan.begin_visual_transition.rebuild', {
                planKey,
                nowMs: params.input.nowMs,
                durationMs: params.input.activeTransition.durationMs,
            });
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
        };
    }

    private resolveProgressState(params: {
        readonly input: RenderFamilyInput;
        readonly plan: CachedGridGradientPlan;
    }): GridGradientProgressState {
        const activeVisual = this.activeVisualTransition;
        if (activeVisual && activeVisual.planKey === params.plan.planKey) {
            return {
                progress: clamp01(
                    (params.input.nowMs - activeVisual.startedAtMs) /
                        activeVisual.durationMs,
                ),
                clockSource: 'local',
                visibleFrameState: 'transition',
                usingVisualTransition: true,
            };
        }

        if (params.input.activeTransition) {
            return {
                progress: clamp01(params.input.activeTransition.progress),
                clockSource: 'scheduler',
                visibleFrameState: 'transition',
                usingVisualTransition: false,
            };
        }

        return {
            progress: 1,
            clockSource: 'none',
            visibleFrameState: 'steady',
            usingVisualTransition: false,
        };
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        const updateStartMs = performance.now();
        const geometry = input.geometry;
        const settings = resolveGridGradientSettings(input);

        if (!geometry || !settings.enabled) {
            this.logTransitionDebug(settings, 'update.disabled_gate', {
                hasGeometry: Boolean(geometry),
                enabled: settings.enabled,
                inputTransition: this.summarizeInputTransition(input),
            });
            this.clearForDisabledFrame();
            resetGridGradientStats();
            return { container: this.root };
        }

        this.expireVisualTransition(input.nowMs);
        this.root.visible = true;
        const rendererDiagnostics = resolvePixiRendererDiagnostics(input.renderer);
        this.logTransitionDebug(settings, 'update.entry', {
            geometryVersion: geometry.version,
            prevGeometryVersion: input.prevGeometry?.version ?? null,
            rendererDiagnostics,
            inputTransition: this.summarizeInputTransition(input),
            settings: {
                fillStyle: settings.fillStyle,
                drawBackend: settings.drawBackend,
                spacingPx: settings.spacingPx,
                maxCells: settings.maxCells,
                borderOffsetPx: settings.borderOffsetPx,
                centerSizePx: settings.centerSizePx,
                edgeSizePx: settings.edgeSizePx,
                curvePower: settings.curvePower,
            },
        });
        const planResult = this.resolvePlan({ input, geometry, settings });
        const { plan } = planResult;
        const progressState = this.resolveProgressState({ input, plan });
        this.logTransitionDebug(settings, 'update.plan_and_progress', {
            planCacheHit: planResult.cacheHit,
            planRebuildReason: planResult.rebuildReason,
            plan: this.summarizePlanRoles(plan),
            progressState,
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
            activeDrawableTransitionCells: 0,
            activeOffsetZoneTransitionCells: 0,
            sceneBuildMs: 0,
            paintMs: 0,
        };
        let distanceTimings = {
            distanceBuildMs: 0,
            ownerSummaryBuildMs: 0,
        };
        const pointFillEnabled = settings.fillStyle === 'pointillist';
        const solidFillEnabled = settings.fillStyle === 'solid';

        if (requestedDrawBackend === 'mesh_quads') {
            drawBackend = 'graphics';
            backendFallbackReason = 'mesh_quads_pending';
            this.logTransitionDebug(settings, 'update.backend_gate.mesh_quads', {
                requestedDrawBackend,
                drawBackend,
                backendFallbackReason,
            });
        }

        if (
            drawBackend === 'shader_field' &&
            rendererDiagnostics.rendererType === 'webgpu'
        ) {
            drawBackend = 'graphics';
            backendFallbackReason = 'webgpu_gl_shader_unavailable';
            this.logTransitionDebug(settings, 'update.backend_gate.webgpu', {
                requestedDrawBackend,
                drawBackend,
                rendererDiagnostics,
                backendFallbackReason,
            });
        }

        if (solidFillEnabled && drawBackend === 'shader_field') {
            drawBackend = 'graphics';
            backendFallbackReason = 'solid_fill_style';
            this.logTransitionDebug(settings, 'update.backend_gate.solid_fill', {
                requestedDrawBackend,
                drawBackend,
                backendFallbackReason,
            });
        }

        if (pointFillEnabled && drawBackend === 'shader_field') {
            try {
                this.logTransitionDebug(settings, 'shader_path.before_texture_plan', {
                    progress,
                    plan: this.summarizePlanRoles(plan),
                });
                shaderTextureResult = this.resolveShaderTexturePlan({
                    input,
                    plan,
                    palette,
                    settings,
                });
                this.logTransitionDebug(settings, 'shader_path.texture_plan', {
                    cacheHit: shaderTextureResult.cacheHit,
                    rebuildReason: shaderTextureResult.rebuildReason,
                    activeTransitionCells:
                        shaderTextureResult.texturePlan.activeTransitionCells,
                    activeDrawableTransitionCells:
                        shaderTextureResult.texturePlan
                            .activeDrawableTransitionCells,
                    activeOffsetZoneTransitionCells:
                        shaderTextureResult.texturePlan
                            .activeOffsetZoneTransitionCells,
                    textureBytes: shaderTextureResult.texturePlan.textureBytes,
                    texturePackMs:
                        shaderTextureResult.texturePlan.texturePackMs,
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
                        shaderFieldDriftPx: settings.shaderFieldDriftPx,
                        shaderFieldDriftSpeed: settings.shaderFieldDriftSpeed,
                        shaderGlowStrength: settings.shaderGlowStrength,
                        shaderInteriorAlphaBoost: settings.shaderInteriorAlphaBoost,
                        shaderEdgeAlphaBoost: settings.shaderEdgeAlphaBoost,
                    },
                    progress,
                    nowMs: input.nowMs,
                    renderer: input.renderer,
                });
                this.logTransitionDebug(settings, 'shader_path.after_update', {
                    progress,
                    shaderStats,
                });
                this.loggedShaderFailure = false;
                this.fillGraphics.visible = false;
                this.fillGraphics.clear();
            } catch (err) {
                drawBackend = 'graphics';
                backendFallbackReason = 'shader_field_error';
                shaderStats = { ...EMPTY_SHADER_STATS, fallbackReason: backendFallbackReason };
                this.shaderFieldRenderer.hide();
                this.logTransitionDebug(settings, 'shader_path.error_fallback', {
                    backendFallbackReason,
                    error: err instanceof Error ? err.message : String(err),
                });
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
            this.logTransitionDebug(settings, 'shader_path.skipped', {
                pointFillEnabled,
                drawBackend,
                fillStyle: settings.fillStyle,
            });
            this.shaderFieldRenderer.hide();
        }

        if (solidFillEnabled) {
            this.logTransitionDebug(settings, 'graphics_path.solid_fill', {
                progress,
                geometryVersion: geometry.version,
            });
            const paintStartMs = performance.now();
            this.fillGraphics.clear();
            graphicsPaint = {
                paintedCells: drawGridGradientSolidFill({
                    graphics: this.fillGraphics,
                    geometry,
                    settings,
                    fillColorByOwnerId: palette.fillColorByOwnerId,
                }),
                activeDrawableTransitionCells: 0,
                activeOffsetZoneTransitionCells: 0,
                sceneBuildMs: 0,
                paintMs: performance.now() - paintStartMs,
            };
            this.fillGraphics.visible = true;
            shaderStats = {
                ...shaderStats,
                drawBackend: 'graphics',
                neighborMode: settings.shaderNeighborMode,
                totalCells: plan.classification.vstars.length,
                emittableCells: plan.classification.emittableVstars.length,
            };
        } else if (drawBackend === 'graphics') {
            this.logTransitionDebug(settings, 'graphics_path.point_fill', {
                progress,
                plan: this.summarizePlanRoles(plan),
            });
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
        const roleCounts = this.countRoles({
            plan,
            settings,
            progress,
        });
        this.logTransitionDebug(settings, 'update.role_counts', {
            progress,
            roleCounts,
            borderDotCount,
            vectorBorderCount,
        });

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
            activeDrawableTransitionCells:
                shaderTextureResult?.texturePlan.activeDrawableTransitionCells ??
                (drawBackend === 'graphics' && pointFillEnabled
                    ? graphicsPaint.activeDrawableTransitionCells
                    : roleCounts.activeDrawableTransitionCells),
            activeMixingTransitionCells: roleCounts.activeMixingTransitionCells,
            activeOffsetZoneTransitionCells:
                shaderTextureResult?.texturePlan.activeOffsetZoneTransitionCells ??
                (drawBackend === 'graphics' && pointFillEnabled
                    ? graphicsPaint.activeOffsetZoneTransitionCells
                    : roleCounts.activeOffsetZoneTransitionCells),
            outsideCells:
                shaderTextureResult?.texturePlan.outsideCells ?? roleCounts.outsideCells,
            borderDotCount,
            vectorBorderCount,
            progress,
            progressState,
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
        this.logTransitionDebug(settings, 'update.exit', {
            updateMs,
            drawBackend,
            requestedDrawBackend,
            backendFallbackReason,
            paintedCells:
                drawBackend === 'shader_field'
                    ? shaderStats.emittableCells
                    : graphicsPaint.paintedCells,
            statsSnapshot: this.lastDebugSnapshot,
        });
        recordPerfDuration(
            'territory.gridGradient.update',
            updateMs,
            {
                drawBackend,
                requestedDrawBackend,
                cells: plan.classification.vstars.length,
                planCacheHit: planResult.cacheHit,
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
        this.cachedPlan = null;
        this.cachedShaderTexturePlan = null;
        this.activeVisualTransition = null;
        this.lastVisualTransitionPlanKey = null;
        this.borderDotSignature = null;
        this.vectorBorderSignature = null;
        this.borderDotCount = 0;
        this.vectorBorderCount = 0;
    }

    private countRoles(params: {
        readonly plan: CachedGridGradientPlan;
        readonly settings: GridGradientSettings;
        readonly progress: number;
    }): RoleCounts {
        let activeTransitionCells = 0;
        let activeDrawableTransitionCells = 0;
        let activeMixingTransitionCells = 0;
        let outsideCells = 0;
        for (const cell of params.plan.classification.vstars) {
            if (cell.role === 'outside') {
                outsideCells += 1;
            } else if (cell.role !== 'native') {
                activeTransitionCells += 1;
                activeDrawableTransitionCells += 1;
                const blendT = resolveGridGradientTransitionBlendT({
                    progress: params.progress,
                    flipTime: params.plan.wavePlan.flipTimeByVId.get(cell.id) ?? 0.5,
                    flipWindow: params.settings.flipWindow,
                });
                if (blendT > 0.02 && blendT < 0.98) {
                    activeMixingTransitionCells += 1;
                }
            }
        }
        return {
            activeTransitionCells,
            activeDrawableTransitionCells,
            activeMixingTransitionCells,
            activeOffsetZoneTransitionCells: 0,
            outsideCells,
        };
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
        this.logTransitionDebug(params.settings, 'shader_texture_plan.gate', {
            presentationKey,
            cachedPresentationKey:
                this.cachedShaderTexturePlan?.presentationKey ?? null,
            planKey: params.plan.planKey,
        });
        if (this.cachedShaderTexturePlan?.presentationKey === presentationKey) {
            this.logTransitionDebug(params.settings, 'shader_texture_plan.cache_hit', {
                presentationKey,
                activeTransitionCells:
                    this.cachedShaderTexturePlan.activeTransitionCells,
                activeDrawableTransitionCells:
                    this.cachedShaderTexturePlan.activeDrawableTransitionCells,
                activeOffsetZoneTransitionCells:
                    this.cachedShaderTexturePlan.activeOffsetZoneTransitionCells,
            });
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
        this.logTransitionDebug(params.settings, 'shader_texture_plan.rebuild_start', {
            presentationKey,
            distanceBuildMs: distanceInputs.distanceBuildMs,
            ownerSummaryBuildMs: distanceInputs.ownerSummaryBuildMs,
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
        this.logTransitionDebug(params.settings, 'shader_texture_plan.rebuild_done', {
            presentationKey,
            activeTransitionCells:
                this.cachedShaderTexturePlan.activeTransitionCells,
            activeDrawableTransitionCells:
                this.cachedShaderTexturePlan.activeDrawableTransitionCells,
            activeOffsetZoneTransitionCells:
                this.cachedShaderTexturePlan.activeOffsetZoneTransitionCells,
            textureBytes: this.cachedShaderTexturePlan.textureBytes,
            texturePackMs: this.cachedShaderTexturePlan.texturePackMs,
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
        const sceneBuildMs = performance.now() - sceneStartMs;

        const paintStartMs = performance.now();
        this.fillGraphics.clear();
        let paintedCells = 0;
        let activeDrawableTransitionCells = 0;
        let activeOffsetZoneTransitionCells = 0;
        for (const cell of params.plan.classification.emittableVstars) {
            const sideAlphas = resolveGridGradientTransitionSideAlphas({
                role: cell.role,
                progress: params.progress,
                flipTime: params.plan.wavePlan.flipTimeByVId.get(cell.id) ?? 0.5,
                flipWindow: params.settings.flipWindow,
            });
            if (sideAlphas.prevAlpha <= 0 && sideAlphas.nextAlpha <= 0) continue;

            const cellIndex = cell.iy * params.plan.classification.cols + cell.ix;
            const activeRole = isGridGradientTransitionRole(cell.role);
            const ownerIndex =
                params.distanceInputs.distanceSummary.ownerIndexByCell[cellIndex];
            if (ownerIndex < 0 && !activeRole) continue;
            const distancePx =
                params.distanceInputs.distanceField.nearestBoundaryPxByCell[cellIndex];
            const ownerMaxDistancePx =
                ownerIndex >= 0
                    ? params.distanceInputs.distanceSummary.ownerMaxDistancePxByIndex[
                          ownerIndex
                      ] ?? distancePx
                    : distancePx;
            const sizePx = resolveGridGradientDrawableCellSize({
                distancePx,
                ownerMaxDistancePx,
                edgeSizePx: params.settings.edgeSizePx,
                centerSizePx: params.settings.centerSizePx,
                curvePower: params.settings.curvePower,
                borderOffsetPx: params.settings.borderOffsetPx,
                role: cell.role,
                spacingPx: params.plan.classification.spacingPx,
            });
            if (sizePx <= 0) continue;
            if (activeRole) {
                activeDrawableTransitionCells += 1;
                if (
                    params.settings.borderOffsetPx > 0 &&
                    distancePx < params.settings.borderOffsetPx
                ) {
                    activeOffsetZoneTransitionCells += 1;
                }
            }

            const drawSide = (
                ownerId: string | null,
                alpha: number,
                side: 'prev' | 'next',
            ): void => {
                if (!ownerId || alpha <= 0) return;
                const colorIdx = params.palette.ownerColorIdx.get(ownerId);
                if (colorIdx === undefined) return;
                const color = params.palette.fillHexByColorIdx[colorIdx];
                if (color === undefined) return;
                const transitionScale = resolveGridGradientTransitionScale({
                    role: cell.role,
                    alpha,
                });
                if (transitionScale <= 0) return;
                drawGridGradientCell({
                    graphics: this.fillGraphics,
                    shape: params.settings.cellShape,
                    id: `${cell.id}:${side}`,
                    x: cell.x,
                    y: cell.y,
                    sizePx: sizePx * transitionScale,
                    color,
                    alpha: params.settings.fillAlpha * alpha,
                });
                paintedCells += 1;
            };

            drawSide(cell.prevOwnerId, sideAlphas.prevAlpha, 'prev');
            drawSide(cell.nextOwnerId, sideAlphas.nextAlpha, 'next');
        }

        return {
            paintedCells,
            activeDrawableTransitionCells,
            activeOffsetZoneTransitionCells,
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
            params.geometry.diagnostics.stageLadder?.displayBorderFingerprint ?? '',
            params.settings.vectorBordersEnabled,
            params.settings.borderWidthPx,
            params.settings.borderAlpha,
            params.settings.borderSaturation,
            params.settings.borderLightness,
            params.settings.fillHueShiftDeg,
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
        readonly activeDrawableTransitionCells: number;
        readonly activeMixingTransitionCells: number;
        readonly activeOffsetZoneTransitionCells: number;
        readonly outsideCells: number;
        readonly borderDotCount: number;
        readonly vectorBorderCount: number;
        readonly progress: number;
        readonly progressState: GridGradientProgressState;
        readonly distanceBuildMs: number;
        readonly ownerSummaryBuildMs: number;
        readonly sceneBuildMs: number;
        readonly texturePackMs: number;
        readonly paintMs: number;
        readonly updateMs: number;
        readonly rendererDiagnostics: ReturnType<typeof resolvePixiRendererDiagnostics>;
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
            activeTransitionCells: params.activeTransitionCells,
            activeDrawableTransitionCells: params.activeDrawableTransitionCells,
            activeMixingTransitionCells: params.activeMixingTransitionCells,
            activeOffsetZoneTransitionCells: params.activeOffsetZoneTransitionCells,
            shaderActiveTransitionCells: params.shaderStats.activeTransitionCells,
            shaderUniformProgress: params.shaderStats.uniformProgress,
            borderDotCount: params.borderDotCount,
            vectorBorderCount: params.vectorBorderCount,
            fillStyle: params.settings.fillStyle,
            cellShape: params.settings.cellShape,
            borderDotStyle: params.settings.borderDotStyle,
            shaderNeighborMode: params.settings.shaderNeighborMode,
            progress: params.progress,
            transitionEventCount: params.input.activeTransition?.events.length ?? 0,
            transitionSessionCount: params.input.transitionSessions?.length ?? 0,
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
            activeDrawableTransitionCells: params.activeDrawableTransitionCells,
            activeMixingTransitionCells: params.activeMixingTransitionCells,
            activeOffsetZoneTransitionCells: params.activeOffsetZoneTransitionCells,
            shaderActiveTransitionCells: params.shaderStats.activeTransitionCells,
            shaderActiveDrawableTransitionCells:
                params.shaderStats.activeDrawableTransitionCells,
            shaderActiveOffsetZoneTransitionCells:
                params.shaderStats.activeOffsetZoneTransitionCells,
            outsideCells: params.outsideCells,
            borderDotCount: params.borderDotCount,
            vectorBorderCount: params.vectorBorderCount,
            fillStyle: params.settings.fillStyle,
            cellShape: params.settings.cellShape,
            borderDotStyle: params.settings.borderDotStyle,
            borderDotsEnabled: params.settings.borderDotsEnabled,
            vectorBordersEnabled: params.settings.vectorBordersEnabled,
            shaderNeighborMode: params.settings.shaderNeighborMode,
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
            transitionSessionCount: params.input.transitionSessions?.length ?? 0,
            rawProgress:
                params.input.activeTransition || params.progressState.usingVisualTransition
                    ? params.progress
                    : null,
            schedulerRawProgress: params.input.activeTransition?.progress ?? null,
            transitionAgeMs: params.input.activeTransition
                ? Math.max(
                      0,
                      params.input.nowMs - params.input.activeTransition.startedAtMs,
                  )
                : null,
            transitionDurationMs:
                params.input.activeTransition?.durationMs ??
                this.activeVisualTransition?.durationMs ??
                null,
            visualTransitionActive: params.progressState.usingVisualTransition,
            localVisualTransitionDurationMs:
                this.activeVisualTransition?.durationMs ?? null,
            shaderUniformProgress: params.shaderStats.uniformProgress,
            shaderUniformTimeSec: params.shaderStats.uniformTimeSec,
            requestedPlanPending: false,
            clockSource: params.progressState.clockSource,
            visibleFrameState: params.progressState.visibleFrameState,
        });
    }

    dispose(): void {
        this.shaderFieldRenderer.dispose();
        this.fillGraphics.destroy();
        this.borderDotGraphics.destroy();
        this.vectorBorderGraphics.destroy();
        this.root.destroy({ children: true });
        this.cachedPlan = null;
        this.cachedShaderTexturePlan = null;
        this.activeVisualTransition = null;
        this.lastVisualTransitionPlanKey = null;
        this.distanceFieldBuffers = null;
    }
}

export function createGridGradientFamily(colorUtils: ColorUtils): GridGradientFamily {
    return new GridGradientFamily(colorUtils);
}
