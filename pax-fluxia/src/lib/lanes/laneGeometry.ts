// ============================================================================
// Polyline helpers for lane travel + corridor sampling (arc length).
// ============================================================================

const EPS = 1e-9;

export function polylineTotalLength(pts: ReadonlyArray<readonly [number, number]>): number {
    let L = 0;
    for (let i = 1; i < pts.length; i++) {
        const dx = pts[i][0] - pts[i - 1][0];
        const dy = pts[i][1] - pts[i - 1][1];
        L += Math.hypot(dx, dy);
    }
    return L;
}

/** Arc-length position `dist` from the start of the polyline (clamped). */
export function pointAtArcLength(
    pts: ReadonlyArray<readonly [number, number]>,
    dist: number,
): { x: number; y: number } {
    if (pts.length === 0) return { x: 0, y: 0 };
    if (pts.length === 1) return { x: pts[0][0], y: pts[0][1] };
    let remaining = Math.max(0, dist);
    for (let i = 1; i < pts.length; i++) {
        const ax = pts[i - 1][0];
        const ay = pts[i - 1][1];
        const bx = pts[i][0];
        const by = pts[i][1];
        const segLen = Math.hypot(bx - ax, by - ay);
        if (segLen < EPS) continue;
        if (remaining <= segLen) {
            const t = remaining / segLen;
            return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t };
        }
        remaining -= segLen;
    }
    const last = pts[pts.length - 1];
    return { x: last[0], y: last[1] };
}

/** 0 = first point, 1 = last point (by arc length). */
export function pointAtArcFraction(
    pts: ReadonlyArray<readonly [number, number]>,
    u: number,
): { x: number; y: number } {
    const total = polylineTotalLength(pts);
    if (total < EPS) {
        const p = pts[0];
        return { x: p[0], y: p[1] };
    }
    const uu = Math.max(0, Math.min(1, u));
    return pointAtArcLength(pts, uu * total);
}

export function slicePolylineBetweenDistances(
    pts: ReadonlyArray<readonly [number, number]>,
    startDist: number,
    endDist: number,
): [number, number][] {
    if (pts.length < 2) return pts.map((p) => [p[0], p[1]] as [number, number]);
    const total = polylineTotalLength(pts);
    if (total < EPS) return pts.map((p) => [p[0], p[1]] as [number, number]);

    const start = Math.max(0, Math.min(total, startDist));
    const end = Math.max(start, Math.min(total, endDist));
    const out: [number, number][] = [];
    const first = pointAtArcLength(pts, start);
    out.push([first.x, first.y]);

    let walked = 0;
    for (let i = 1; i < pts.length; i++) {
        const ax = pts[i - 1][0];
        const ay = pts[i - 1][1];
        const bx = pts[i][0];
        const by = pts[i][1];
        const segLen = Math.hypot(bx - ax, by - ay);
        const segStart = walked;
        const segEnd = walked + segLen;
        walked = segEnd;

        if (segLen < EPS || segEnd <= start || segStart >= end) continue;

        if (segStart >= start && segEnd <= end) {
            out.push([bx, by]);
        } else {
            const from = Math.max(start, segStart);
            const to = Math.min(end, segEnd);
            if (to <= from) continue;
            const tTo = (to - segStart) / segLen;
            out.push([ax + (bx - ax) * tTo, ay + (by - ay) * tTo]);
        }
    }

    const last = pointAtArcLength(pts, end);
    const tail = out[out.length - 1];
    if (!tail || Math.hypot(tail[0] - last.x, tail[1] - last.y) > 1e-6) {
        out.push([last.x, last.y]);
    }
    return out;
}

/** Unit tangent at arc fraction u (0..1). */
export function tangentAtArcFraction(
    pts: ReadonlyArray<readonly [number, number]>,
    u: number,
): { tx: number; ty: number } {
    const total = polylineTotalLength(pts);
    if (total < EPS) return { tx: 1, ty: 0 };
    const d = Math.max(0, Math.min(1, u)) * total;
    let remaining = d;
    for (let i = 1; i < pts.length; i++) {
        const ax = pts[i - 1][0];
        const ay = pts[i - 1][1];
        const bx = pts[i][0];
        const by = pts[i][1];
        const dx = bx - ax;
        const dy = by - ay;
        const segLen = Math.hypot(dx, dy);
        if (segLen < EPS) continue;
        if (remaining <= segLen || i === pts.length - 1) {
            const len = segLen || 1;
            return { tx: dx / len, ty: dy / len };
        }
        remaining -= segLen;
    }
    const ax = pts[pts.length - 2][0];
    const ay = pts[pts.length - 2][1];
    const bx = pts[pts.length - 1][0];
    const by = pts[pts.length - 1][1];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    return { tx: dx / len, ty: dy / len };
}

export interface StarRimRef {
    x: number;
    y: number;
    radius: number;
}

/**
 * Trim a center-to-center lane polyline so endpoints sit outside each star rim (+ pad),
 * using Euclidean distance from each star center along the arc parameter.
 */
export function trimLanePolylineToStarRims(
    pts: ReadonlyArray<readonly [number, number]>,
    source: StarRimRef,
    target: StarRimRef,
    pad = 5,
): [number, number][] {
    if (pts.length < 2) return [...pts] as [number, number][];

    const needA = source.radius + pad;
    const needB = target.radius + pad;
    const total = polylineTotalLength(pts);
    if (total < EPS) {
        return [[pts[0][0], pts[0][1]], [pts[pts.length - 1][0], pts[pts.length - 1][1]]];
    }

    const distSrc = (d: number) => {
        const p = pointAtArcLength(pts, Math.max(0, Math.min(total, d)));
        return Math.hypot(p.x - source.x, p.y - source.y);
    };
    const distTgt = (d: number) => {
        const p = pointAtArcLength(pts, Math.max(0, Math.min(total, d)));
        return Math.hypot(p.x - target.x, p.y - target.y);
    };

    let dStart = 0;
    if (distSrc(0) < needA) {
        let lo = 0;
        let hi = total;
        for (let i = 0; i < 24; i++) {
            const mid = (lo + hi) * 0.5;
            if (distSrc(mid) >= needA) hi = mid;
            else lo = mid;
        }
        dStart = hi;
    }

    let dEnd = total;
    if (distTgt(total) < needB) {
        let lo = 0;
        let hi = total;
        for (let i = 0; i < 24; i++) {
            const mid = (lo + hi) * 0.5;
            if (distTgt(mid) >= needB) lo = mid;
            else hi = mid;
        }
        dEnd = lo;
    }

    if (dEnd - dStart < 1) {
        const a = pointAtArcLength(pts, dStart);
        const b = pointAtArcLength(pts, Math.max(dStart, dEnd));
        return [[a.x, a.y], [b.x, b.y]];
    }

    const interiorSteps = 24;
    const out: [number, number][] = [];
    for (let i = 0; i <= interiorSteps; i++) {
        const t = i / interiorSteps;
        const d = dStart + (dEnd - dStart) * t;
        const p = pointAtArcLength(pts, d);
        out.push([p.x, p.y]);
    }
    return out;
}
