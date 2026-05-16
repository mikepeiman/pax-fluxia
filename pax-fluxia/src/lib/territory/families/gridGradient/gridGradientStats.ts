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
    readonly presentationCacheHit: boolean;
    readonly presentationRebuildReason: string | null;
    readonly requestedSpacingPx: number;
    readonly effectiveSpacingPx: number;
    readonly totalCells: number;
    readonly emittableCells: number;
    readonly paintedCells: number;
    readonly activeTransitionCells: number;
    readonly outsideCells: number;
    readonly borderDotCount: number;
    readonly vectorBorderCount: number;
    readonly cellShape: string;
    readonly borderDotStyle: string;
    readonly borderDotsEnabled: boolean;
    readonly vectorBordersEnabled: boolean;
    readonly shaderNeighborMode: string;
    readonly shaderDebugMode: string;
    readonly centerSizePx: number;
    readonly edgeSizePx: number;
    readonly curvePower: number;
    readonly borderOffsetPx: number;
    readonly lastClassificationBuildMs: number;
    readonly lastWavePlanBuildMs: number;
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
    readonly rawProgress: number | null;
    readonly visibleFrameState: 'steady' | 'transition';
}

const INITIAL: GridGradientStats = {
    familyId: 'grid_gradient',
    familyLabel: 'Grid Gradient',
    geometrySource: null,
    rendererType: 'unknown',
    rendererTypeSource: 'missing',
    rendererConstructorName: null,
    rendererReportedType: null,
    requestedDrawBackend: 'graphics',
    drawBackend: 'graphics',
    backendFallbackReason: null,
    planCacheHit: false,
    planRebuildReason: null,
    presentationCacheHit: false,
    presentationRebuildReason: null,
    requestedSpacingPx: 0,
    effectiveSpacingPx: 0,
    totalCells: 0,
    emittableCells: 0,
    paintedCells: 0,
    activeTransitionCells: 0,
    outsideCells: 0,
    borderDotCount: 0,
    vectorBorderCount: 0,
    cellShape: 'circle',
    borderDotStyle: 'blended',
    borderDotsEnabled: false,
    vectorBordersEnabled: true,
    shaderNeighborMode: 'eight',
    shaderDebugMode: 'off',
    centerSizePx: 0,
    edgeSizePx: 0,
    curvePower: 0,
    borderOffsetPx: 0,
    lastClassificationBuildMs: 0,
    lastWavePlanBuildMs: 0,
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
    rawProgress: null,
    visibleFrameState: 'steady',
};

export const gridGradientStats = writable<GridGradientStats>(INITIAL);

export function updateGridGradientStats(patch: Partial<GridGradientStats>): void {
    gridGradientStats.update((prev) => ({ ...prev, ...patch }));
}

export function resetGridGradientStats(): void {
    gridGradientStats.set(INITIAL);
}
