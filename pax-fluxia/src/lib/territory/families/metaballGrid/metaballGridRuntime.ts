import type {
    GridAdjacency,
    GridDistribution,
    GridOriginMode,
    GridWaveGeometry,
    GridWaveSeeding,
} from './metaballGridTypes';

export interface MetaballGridPlanKeyParams {
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
export function buildMetaballGridPlanKey(
    params: MetaballGridPlanKeyParams,
): string {
    return [
        params.transitionKey,
        params.geometryVersion,
        params.geometrySource ?? '',
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
