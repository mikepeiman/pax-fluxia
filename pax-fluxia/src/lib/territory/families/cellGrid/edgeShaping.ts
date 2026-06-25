export interface SharedBoundaryCornerRadiusParams {
    readonly cellShape: 'square' | 'circle' | 'diamond' | 'hex';
    readonly baseCornerPx: number;
    readonly halfSizePx: number;
    readonly smoothingPasses: number;
}

export interface ComputeBoundaryInsetParams {
    readonly insetMax: number;
    readonly cellInsetPx: number;
    readonly inwardOffsetPx: number;
    readonly edgeTrimPx: number;
    readonly flushBoundaryFill: boolean;
}

export interface SquareCellEdgeInsets {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
}

export interface ComputeSquareCellEdgeInsetsParams {
    readonly ix: number;
    readonly iy: number;
    readonly cols: number;
    readonly rows: number;
    readonly colorIdx: number;
    readonly colorIdxByGridIdx: Int32Array | null;
    readonly nativeInsetPx: number;
    readonly boundaryInsetPx: number;
    readonly useSharedEdgeBorders: boolean;
    readonly useOuterBorder: boolean;
}

export interface OwnershipBoundaryCellParams {
    readonly ix: number;
    readonly iy: number;
    readonly cols: number;
    readonly rows: number;
    readonly colorIdx: number;
    readonly colorIdxByGridIdx: Int32Array | null;
    readonly includeWorldEdge: boolean;
}

export function computeSharedBoundaryCornerRadius(
    params: SharedBoundaryCornerRadiusParams,
): number {
    const { cellShape, baseCornerPx, halfSizePx, smoothingPasses } = params;
    if (cellShape !== 'square') return 0;
    const clampedHalf = Math.max(0, halfSizePx);
    const baseRadius = Math.min(Math.max(0, baseCornerPx), clampedHalf);
    if (smoothingPasses <= 0 || clampedHalf <= 0) {
        return baseRadius;
    }
    const smoothingRadius = Math.min(
        clampedHalf,
        clampedHalf * Math.min(0.85, smoothingPasses * 0.18),
    );
    return Math.max(baseRadius, smoothingRadius);
}

export function computeBoundaryInset(
    params: ComputeBoundaryInsetParams,
): number {
    const legacyInset = computeBoundaryOffsetTargetPx(params);
    return Math.min(
        legacyInset,
        Math.max(0, params.insetMax),
    );
}

export function computeBoundaryOffsetTargetPx(
    params: Omit<ComputeBoundaryInsetParams, 'insetMax'>,
): number {
    const explicitInset = Math.max(0, params.inwardOffsetPx);
    const legacyInset =
        Math.max(0, params.cellInsetPx) +
        explicitInset +
        Math.max(0, params.edgeTrimPx);
    return params.flushBoundaryFill ? explicitInset : legacyInset;
}

export function computeSquareCellEdgeInsets(
    params: ComputeSquareCellEdgeInsetsParams,
): SquareCellEdgeInsets {
    const {
        ix,
        iy,
        cols,
        rows,
        colorIdx,
        colorIdxByGridIdx,
        nativeInsetPx,
        boundaryInsetPx,
        useSharedEdgeBorders,
        useOuterBorder,
    } = params;

    if (!colorIdxByGridIdx || (!useSharedEdgeBorders && !useOuterBorder)) {
        return {
            left: nativeInsetPx,
            right: nativeInsetPx,
            top: nativeInsetPx,
            bottom: nativeInsetPx,
        };
    }

    const sideInset = (nx: number, ny: number): number => {
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) {
            return useOuterBorder ? boundaryInsetPx : nativeInsetPx;
        }
        const neighborColorIdx = colorIdxByGridIdx[ny * cols + nx];
        if (neighborColorIdx < 0) {
            return useOuterBorder ? boundaryInsetPx : nativeInsetPx;
        }
        if (neighborColorIdx !== colorIdx) {
            return useSharedEdgeBorders ? boundaryInsetPx : nativeInsetPx;
        }
        return nativeInsetPx;
    };

    return {
        left: sideInset(ix - 1, iy),
        right: sideInset(ix + 1, iy),
        top: sideInset(ix, iy - 1),
        bottom: sideInset(ix, iy + 1),
    };
}

export function isOwnershipBoundaryCell(
    params: OwnershipBoundaryCellParams,
): boolean {
    const {
        ix,
        iy,
        cols,
        rows,
        colorIdx,
        colorIdxByGridIdx,
        includeWorldEdge,
    } = params;

    if (!colorIdxByGridIdx) return false;
    if (ix < 0 || ix >= cols || iy < 0 || iy >= rows) return false;

    const neighborDiffers = (nx: number, ny: number): boolean => {
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) {
            return includeWorldEdge;
        }
        const neighborColorIdx = colorIdxByGridIdx[ny * cols + nx];
        if (neighborColorIdx < 0) {
            return includeWorldEdge;
        }
        return neighborColorIdx !== colorIdx;
    };

    return (
        neighborDiffers(ix - 1, iy) ||
        neighborDiffers(ix + 1, iy) ||
        neighborDiffers(ix, iy - 1) ||
        neighborDiffers(ix, iy + 1)
    );
}

function trimEndpoint(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    trimPx: number,
): readonly [number, number] {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    if (!(len > 0) || trimPx <= 0) {
        return [x0, y0];
    }
    const applied = Math.min(trimPx, len * 0.45);
    const scale = applied / len;
    return [x0 + dx * scale, y0 + dy * scale];
}

export function trimOpenPolylineEndpoints(
    pts: readonly number[],
    trimPx: number,
): number[] {
    if (trimPx <= 0 || pts.length < 6) {
        return [...pts];
    }
    const out = [...pts];
    const [sx, sy] = trimEndpoint(
        out[0],
        out[1],
        out[2],
        out[3],
        trimPx,
    );
    out[0] = sx;
    out[1] = sy;
    const last = out.length - 1;
    const [ex, ey] = trimEndpoint(
        out[last - 1],
        out[last],
        out[last - 3],
        out[last - 2],
        trimPx,
    );
    out[last - 1] = ex;
    out[last] = ey;
    return out;
}
