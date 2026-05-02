export interface BuildOwnershipGridFrontierDistanceFieldParams {
    readonly cols: number;
    readonly rows: number;
    readonly ownerIndexByCell: Int32Array;
    readonly spacingPx: number;
    readonly includeWorldEdge: boolean;
}

export interface OwnershipGridFrontierDistanceField {
    readonly cols: number;
    readonly rows: number;
    readonly spacingPx: number;
    readonly includeWorldEdge: boolean;
    readonly leftDistancePxByCell: Float32Array;
    readonly rightDistancePxByCell: Float32Array;
    readonly topDistancePxByCell: Float32Array;
    readonly bottomDistancePxByCell: Float32Array;
    readonly nearestBoundaryPxByCell: Float32Array;
    readonly bandIndexByCell: Int32Array;
}

export interface ComputeVisibleSquareBoundsFromDistanceParams {
    readonly x: number;
    readonly y: number;
    readonly halfSizePx: number;
    readonly nativeInsetPx: number;
    readonly boundaryOffsetPx: number;
    readonly cellIndex: number;
    readonly distanceField: OwnershipGridFrontierDistanceField;
}

export interface VisibleSquareBounds {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
}

const INF = 1_000_000_000;

function isExteriorNeighbor(ownerIndex: number): boolean {
    return ownerIndex < 0;
}

export function buildOwnershipGridFrontierDistanceField(
    params: BuildOwnershipGridFrontierDistanceFieldParams,
): OwnershipGridFrontierDistanceField {
    const size = params.cols * params.rows;
    const leftDistancePxByCell = new Float32Array(size);
    const rightDistancePxByCell = new Float32Array(size);
    const topDistancePxByCell = new Float32Array(size);
    const bottomDistancePxByCell = new Float32Array(size);
    const nearestBoundaryPxByCell = new Float32Array(size);
    const bandIndexByCell = new Int32Array(size);

    leftDistancePxByCell.fill(INF);
    rightDistancePxByCell.fill(INF);
    topDistancePxByCell.fill(INF);
    bottomDistancePxByCell.fill(INF);
    nearestBoundaryPxByCell.fill(INF);
    bandIndexByCell.fill(-1);

    for (let iy = 0; iy < params.rows; iy++) {
        for (let ix = 0; ix < params.cols; ix++) {
            const cellIndex = iy * params.cols + ix;
            const ownerIndex = params.ownerIndexByCell[cellIndex];
            if (ownerIndex < 0) continue;

            if (ix === 0) {
                leftDistancePxByCell[cellIndex] = params.includeWorldEdge ? 0 : INF;
            } else {
                const neighborOwnerIndex = params.ownerIndexByCell[cellIndex - 1];
                leftDistancePxByCell[cellIndex] =
                    neighborOwnerIndex !== ownerIndex || isExteriorNeighbor(neighborOwnerIndex)
                        ? 0
                        : leftDistancePxByCell[cellIndex - 1] + params.spacingPx;
            }
        }

        for (let ix = params.cols - 1; ix >= 0; ix--) {
            const cellIndex = iy * params.cols + ix;
            const ownerIndex = params.ownerIndexByCell[cellIndex];
            if (ownerIndex < 0) continue;

            if (ix === params.cols - 1) {
                rightDistancePxByCell[cellIndex] = params.includeWorldEdge ? 0 : INF;
            } else {
                const neighborOwnerIndex = params.ownerIndexByCell[cellIndex + 1];
                rightDistancePxByCell[cellIndex] =
                    neighborOwnerIndex !== ownerIndex || isExteriorNeighbor(neighborOwnerIndex)
                        ? 0
                        : rightDistancePxByCell[cellIndex + 1] + params.spacingPx;
            }
        }
    }

    for (let ix = 0; ix < params.cols; ix++) {
        for (let iy = 0; iy < params.rows; iy++) {
            const cellIndex = iy * params.cols + ix;
            const ownerIndex = params.ownerIndexByCell[cellIndex];
            if (ownerIndex < 0) continue;

            if (iy === 0) {
                topDistancePxByCell[cellIndex] = params.includeWorldEdge ? 0 : INF;
            } else {
                const neighborOwnerIndex = params.ownerIndexByCell[cellIndex - params.cols];
                topDistancePxByCell[cellIndex] =
                    neighborOwnerIndex !== ownerIndex || isExteriorNeighbor(neighborOwnerIndex)
                        ? 0
                        : topDistancePxByCell[cellIndex - params.cols] + params.spacingPx;
            }
        }

        for (let iy = params.rows - 1; iy >= 0; iy--) {
            const cellIndex = iy * params.cols + ix;
            const ownerIndex = params.ownerIndexByCell[cellIndex];
            if (ownerIndex < 0) continue;

            if (iy === params.rows - 1) {
                bottomDistancePxByCell[cellIndex] = params.includeWorldEdge ? 0 : INF;
            } else {
                const neighborOwnerIndex = params.ownerIndexByCell[cellIndex + params.cols];
                bottomDistancePxByCell[cellIndex] =
                    neighborOwnerIndex !== ownerIndex || isExteriorNeighbor(neighborOwnerIndex)
                        ? 0
                        : bottomDistancePxByCell[cellIndex + params.cols] + params.spacingPx;
            }
        }
    }

    for (let i = 0; i < size; i++) {
        if (params.ownerIndexByCell[i] < 0) continue;
        const nearest = Math.min(
            leftDistancePxByCell[i],
            rightDistancePxByCell[i],
            topDistancePxByCell[i],
            bottomDistancePxByCell[i],
        );
        nearestBoundaryPxByCell[i] = nearest;
        bandIndexByCell[i] = Number.isFinite(nearest)
            ? Math.floor(nearest / Math.max(1, params.spacingPx))
            : -1;
    }

    return {
        cols: params.cols,
        rows: params.rows,
        spacingPx: params.spacingPx,
        includeWorldEdge: params.includeWorldEdge,
        leftDistancePxByCell,
        rightDistancePxByCell,
        topDistancePxByCell,
        bottomDistancePxByCell,
        nearestBoundaryPxByCell,
        bandIndexByCell,
    };
}

