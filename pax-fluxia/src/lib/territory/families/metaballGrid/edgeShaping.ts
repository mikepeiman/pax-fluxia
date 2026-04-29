export interface SharedBoundaryCornerRadiusParams {
    readonly cellShape: 'square' | 'circle' | 'diamond' | 'hex';
    readonly baseCornerPx: number;
    readonly halfSizePx: number;
    readonly smoothingPasses: number;
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
