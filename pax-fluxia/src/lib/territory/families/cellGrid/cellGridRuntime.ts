import type {
    GridAdjacency,
    GridDistribution,
    GridOriginMode,
    GridWaveGeometry,
    GridWaveSeeding,
} from './cellGridTypes';
import { normalizePerimeterFieldGeometrySource } from '../../geometry/geometrySource';

export interface CellGridPlanKeyParams {
    readonly transitionKey: string;
    readonly geometryVersion: string;
    readonly geometrySource: string | null;
    readonly spacingPx: number;
    readonly originMode: GridOriginMode;
    readonly distribution?: GridDistribution;
    readonly positionJitter?: number;
    readonly maxCells?: number;
    readonly adjacency?: GridAdjacency;
    readonly waveGeometry?: GridWaveGeometry;
    readonly waveSeeding?: GridWaveSeeding;
}

/**
 * Cache key for the expensive PREV/NEXT classification + wave-plan build.
 *
 * The family draws every frame, but the underlying grid ownership plan only
 * needs rebuilding when the geometry truth or the plan-generation knobs change.
 */
export function buildCellGridPlanKey(
    params: CellGridPlanKeyParams,
): string {
    return [
        params.transitionKey,
        params.geometryVersion,
        normalizePerimeterFieldGeometrySource(params.geometrySource),
        params.spacingPx,
        params.originMode,
        params.distribution ?? '',
        params.positionJitter ?? '',
        params.maxCells ?? '',
        params.adjacency ?? '',
        params.waveGeometry ?? '',
        params.waveSeeding ?? '',
    ].join('|');
}

function clamp01(value: number): number {
    return value < 0 ? 0 : value > 1 ? 1 : value;
}

export interface CellGridVisualTransitionTiming {
    readonly planKey: string;
    readonly startedAtMs: number;
    readonly durationMs: number;
}

export interface ResolveCellGridDisplayProgressParams {
    readonly schedulerRawProgress: number | null;
    readonly requestedPlanKey: string | null;
    readonly cachedPlanKey: string | null;
    readonly activeVisualTransition: CellGridVisualTransitionTiming | null;
    readonly nowMs: number;
}

export interface CellGridDisplayProgress {
    readonly rawProgress: number;
    readonly holdingForPlan: boolean;
    readonly usingVisualTransition: boolean;
}

interface CellGridRuntimeFlipTimeBins {
    '0-0.1': number;
    '0.1-0.25': number;
    '0.25-0.5': number;
    '0.5-0.75': number;
    '0.75-1': number;
}

export interface CellGridFrontierDiagnostics {
    readonly transitionTotalCount: number;
    readonly min: number | null;
    readonly p25: number | null;
    readonly p50: number | null;
    readonly p75: number | null;
    readonly p95: number | null;
    readonly max: number | null;
    readonly bins: CellGridRuntimeFlipTimeBins;
    readonly visibleStartProgress: number | null;
    readonly visibleEndProgress: number | null;
    readonly visibleLifetimeProgress: number | null;
}

const EMPTY_FRONTIER_BINS: CellGridRuntimeFlipTimeBins = {
    '0-0.1': 0,
    '0.1-0.25': 0,
    '0.25-0.5': 0,
    '0.5-0.75': 0,
    '0.75-1': 0,
};

/**
 * Resolve the progress that should drive the visible grid animation.
 *
 * - If a local visual transition is active for the cached plan, it owns the
 *   timeline so late worker results still animate smoothly instead of snapping.
 * - If the scheduler has started a new transition but the matching plan is not
 *   ready yet, freeze visible progress at 0 so the PRE frame stays stable.
 * - Otherwise, use the scheduler progress directly.
 */