function resolveSideInsetPx(
    distancePx: number,
    nativeInsetPx: number,
    boundaryOffsetPx: number,
): number {
    if (!Number.isFinite(distancePx)) {
        return nativeInsetPx;
    }
    return distancePx <= boundaryOffsetPx
        ? Math.max(0, boundaryOffsetPx - distancePx)
        : nativeInsetPx;
}

export function computeVisibleSquareBoundsFromDistance(
    params: ComputeVisibleSquareBoundsFromDistanceParams,
): VisibleSquareBounds | null {
    const nearestBoundaryPx =
        params.distanceField.nearestBoundaryPxByCell[params.cellIndex] ?? INF;
    // Clean-offset mode should not leave arbitrarily tiny remnant cells
    // hugging the frontier forever. Once the requested pullback reaches the
    // center of a cell band, that entire band is considered inside the moat
    // and is suppressed wholesale; only the current leading band can remain
    // partially clipped.
    if (
        params.boundaryOffsetPx > 0 &&
        Number.isFinite(nearestBoundaryPx) &&
        nearestBoundaryPx + params.halfSizePx <= params.boundaryOffsetPx
    ) {
        return null;
    }

    const leftInsetPx = resolveSideInsetPx(
        params.distanceField.leftDistancePxByCell[params.cellIndex] ?? INF,
        params.nativeInsetPx,
        params.boundaryOffsetPx,
    );
    const rightInsetPx = resolveSideInsetPx(
        params.distanceField.rightDistancePxByCell[params.cellIndex] ?? INF,
        params.nativeInsetPx,
        params.boundaryOffsetPx,
    );
    const topInsetPx = resolveSideInsetPx(
        params.distanceField.topDistancePxByCell[params.cellIndex] ?? INF,
        params.nativeInsetPx,
        params.boundaryOffsetPx,
    );
    const bottomInsetPx = resolveSideInsetPx(
        params.distanceField.bottomDistancePxByCell[params.cellIndex] ?? INF,
        params.nativeInsetPx,
        params.boundaryOffsetPx,
    );

    const left = params.x - params.halfSizePx + leftInsetPx;
    const right = params.x + params.halfSizePx - rightInsetPx;
    const top = params.y - params.halfSizePx + topInsetPx;
    const bottom = params.y + params.halfSizePx - bottomInsetPx;

    if (!(right > left) || !(bottom > top)) {
        return null;
    }

    return { left, right, top, bottom };
}
