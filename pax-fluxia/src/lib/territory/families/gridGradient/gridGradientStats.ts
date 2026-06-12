import { writable } from 'svelte/store';

export interface GridGradientStats {
    readonly familyId: string;
    readonly familyLabel: string;
    readonly geometrySource: string | null;
    readonly rendererType: string;
    readonly rendererTypeSource: string;
    readonly rendererConstructorName: string | null;
    readonly rendererReportedType: string | null;
    readonly requestedDrawBackend: string;
    readonly drawBackend: string;
    readonly backendFallbackReason: string | null;
    readonly planCacheHit: boolean;
    readonly planRebuildReason: string | null;
    readonly requestedPlanKey: string | null;
    readonly requestedPlanPending: boolean;
    readonly planWorkerScheduled: boolean;
    readonly planWorkerWaitMs: number | null;
    readonly committedWorkerPlan: boolean;
    readonly presentationCacheHit: boolean;
    readonly presentationRebuildReason: string | null;
    readonly classificationAlgorithm: string;
    readonly prevOwnerGridCacheHit: boolean;
    readonly nextOwnerGridCacheHit: boolean;
    readonly requestedSpacingPx: number;
    readonly effectiveSpacingPx: number;
    readonly totalCells: number;
    readonly emittableCells: number;
    readonly paintedCells: number;
    readonly activeTransitionCells: number;
    readonly activeDrawableTransitionCells: number;
    readonly activeMixingTransitionCells: number;
    readonly activeOffsetZoneTransitionCells: number;
    readonly shaderActiveTransitionCells: number;
    readonly shaderActiveDrawableTransitionCells: number;
    readonly shaderActiveOffsetZoneTransitionCells: number;
    readonly outsideCells: number;
    readonly borderDotCount: number;
    readonly vectorBorderCount: number;
    readonly fillStyle: string;
    readonly cellShape: string;
    readonly borderDotStyle: string;
    readonly borderDotsEnabled: boolean;
    readonly vectorBordersEnabled: boolean;
    readonly shaderNeighborMode: string;
    readonly centerSizePx: number;
    readonly edgeSizePx: number;
    readonly curvePower: number;
    readonly borderOffsetPx: number;
    readonly lastClassificationBuildMs: number;
    readonly lastOwnerGridBuildMs: number;
    readonly lastClassificationMaterializeMs: number;
    readonly lastWavePlanBuildMs: number;
    readonly lastPlanBuildMs: number;
    readonly lastDistanceBuildMs: number;
    readonly lastOwnerSummaryBuildMs: number;
    readonly lastSceneBuildMs: number;
    readonly lastTexturePackMs: number;
    readonly lastTextureUploadMs: number;
    readonly lastUniformUpdateMs: number;
    readonly lastPaintMs: number;
    readonly lastUpdateMs: number;
    readonly emaUpdateMs: number;
    readonly textureUploaded: boolean;
    readonly ownerTextureBytes: number;
    readonly metricsTextureBytes: number;
    readonly paletteTextureBytes: number;
    readonly textureBytes: number;
    readonly transitionEventCount: number;
    readonly transitionSessionCount: number;
    readonly schedulerRawProgress: number | null;
    readonly rawProgress: number | null;
    readonly transitionAgeMs: number | null;
    readonly transitionDurationMs: number | null;
    readonly visualTransitionActive: boolean;
    readonly localVisualTransitionDurationMs: number | null;
    readonly shaderUniformProgress: number | null;
    readonly shaderUniformTimeSec: number | null;
    readonly clockSource: 'none' | 'scheduler' | 'local';
    readonly visibleFrameState:
        | 'steady'
        | 'transition'
        | 'holding_pre'
        | 'requested_plan'
        | 'fallback_plan';
}

const INITIAL: GridGradientStats = {
    familyId: 'grid_gradient',
    familyLabel: 'Grid Gradient',
    geometrySource: null,
    rendererType: 'unknown',
    rendererTypeSource: 'missing',
    rendererConstructorName: null,
    rendererReportedType: null,
    requestedDrawBackend: 'shader_field',
    drawBackend: 'shader_field',
    backendFallbackReason: null,
    planCacheHit: false,
    planRebuildReason: null,
    requestedPlanKey: null,
    requestedPlanPending: false,
    planWorkerScheduled: false,
    planWorkerWaitMs: null,
    committedWorkerPlan: false,
    presentationCacheHit: false,
    presentationRebuildReason: null,
    classificationAlgorithm: 'unknown',
    prevOwnerGridCacheHit: false,
    nextOwnerGridCacheHit: false,
    requestedSpacingPx: 0,
    effectiveSpacingPx: 0,
    totalCells: 0,
    emittableCells: 0,
    paintedCells: 0,
    activeTransitionCells: 0,
    activeDrawableTransitionCells: 0,
    activeMixingTransitionCells: 0,
    activeOffsetZoneTransitionCells: 0,
    shaderActiveTransitionCells: 0,
    shaderActiveDrawableTransitionCells: 0,
    shaderActiveOffsetZoneTransitionCells: 0,
    outsideCells: 0,
    borderDotCount: 0,
    vectorBorderCount: 0,
    fillStyle: 'pointillist',
    cellShape: 'circle',
    borderDotStyle: 'blended',
    borderDotsEnabled: false,
    vectorBordersEnabled: true,
    shaderNeighborMode: 'eight',
    centerSizePx: 0,
    edgeSizePx: 0,
    curvePower: 0,
    borderOffsetPx: 0,
    lastClassificationBuildMs: 0,
    lastOwnerGridBuildMs: 0,
    lastClassificationMaterializeMs: 0,
    lastWavePlanBuildMs: 0,
    lastPlanBuildMs: 0,
    lastDistanceBuildMs: 0,
    lastOwnerSummaryBuildMs: 0,
    lastSceneBuildMs: 0,
    lastTexturePackMs: 0,
    lastTextureUploadMs: 0,
    lastUniformUpdateMs: 0,
    lastPaintMs: 0,
    lastUpdateMs: 0,
    emaUpdateMs: 0,
    textureUploaded: false,
    ownerTextureBytes: 0,
    metricsTextureBytes: 0,
    paletteTextureBytes: 0,
    textureBytes: 0,
    transitionEventCount: 0,
    transitionSessionCount: 0,
    schedulerRawProgress: null,
    rawProgress: null,
    transitionAgeMs: null,
    transitionDurationMs: null,
    visualTransitionActive: false,
    localVisualTransitionDurationMs: null,
    shaderUniformProgress: null,
    shaderUniformTimeSec: null,
    clockSource: 'none',
    visibleFrameState: 'steady',
};

export const gridGradientStats = writable<GridGradientStats>(INITIAL);

export function updateGridGradientStats(patch: Partial<GridGradientStats>): void {
    gridGradientStats.update((prev) => ({ ...prev, ...patch }));
}

export function resetGridGradientStats(): void {
    gridGradientStats.set(INITIAL);
}