export function resolveCellGridDisplayProgress(
    params: ResolveCellGridDisplayProgressParams,
): CellGridDisplayProgress {
    const schedulerRawProgress = clamp01(params.schedulerRawProgress ?? 1);
    const visualTransition = params.activeVisualTransition;
    if (
        visualTransition &&
        params.cachedPlanKey !== null &&
        visualTransition.planKey === params.cachedPlanKey
    ) {
        const durationMs = Math.max(1, visualTransition.durationMs);
        return {
            rawProgress: clamp01(
                (params.nowMs - visualTransition.startedAtMs) / durationMs,
            ),
            holdingForPlan: false,
            usingVisualTransition: true,
        };
    }

    if (
        params.requestedPlanKey !== null &&
        params.cachedPlanKey !== params.requestedPlanKey
    ) {
        return {
            rawProgress: 0,
            holdingForPlan: true,
            usingVisualTransition: false,
        };
    }

    return {
        rawProgress: schedulerRawProgress,
        holdingForPlan: false,
        usingVisualTransition: false,
    };
}

function quantile(sortedValues: readonly number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    if (sortedValues.length === 1) return sortedValues[0]!;
    const index = (sortedValues.length - 1) * clamp01(p);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const lowerValue = sortedValues[lower]!;
    const upperValue = sortedValues[upper]!;
    if (lower === upper) return lowerValue;
    const t = index - lower;
    return lowerValue + (upperValue - lowerValue) * t;
}

export function summarizeCellGridFrontier(params: {
    readonly orderedFlipTimes: readonly number[];
    readonly flipWindow: number;
}): CellGridFrontierDiagnostics {
    const values = [...params.orderedFlipTimes].sort((a, b) => a - b);
    if (values.length === 0) {
        return {
            transitionTotalCount: 0,
            min: null,
            p25: null,
            p50: null,
            p75: null,
            p95: null,
            max: null,
            bins: EMPTY_FRONTIER_BINS,
            visibleStartProgress: null,
            visibleEndProgress: null,
            visibleLifetimeProgress: null,
        };
    }

    const bins: CellGridRuntimeFlipTimeBins = { ...EMPTY_FRONTIER_BINS };
    for (const value of values) {
        if (value < 0.1) bins['0-0.1'] += 1;
        else if (value < 0.25) bins['0.1-0.25'] += 1;
        else if (value < 0.5) bins['0.25-0.5'] += 1;
        else if (value < 0.75) bins['0.5-0.75'] += 1;
        else bins['0.75-1'] += 1;
    }

    const min = values[0]!;
    const max = values[values.length - 1]!;
    const visibleStartProgress = clamp01(min - Math.max(0, params.flipWindow));
    const visibleEndProgress = clamp01(max + Math.max(0, params.flipWindow));

    return {
        transitionTotalCount: values.length,
        min,
        p25: quantile(values, 0.25),
        p50: quantile(values, 0.5),
        p75: quantile(values, 0.75),
        p95: quantile(values, 0.95),
        max,
        bins,
        visibleStartProgress,
        visibleEndProgress,
        visibleLifetimeProgress: Math.max(
            0,
            visibleEndProgress - visibleStartProgress,
        ),
    };
}

export interface GridInwardOffsetParams {
    readonly ix: number;
    readonly iy: number;
    readonly cols: number;
    readonly rows: number;
    readonly selfColorIdx: number;
    readonly colorIdxByGridIdx: Int32Array;
    readonly distancePx: number;
}

/**
 * Push a boundary cell toward its interior by inspecting which cardinal
 * neighbours differ in owner. Corner cells drift diagonally inward.
 */
export function computeGridInwardOffset(
    params: GridInwardOffsetParams,
): { x: number; y: number } {
    if (params.distancePx <= 0 || params.selfColorIdx < 0) {
        return { x: 0, y: 0 };
    }

    const differs = (nx: number, ny: number): boolean => {
        if (nx < 0 || nx >= params.cols || ny < 0 || ny >= params.rows) {
            return true;
        }
        return (
            params.colorIdxByGridIdx[ny * params.cols + nx] !== params.selfColorIdx
        );
    };

    let dx = 0;
    let dy = 0;
    if (differs(params.ix - 1, params.iy)) dx += 1;
    if (differs(params.ix + 1, params.iy)) dx -= 1;
    if (differs(params.ix, params.iy - 1)) dy += 1;
    if (differs(params.ix, params.iy + 1)) dy -= 1;

    const length = Math.hypot(dx, dy);
    if (length <= 0) {
        return { x: 0, y: 0 };
    }

    const scale = params.distancePx / length;
    return {
        x: dx * scale,
        y: dy * scale,
    };
}
