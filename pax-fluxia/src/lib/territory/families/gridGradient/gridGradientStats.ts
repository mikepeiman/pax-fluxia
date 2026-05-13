import { writable } from 'svelte/store';

export interface GridGradientStats {
    readonly familyId: string;
    readonly familyLabel: string;
    readonly geometrySource: string | null;
    readonly requestedSpacingPx: number;
    readonly effectiveSpacingPx: number;
    readonly totalCells: number;
    readonly emittableCells: number;
    readonly paintedCells: number;
    readonly borderDotCount: number;
    readonly vectorBorderCount: number;
    readonly cellShape: string;
    readonly borderDotStyle: string;
    readonly borderDotsEnabled: boolean;
    readonly vectorBordersEnabled: boolean;
    readonly centerSizePx: number;
    readonly edgeSizePx: number;
    readonly curvePower: number;
    readonly borderOffsetPx: number;
    readonly lastClassificationBuildMs: number;
    readonly lastWavePlanBuildMs: number;
    readonly lastSceneBuildMs: number;
    readonly lastPaintMs: number;
    readonly lastUpdateMs: number;
    readonly emaUpdateMs: number;
    readonly transitionEventCount: number;
    readonly rawProgress: number | null;
    readonly visibleFrameState: 'steady' | 'transition';
}

const INITIAL: GridGradientStats = {
    familyId: 'grid_gradient',
    familyLabel: 'Grid Gradient',
    geometrySource: null,
    requestedSpacingPx: 0,
    effectiveSpacingPx: 0,
    totalCells: 0,
    emittableCells: 0,
    paintedCells: 0,
    borderDotCount: 0,
    vectorBorderCount: 0,
    cellShape: 'circle',
    borderDotStyle: 'blended',
    borderDotsEnabled: false,
    vectorBordersEnabled: true,
    centerSizePx: 0,
    edgeSizePx: 0,
    curvePower: 0,
    borderOffsetPx: 0,
    lastClassificationBuildMs: 0,
    lastWavePlanBuildMs: 0,
    lastSceneBuildMs: 0,
    lastPaintMs: 0,
    lastUpdateMs: 0,
    emaUpdateMs: 0,
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
