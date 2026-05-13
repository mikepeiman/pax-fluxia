import * as PIXI from 'pixi.js';
import type { ColorUtils } from '$lib/renderers/RenderContext';
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

export class GridGradientFamily implements RenderFamily {
    readonly id = 'grid_gradient';
    readonly label = 'Grid Gradient';
    readonly tunableKeys: readonly string[] = GRID_GRADIENT_TUNABLE_KEYS;

    private readonly root = new PIXI.Container();
    private readonly graphics = new PIXI.Graphics();
    private readonly colorUtils: ColorUtils;
    private cachedPlan: CachedGridGradientPlan | null = null;
    private distanceFieldBuffers: OwnershipGridFrontierDistanceFieldBuffers | null =
        null;
    private lastDebugSnapshot: Record<string, unknown> | null = null;
    private emaUpdateMs = 0;

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
        this.root.addChild(this.graphics);
    }

    get displayRoot(): PIXI.Container {
        return this.root;
    }

    getDebugSnapshot(): Record<string, unknown> | null {
        return this.lastDebugSnapshot;
    }

    private resolvePlan(params: {
        readonly input: RenderFamilyInput;
        readonly geometry: ResolvedGeometrySnapshot;
        readonly settings: GridGradientSettings;
    }): CachedGridGradientPlan {
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
        if (!this.cachedPlan || this.cachedPlan.planKey !== planKey) {
            this.cachedPlan = buildGridGradientPlan({
                input: params.input,
                geometry: params.geometry,
                prevGeometry,
                settings: params.settings,
                planKey,
            });
        }
        return this.cachedPlan;
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        const updateStartMs = performance.now();
        const geometry = input.geometry;
        const settings = resolveGridGradientSettings(input);

        if (!geometry || !settings.enabled) {
            this.graphics.clear();
            this.root.visible = false;
            resetGridGradientStats();
            return { container: this.root };
        }

        this.root.visible = true;
        const plan = this.resolvePlan({ input, geometry, settings });
        const palette = buildGridGradientPalette({
            colorUtils: this.colorUtils,
            input,
            geometry,
            settings,
        });
        const progress = input.activeTransition ? input.activeTransition.progress : 1;
        const sceneStartMs = performance.now();
        const scene = renderMetaballGridScene({
            classification: plan.classification,
            wavePlan: plan.wavePlan,
            progress,
            flipTransition: settings.flipTransition,
            flipWindow: settings.flipWindow,
            strength: 1,
            inwardOffsetPx: 0,
            ownerColorIdx: palette.ownerColorIdx,
        });
        const sceneBuildMs = performance.now() - sceneStartMs;

        const ownerIndexByCell = buildOwnerIndexByCell({
            classification: plan.classification,
            ownerIndexByOwnerId: palette.ownerColorIdx,
        });
        const size = plan.classification.cols * plan.classification.rows;
        if (
            !this.distanceFieldBuffers ||
            this.distanceFieldBuffers.nearestBoundaryPxByCell.length !== size
        ) {
            this.distanceFieldBuffers =
                createOwnershipGridFrontierDistanceFieldBuffers(size);
        }
        const distanceField = buildOwnershipGridFrontierDistanceField({
            cols: plan.classification.cols,
            rows: plan.classification.rows,
            ownerIndexByCell,
            spacingPx: plan.classification.spacingPx,
            includeWorldEdge: true,
            reuseBuffers: this.distanceFieldBuffers,
        });
        const distanceSummary = buildGridGradientOwnerDistanceSummary({
            classification: plan.classification,
            ownerIndexByOwnerId: palette.ownerColorIdx,
            distanceField,
        });

        const paintStartMs = performance.now();
        this.graphics.clear();
        let paintedCells = 0;
        for (const cell of scene.cells) {
            if (cell.alpha <= 0) continue;
            const color = palette.fillHexByColorIdx[cell.colorIdx];
            if (color === undefined) continue;
            const cellIndex = cell.iy * plan.classification.cols + cell.ix;
            const ownerIndex = distanceSummary.ownerIndexByCell[cellIndex];
            if (ownerIndex < 0) continue;
            const distancePx = distanceField.nearestBoundaryPxByCell[cellIndex];
            const sizePx = resolveGridGradientCellSize({
                distancePx,
                ownerMaxDistancePx:
                    distanceSummary.ownerMaxDistancePxByIndex[ownerIndex] ??
                    distancePx,
                edgeSizePx: settings.edgeSizePx,
                centerSizePx: settings.centerSizePx,
                curvePower: settings.curvePower,
                borderOffsetPx: settings.borderOffsetPx,
            });
            if (sizePx <= 0) continue;
            drawGridGradientCell({
                graphics: this.graphics,
                shape: settings.cellShape,
                id: cell.vId,
                x: cell.x,
                y: cell.y,
                sizePx,
                color,
                alpha: settings.fillAlpha * cell.alpha,
            });
            paintedCells += 1;
        }

        const borderDotCount = this.paintBorderDots({
            plan,
            palette,
            settings,
        });
        const vectorBorderCount = drawGridGradientVectorBorders({
            graphics: this.graphics,
            geometry,
            settings,
            colorByOwnerId: palette.colorByOwnerId,
        });
        const paintMs = performance.now() - paintStartMs;
        const updateMs = performance.now() - updateStartMs;
        this.emaUpdateMs =
            this.emaUpdateMs === 0 ? updateMs : this.emaUpdateMs * 0.85 + updateMs * 0.15;
        this.recordStats({
            input,
            geometry,
            plan,
            settings,
            paintedCells,
            borderDotCount,
            vectorBorderCount,
            progress,
            sceneBuildMs,
            paintMs,
            updateMs,
        });

        return { container: this.root };
    }

    private paintBorderDots(params: {
        readonly plan: CachedGridGradientPlan;
        readonly palette: ReturnType<typeof buildGridGradientPalette>;
        readonly settings: GridGradientSettings;
    }): number {
        if (
            !params.settings.borderDotsEnabled ||
            params.settings.borderDotSizePx <= 0 ||
            params.settings.borderAlpha <= 0
        ) {
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
            this.graphics.circle(dot.x, dot.y, dot.sizePx * 0.5).fill({
                color: dot.color,
                alpha: dot.alpha,
            });
        }
        return dots.length;
    }

    private recordStats(params: {
        readonly input: RenderFamilyInput;
        readonly geometry: ResolvedGeometrySnapshot;
        readonly plan: CachedGridGradientPlan;
        readonly settings: GridGradientSettings;
        readonly paintedCells: number;
        readonly borderDotCount: number;
        readonly vectorBorderCount: number;
        readonly progress: number;
        readonly sceneBuildMs: number;
        readonly paintMs: number;
        readonly updateMs: number;
    }): void {
        const debugSnapshot = {
            familyId: this.id,
            familyLabel: this.label,
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
        };
        this.lastDebugSnapshot = debugSnapshot;
        updateGridGradientStats({
            familyId: this.id,
            familyLabel: this.label,
            geometrySource:
                (params.input.configSource?.PERIMETER_FIELD_GEOMETRY_SOURCE as string | undefined) ??
                null,
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
        });
    }

    dispose(): void {
        this.graphics.destroy();
        this.root.destroy({ children: true });
        this.cachedPlan = null;
        this.distanceFieldBuffers = null;
    }
}

export function createGridGradientFamily(colorUtils: ColorUtils): GridGradientFamily {
    return new GridGradientFamily(colorUtils);
}
