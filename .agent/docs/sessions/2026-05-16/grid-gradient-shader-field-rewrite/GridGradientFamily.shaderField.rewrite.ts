import * as PIXI from 'pixi.js';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import { resolvePixiRendererDiagnostics } from '$lib/renderers/pixiRendererDiagnostics';
import {
    buildOwnershipGridFrontierDistanceField,
    createOwnershipGridFrontierDistanceFieldBuffers,
    type OwnershipGridFrontierDistanceFieldBuffers,
} from '$lib/territory/frontier';
import type { ResolvedGeometrySnapshot } from '../../contracts/GeometryContracts';
import type {
    RenderFamily,
    RenderFamilyInput,
    RenderFamilyOutput,
} from '../RenderFamilyTypes';
import { renderMetaballGridScene } from '../metaballGrid/renderMetaballGridScene';
import {
    buildGridGradientBorderDots,
    buildGridGradientOwnerDistanceSummary,
    buildOwnerIndexByCell,
    resolveGridGradientCellSize,
} from './gridGradientScene';
import {
    buildGridGradientPalette,
    drawGridGradientCell,
    drawGridGradientVectorBorders,
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
import {
    GridGradientShaderFieldRenderer,
    buildGridGradientShaderFieldTexturePlan,
    type GridGradientDrawBackend,
    type GridGradientShaderDebugMode,
    type GridGradientShaderFieldSettings,
    type GridGradientShaderFieldStats,
    type GridGradientShaderFieldTexturePlan,
    type GridGradientShaderNeighborMode,
} from './shaderField';

type ExtendedGridGradientSettings = GridGradientSettings & {
    readonly drawBackend?: GridGradientDrawBackend;
    readonly shaderNeighborMode?: GridGradientShaderNeighborMode;
    readonly shaderResolutionScale?: number;
    readonly shaderMarkSoftness?: number;
    readonly shaderEdgeSoftnessPx?: number;
    readonly shaderNoiseStrength?: number;
    readonly shaderPulseStrength?: number;
    readonly shaderPulseSpeed?: number;
    readonly shaderFieldDriftPx?: number;
    readonly shaderFieldDriftSpeed?: number;
    readonly shaderGlowStrength?: number;
    readonly shaderBlurStrength?: number;
    readonly shaderInteriorAlphaBoost?: number;
    readonly shaderEdgeAlphaBoost?: number;
    readonly shaderColorMixPower?: number;
    readonly shaderDebugMode?: GridGradientShaderDebugMode;
};

interface CachedShaderTexturePlan {
    readonly signature: string;
    readonly plan: GridGradientShaderFieldTexturePlan;
}

interface DistanceBuildResult {
    readonly ownerIndexByCell: Int32Array;
    readonly distanceField: ReturnType<typeof buildOwnershipGridFrontierDistanceField>;
    readonly ownerMaxDistancePxByIndex: readonly number[];
    readonly ownerSummaryBuildMs: number;
    readonly distanceBuildMs: number;
}

function clampNumber(value: number | undefined, fallback: number, min: number, max: number): number {
    const resolved = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    return Math.max(min, Math.min(max, resolved));
}

function resolveDrawBackend(settings: ExtendedGridGradientSettings): GridGradientDrawBackend {
    const value = settings.drawBackend;
    if (value === 'graphics' || value === 'shader_field' || value === 'mesh_quads') return value;
    return 'shader_field';
}

function resolveShaderSettings(settings: ExtendedGridGradientSettings): GridGradientShaderFieldSettings {
    return {
        backend: resolveDrawBackend(settings),
        neighborMode: settings.shaderNeighborMode ?? 'eight',
        shaderResolutionScale: clampNumber(settings.shaderResolutionScale, 1, 0.25, 2),
        shaderMarkSoftness: clampNumber(settings.shaderMarkSoftness, 0.18, 0, 1.5),
        shaderEdgeSoftnessPx: clampNumber(settings.shaderEdgeSoftnessPx, 0.85, 0, 8),
        shaderNoiseStrength: clampNumber(settings.shaderNoiseStrength, 0.35, 0, 2),
        shaderPulseStrength: clampNumber(settings.shaderPulseStrength, 0.06, 0, 1),
        shaderPulseSpeed: clampNumber(settings.shaderPulseSpeed, 3, 0, 20),
        shaderFieldDriftPx: clampNumber(settings.shaderFieldDriftPx, 0, 0, 12),
        shaderFieldDriftSpeed: clampNumber(settings.shaderFieldDriftSpeed, 0.25, 0, 8),
        shaderGlowStrength: clampNumber(settings.shaderGlowStrength, 0.08, 0, 2),
        shaderBlurStrength: clampNumber(settings.shaderBlurStrength, 0, 0, 2),
        shaderInteriorAlphaBoost: clampNumber(settings.shaderInteriorAlphaBoost, 1, 0, 3),
        shaderEdgeAlphaBoost: clampNumber(settings.shaderEdgeAlphaBoost, 0.88, 0, 3),
        shaderColorMixPower: clampNumber(settings.shaderColorMixPower, 1, 0.1, 4),
        shaderDebugMode: settings.shaderDebugMode ?? 'off',
    };
}

function buildPaletteSignature(palette: ReturnType<typeof buildGridGradientPalette>): string {
    const colors = palette.fillHexByColorIdx.join(',');
    const owners = [...palette.ownerColorIdx.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([ownerId, idx]) => `${ownerId}:${idx}`)
        .join(',');
    return `${owners}::${colors}`;
}

function buildPresentationSignature(params: {
    readonly plan: CachedGridGradientPlan;
    readonly settings: GridGradientSettings;
    readonly palette: ReturnType<typeof buildGridGradientPalette>;
}): string {
    const settings = params.settings as ExtendedGridGradientSettings;
    return [
        params.plan.planKey,
        params.settings.centerSizePx,
        params.settings.edgeSizePx,
        params.settings.curvePower,
        params.settings.borderOffsetPx,
        params.settings.cellShape,
        params.settings.fillAlpha,
        settings.shaderNeighborMode ?? 'eight',
        settings.shaderMarkSoftness ?? 0.18,
        settings.shaderEdgeSoftnessPx ?? 0.85,
        settings.shaderNoiseStrength ?? 0.35,
        buildPaletteSignature(params.palette),
    ].join('|');
}

function buildVectorBorderSignature(params: {
    readonly geometry: ResolvedGeometrySnapshot;
    readonly settings: GridGradientSettings;
    readonly palette: ReturnType<typeof buildGridGradientPalette>;
}): string {
    return [
        params.geometry.version,
        params.settings.vectorBordersEnabled ? 1 : 0,
        params.settings.borderWidthPx,
        params.settings.borderAlpha,
        params.settings.borderSaturation,
        params.settings.borderLightness,
        [...params.palette.colorByOwnerId.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([ownerId, color]) => `${ownerId}:${color}`).join(','),
    ].join('|');
}

function buildBorderDotSignature(params: {
    readonly plan: CachedGridGradientPlan;
    readonly settings: GridGradientSettings;
    readonly palette: ReturnType<typeof buildGridGradientPalette>;
}): string {
    return [
        params.plan.planKey,
        params.settings.borderDotsEnabled ? 1 : 0,
        params.settings.borderDotSizePx,
        params.settings.borderDotStyle,
        params.settings.borderAlpha,
        [...params.palette.colorByOwnerId.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([ownerId, color]) => `${ownerId}:${color}`).join(','),
    ].join('|');
}

function computePlanRebuildReason(previousPlan: CachedGridGradientPlan | null, nextPlanKey: string): string | null {
    if (!previousPlan) return 'cold_start';
    if (previousPlan.planKey !== nextPlanKey) return 'plan_key_changed';
    return null;
}

export class GridGradientFamily implements RenderFamily {
    readonly id = 'grid_gradient';
    readonly label = 'Grid Gradient';
    readonly tunableKeys: readonly string[] = GRID_GRADIENT_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    private readonly legacyGraphics = new PIXI.Graphics();
    private readonly vectorBorderGraphics = new PIXI.Graphics();
    private readonly borderDotGraphics = new PIXI.Graphics();
    private readonly shaderFieldRenderer = new GridGradientShaderFieldRenderer();
    private readonly colorUtils: ColorUtils;

    private cachedPlan: CachedGridGradientPlan | null = null;
    private cachedShaderTexturePlan: CachedShaderTexturePlan | null = null;
    private distanceFieldBuffers: OwnershipGridFrontierDistanceFieldBuffers | null = null;
    private lastVectorBorderSignature: string | null = null;
    private lastBorderDotSignature: string | null = null;
    private lastDebugSnapshot: Record<string, unknown> | null = null;
    private emaUpdateMs = 0;

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
        this.root.addChild(this.shaderFieldRenderer.container);
        this.root.addChild(this.legacyGraphics);
        this.root.addChild(this.borderDotGraphics);
        this.root.addChild(this.vectorBorderGraphics);
    }

    get displayRoot(): PIXI.Container {
        return this.root;
    }

    getDebugSnapshot(): Record<string, unknown> | null {
        return this.lastDebugSnapshot;
    }

    private clearAll(): void {
        this.legacyGraphics.clear();
        this.vectorBorderGraphics.clear();
        this.borderDotGraphics.clear();
        this.shaderFieldRenderer.hide();
        this.lastVectorBorderSignature = null;
        this.lastBorderDotSignature = null;
    }

    private resolvePlan(params: {
        readonly input: RenderFamilyInput;
        readonly geometry: ResolvedGeometrySnapshot;
        readonly settings: GridGradientSettings;
    }): { plan: CachedGridGradientPlan; planCacheHit: boolean; planRebuildReason: string | null } {
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
        const planRebuildReason = computePlanRebuildReason(this.cachedPlan, planKey);
        if (planRebuildReason) {
            this.cachedPlan = buildGridGradientPlan({
                input: params.input,
                geometry: params.geometry,
                prevGeometry,
                settings: params.settings,
                planKey,
            });
        }
        return {
            plan: this.cachedPlan!,
            planCacheHit: !planRebuildReason,
            planRebuildReason,
        };
    }

    private buildDistanceData(params: {
        readonly plan: CachedGridGradientPlan;
        readonly palette: ReturnType<typeof buildGridGradientPalette>;
    }): DistanceBuildResult {
        const ownerSummaryStartMs = performance.now();
        const ownerIndexByCell = buildOwnerIndexByCell({
            classification: params.plan.classification,
            ownerIndexByOwnerId: params.palette.ownerColorIdx,
        });
        const ownerSummaryBuildMs = performance.now() - ownerSummaryStartMs;

        const size = params.plan.classification.cols * params.plan.classification.rows;
        if (!this.distanceFieldBuffers || this.distanceFieldBuffers.nearestBoundaryPxByCell.length !== size) {
            this.distanceFieldBuffers = createOwnershipGridFrontierDistanceFieldBuffers(size);
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

        const distanceSummary = buildGridGradientOwnerDistanceSummary({
            classification: params.plan.classification,
            ownerIndexByOwnerId: params.palette.ownerColorIdx,
            distanceField,
        });

        return {
            ownerIndexByCell: distanceSummary.ownerIndexByCell,
            distanceField,
            ownerMaxDistancePxByIndex: distanceSummary.ownerMaxDistancePxByIndex,
            ownerSummaryBuildMs,
            distanceBuildMs,
        };
    }

    private resolveShaderTexturePlan(params: {
        readonly input: RenderFamilyInput;
        readonly plan: CachedGridGradientPlan;
        readonly palette: ReturnType<typeof buildGridGradientPalette>;
        readonly settings: GridGradientSettings;
    }): {
        texturePlan: GridGradientShaderFieldTexturePlan;
        presentationCacheHit: boolean;
        presentationRebuildReason: string | null;
    } {
        const presentationKey = buildPresentationSignature(params);
        if (this.cachedShaderTexturePlan?.signature === presentationKey) {
            return {
                texturePlan: this.cachedShaderTexturePlan.plan,
                presentationCacheHit: true,
                presentationRebuildReason: null,
            };
        }

        const distance = this.buildDistanceData({ plan: params.plan, palette: params.palette });
        const texturePlan = buildGridGradientShaderFieldTexturePlan({
            planKey: params.plan.planKey,
            presentationKey,
            classification: params.plan.classification,
            wavePlan: params.plan.wavePlan,
            palette: params.palette,
            settings: params.settings,
            distanceField: distance.distanceField,
            ownerIndexByCell: distance.ownerIndexByCell,
            ownerMaxDistancePxByIndex: distance.ownerMaxDistancePxByIndex,
            world: params.input.world,
        });

        const mergedTexturePlan = {
            ...texturePlan,
            distanceBuildMs: distance.distanceBuildMs,
            ownerSummaryBuildMs: distance.ownerSummaryBuildMs,
        } satisfies GridGradientShaderFieldTexturePlan;

        this.cachedShaderTexturePlan = {
            signature: presentationKey,
            plan: mergedTexturePlan,
        };
        return {
            texturePlan: mergedTexturePlan,
            presentationCacheHit: false,
            presentationRebuildReason: 'presentation_key_changed',
        };
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        const updateStartMs = performance.now();
        const geometry = input.geometry;
        const settings = resolveGridGradientSettings(input);
        const extendedSettings = settings as ExtendedGridGradientSettings;
        const shaderSettings = resolveShaderSettings(extendedSettings);
        const drawBackend = shaderSettings.backend;

        if (!geometry || !settings.enabled) {
            this.clearAll();
            this.root.visible = false;
            resetGridGradientStats();
            return { container: this.root };
        }

        this.root.visible = true;
        const { plan, planCacheHit, planRebuildReason } = this.resolvePlan({ input, geometry, settings });
        const palette = buildGridGradientPalette({
            colorUtils: this.colorUtils,
            input,
            geometry,
            settings,
        });
        const progress = input.activeTransition ? input.activeTransition.progress : 1;

        let backendStats: Partial<GridGradientShaderFieldStats> = {
            drawBackend,
            textureUploaded: false,
            textureUploadMs: 0,
            uniformUpdateMs: 0,
            ownerTextureBytes: 0,
            metricsTextureBytes: 0,
            paletteTextureBytes: 0,
            textureBytes: 0,
            totalCells: plan.classification.vstars.length,
            emittableCells: plan.classification.emittableVstars.length,
            activeTransitionCells: 0,
        };
        let paintedCells = 0;
        let borderDotCount = 0;
        let vectorBorderCount = 0;
        let sceneBuildMs = 0;
        let paintMs = 0;
        let texturePackMs = 0;
        let distanceBuildMs = 0;
        let ownerSummaryBuildMs = 0;
        let presentationCacheHit = false;
        let presentationRebuildReason: string | null = null;

        if (drawBackend === 'shader_field') {
            this.legacyGraphics.visible = false;
            this.legacyGraphics.clear();
            const resolved = this.resolveShaderTexturePlan({ input, plan, palette, settings });
            presentationCacheHit = resolved.presentationCacheHit;
            presentationRebuildReason = resolved.presentationRebuildReason;
            texturePackMs = resolved.texturePlan.texturePackMs;
            distanceBuildMs = resolved.texturePlan.distanceBuildMs;
            ownerSummaryBuildMs = resolved.texturePlan.ownerSummaryBuildMs;
            backendStats = this.shaderFieldRenderer.update({
                plan: resolved.texturePlan,
                settings,
                shaderSettings,
                progress,
                nowMs: input.nowMs,
                renderer: input.renderer,
            });
            paintedCells = resolved.texturePlan.emittableCells;
            this.paintRetainedBorders({ geometry, settings, palette });
            vectorBorderCount = this.lastVectorBorderSignature ? geometry.frontierPolylines.length + geometry.worldBorderPolylines.length : 0;
            borderDotCount = this.paintBorderDotsCached({ plan, palette, settings });
        } else {
            this.shaderFieldRenderer.hide();
            const result = this.renderGraphicsBackend({ input, geometry, plan, palette, settings, progress });
            paintedCells = result.paintedCells;
            borderDotCount = result.borderDotCount;
            vectorBorderCount = result.vectorBorderCount;
            sceneBuildMs = result.sceneBuildMs;
            paintMs = result.paintMs;
            presentationCacheHit = false;
            presentationRebuildReason = 'graphics_backend_repaints_each_frame';
        }

        const updateMs = performance.now() - updateStartMs;
        this.emaUpdateMs = this.emaUpdateMs === 0 ? updateMs : this.emaUpdateMs * 0.85 + updateMs * 0.15;
        this.recordStats({
            input,
            geometry,
            plan,
            settings,
            shaderSettings,
            drawBackend,
            planCacheHit,
            planRebuildReason,
            presentationCacheHit,
            presentationRebuildReason,
            paintedCells,
            borderDotCount,
            vectorBorderCount,
            progress,
            sceneBuildMs,
            paintMs,
            updateMs,
            texturePackMs,
            distanceBuildMs,
            ownerSummaryBuildMs,
            backendStats,
        });

        return { container: this.root };
    }

    private renderGraphicsBackend(params: {
        readonly input: RenderFamilyInput;
        readonly geometry: ResolvedGeometrySnapshot;
        readonly plan: CachedGridGradientPlan;
        readonly palette: ReturnType<typeof buildGridGradientPalette>;
        readonly settings: GridGradientSettings;
        readonly progress: number;
    }): {
        paintedCells: number;
        borderDotCount: number;
        vectorBorderCount: number;
        sceneBuildMs: number;
        paintMs: number;
    } {
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

        const distance = this.buildDistanceData({ plan: params.plan, palette: params.palette });

        const paintStartMs = performance.now();
        this.legacyGraphics.visible = true;
        this.legacyGraphics.clear();
        let paintedCells = 0;
        for (const cell of scene.cells) {
            if (cell.alpha <= 0) continue;
            const color = params.palette.fillHexByColorIdx[cell.colorIdx];
            if (color === undefined) continue;
            const cellIndex = cell.iy * params.plan.classification.cols + cell.ix;
            const ownerIndex = distance.ownerIndexByCell[cellIndex];
            if (ownerIndex < 0) continue;
            const distancePx = distance.distanceField.nearestBoundaryPxByCell[cellIndex];
            const sizePx = resolveGridGradientCellSize({
                distancePx,
                ownerMaxDistancePx: distance.ownerMaxDistancePxByIndex[ownerIndex] ?? distancePx,
                edgeSizePx: params.settings.edgeSizePx,
                centerSizePx: params.settings.centerSizePx,
                curvePower: params.settings.curvePower,
                borderOffsetPx: params.settings.borderOffsetPx,
            });
            if (sizePx <= 0) continue;
            drawGridGradientCell({
                graphics: this.legacyGraphics,
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

        const borderDotCount = this.paintBorderDotsCached({ plan: params.plan, palette: params.palette, settings: params.settings });
        this.paintRetainedBorders({ geometry: params.geometry, settings: params.settings, palette: params.palette });
        const vectorBorderCount = params.settings.vectorBordersEnabled
            ? params.geometry.frontierPolylines.length + params.geometry.worldBorderPolylines.length
            : 0;
        const paintMs = performance.now() - paintStartMs;
        return { paintedCells, borderDotCount, vectorBorderCount, sceneBuildMs, paintMs };
    }

    private paintRetainedBorders(params: {
        readonly geometry: ResolvedGeometrySnapshot;
        readonly settings: GridGradientSettings;
        readonly palette: ReturnType<typeof buildGridGradientPalette>;
    }): void {
        const signature = buildVectorBorderSignature(params);
        if (this.lastVectorBorderSignature === signature) return;
        this.vectorBorderGraphics.clear();
        drawGridGradientVectorBorders({
            graphics: this.vectorBorderGraphics,
            geometry: params.geometry,
            settings: params.settings,
            colorByOwnerId: params.palette.colorByOwnerId,
        });
        this.lastVectorBorderSignature = signature;
    }

    private paintBorderDotsCached(params: {
        readonly plan: CachedGridGradientPlan;
        readonly palette: ReturnType<typeof buildGridGradientPalette>;
        readonly settings: GridGradientSettings;
    }): number {
        if (!params.settings.borderDotsEnabled || params.settings.borderDotSizePx <= 0 || params.settings.borderAlpha <= 0) {
            if (this.lastBorderDotSignature !== 'off') {
                this.borderDotGraphics.clear();
                this.lastBorderDotSignature = 'off';
            }
            return 0;
        }
        const signature = buildBorderDotSignature(params);
        if (this.lastBorderDotSignature === signature) {
            return 0;
        }
        this.borderDotGraphics.clear();
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
        this.lastBorderDotSignature = signature;
        return dots.length;
    }

    private recordStats(params: {
        readonly input: RenderFamilyInput;
        readonly geometry: ResolvedGeometrySnapshot;
        readonly plan: CachedGridGradientPlan;
        readonly settings: GridGradientSettings;
        readonly shaderSettings: GridGradientShaderFieldSettings;
        readonly drawBackend: GridGradientDrawBackend;
        readonly planCacheHit: boolean;
        readonly planRebuildReason: string | null;
        readonly presentationCacheHit: boolean;
        readonly presentationRebuildReason: string | null;
        readonly paintedCells: number;
        readonly borderDotCount: number;
        readonly vectorBorderCount: number;
        readonly progress: number;
        readonly sceneBuildMs: number;
        readonly paintMs: number;
        readonly updateMs: number;
        readonly texturePackMs: number;
        readonly distanceBuildMs: number;
        readonly ownerSummaryBuildMs: number;
        readonly backendStats: Partial<GridGradientShaderFieldStats>;
    }): void {
        const rendererDiagnostics = resolvePixiRendererDiagnostics(params.input.renderer);
        const debugSnapshot = {
            familyId: this.id,
            familyLabel: this.label,
            rendererDiagnostics,
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
            progress: params.progress,
            drawBackend: params.drawBackend,
            planCacheHit: params.planCacheHit,
            planRebuildReason: params.planRebuildReason,
            presentationCacheHit: params.presentationCacheHit,
            presentationRebuildReason: params.presentationRebuildReason,
            shaderNeighborMode: params.shaderSettings.neighborMode,
            shaderDebugMode: params.shaderSettings.shaderDebugMode,
            textureUploaded: params.backendStats.textureUploaded ?? false,
            textureBytes: params.backendStats.textureBytes ?? 0,
        };
        this.lastDebugSnapshot = debugSnapshot;
        updateGridGradientStats({
            familyId: this.id,
            familyLabel: this.label,
            geometrySource: (params.input.configSource?.PERIMETER_FIELD_GEOMETRY_SOURCE as string | undefined) ?? null,
            rendererType: rendererDiagnostics.rendererType,
            rendererTypeSource: rendererDiagnostics.rendererTypeSource,
            rendererConstructorName: rendererDiagnostics.rendererConstructorName,
            rendererReportedType: rendererDiagnostics.rendererReportedType,
            requestedSpacingPx: params.plan.classification.requestedSpacingPx,
            effectiveSpacingPx: params.plan.classification.spacingPx,
            totalCells: params.plan.classification.vstars.length,
            emittableCells: params.plan.classification.emittableVstars.length,
            paintedCells: params.paintedCells,
            borderDotCount: params.borderDotCount,
            vectorBorderCount: params.vectorBorderCount,
            cellShape: params.settings.cellShape,
            borderDotStyle: params.settings.borderDotStyle,
            borderDotsEnabled: params.settings.borderDotsEnabled,
            vectorBordersEnabled: params.settings.vectorBordersEnabled,
            centerSizePx: params.settings.centerSizePx,
            edgeSizePx: params.settings.edgeSizePx,
            curvePower: params.settings.curvePower,
            borderOffsetPx: params.settings.borderOffsetPx,
            lastClassificationBuildMs: params.plan.classificationBuildMs,
            lastWavePlanBuildMs: params.plan.wavePlanBuildMs,
            lastSceneBuildMs: params.sceneBuildMs,
            lastPaintMs: params.paintMs,
            lastUpdateMs: params.updateMs,
            emaUpdateMs: this.emaUpdateMs,
            transitionEventCount: params.input.activeTransition?.events.length ?? 0,
            rawProgress: params.input.activeTransition ? params.progress : null,
            visibleFrameState: params.input.activeTransition ? 'transition' : 'steady',
            // New fields. Add to GridGradientStats interface before committing.
            drawBackend: params.drawBackend,
            planCacheHit: params.planCacheHit,
            planRebuildReason: params.planRebuildReason,
            presentationCacheHit: params.presentationCacheHit,
            presentationRebuildReason: params.presentationRebuildReason,
            textureUploaded: params.backendStats.textureUploaded ?? false,
            textureUploadMs: params.backendStats.textureUploadMs ?? 0,
            texturePackMs: params.texturePackMs,
            distanceBuildMs: params.distanceBuildMs,
            ownerSummaryBuildMs: params.ownerSummaryBuildMs,
            uniformUpdateMs: params.backendStats.uniformUpdateMs ?? 0,
            ownerTextureBytes: params.backendStats.ownerTextureBytes ?? 0,
            metricsTextureBytes: params.backendStats.metricsTextureBytes ?? 0,
            paletteTextureBytes: params.backendStats.paletteTextureBytes ?? 0,
            textureBytes: params.backendStats.textureBytes ?? 0,
            activeTransitionCells: params.backendStats.activeTransitionCells ?? 0,
            outsideCells: params.plan.classification.byRole.outside.length,
            shaderNeighborMode: params.shaderSettings.neighborMode,
            shaderDebugMode: params.shaderSettings.shaderDebugMode,
        } as never);
    }

    dispose(): void {
        this.legacyGraphics.destroy();
        this.vectorBorderGraphics.destroy();
        this.borderDotGraphics.destroy();
        this.shaderFieldRenderer.dispose();
        this.root.destroy({ children: true });
        this.cachedPlan = null;
        this.cachedShaderTexturePlan = null;
        this.distanceFieldBuffers = null;
        this.lastVectorBorderSignature = null;
        this.lastBorderDotSignature = null;
    }
}

export function createGridGradientFamily(colorUtils: ColorUtils): GridGradientFamily {
    return new GridGradientFamily(colorUtils);
}
