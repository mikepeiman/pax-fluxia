// ============================================================================
// Lane polylines — centerlines between star centers (mapgen + runtime).
// - `straight`: chord only.
// - `curved`: straight chord when it satisfies **lane margin** vs other stars, does not
//   cross existing lanes, and passes dense sampling; otherwise quadratic Bézier
//   (both bulge directions), then a single-kink detour — curves satisfy the same
//   clearance as straights (not decorative). Topology may still add edges whose chord
//   fails clearance; those are curved here while sampled paths respect margin.
//
// Solver bounds (deterministic): bulge binary search ≤14 iters; single-kink grid
// ≤16 offsets × 2 signs; Bézier sample count 21; polyline segment interior samples <8.
// ============================================================================

import type { Connectable, LanePathKind, MapConnection } from './types';
import { pointToSegmentDistance } from './connections';

export type MapLaneMode = 'straight' | 'curved';

const INTERIOR_T = 1e-3;
const STAR_TOUCH_PX = 3;

function hypot(dx: number, dy: number): number {
    return Math.sqrt(dx * dx + dy * dy);
}

function quadBezierPoint(
    ax: number, ay: number,
    cx: number, cy: number,
    bx: number, by: number,
    t: number,
): [number, number] {
    const mt = 1 - t;
    const x = mt * mt * ax + 2 * mt * t * cx + t * t * bx;
    const y = mt * mt * ay + 2 * mt * t * cy + t * t * by;
    return [x, y];
}

/** True if every point on segment AB is ≥ minDist from each obstacle center. */
function chordClearOfObstacles(
    ax: number, ay: number,
    bx: number, by: number,
    obstacles: Array<{ x: number; y: number }>,
    minDist: number,
): boolean {
    for (const o of obstacles) {
        if (pointToSegmentDistance(o.x, o.y, ax, ay, bx, by) < minDist) return false;
    }
    return true;
}

/** Dense-enough sample along polyline segments vs obstacles. */
function polylineClearOfObstacles(
    pts: Array<[number, number]>,
    obstacles: Array<{ x: number; y: number }>,
    minDist: number,
): boolean {
    for (let i = 0; i < pts.length - 1; i++) {
        const x1 = pts[i][0], y1 = pts[i][1];
        const x2 = pts[i + 1][0], y2 = pts[i + 1][1];
        if (!chordClearOfObstacles(x1, y1, x2, y2, obstacles, minDist)) return false;
        for (let s = 1; s < 8; s++) {
            const t = s / 8;
            const px = x1 + (x2 - x1) * t;
            const py = y1 + (y2 - y1) * t;
            for (const o of obstacles) {
                if (hypot(px - o.x, py - o.y) < minDist) return false;
            }
        }
    }
    return true;
}

type Seg = { ax: number; ay: number; bx: number; by: number };

function intersectionParams(
    ax: number, ay: number, bx: number, by: number,
    cx: number, cy: number, dx: number, dy: number,
): { hit: boolean; t: number } {
    const rdx = bx - ax, rdy = by - ay;
    const sdx = dx - cx, sdy = dy - cy;
    const denom = rdx * sdy - rdy * sdx;
    if (Math.abs(denom) < 1e-14) return { hit: false, t: 0 };
    const acx = cx - ax, acy = cy - ay;
    const t = (acx * sdy - acy * sdx) / denom;
    const s = (acx * rdy - acy * rdx) / denom;
    if (t > INTERIOR_T && t < 1 - INTERIOR_T && s > INTERIOR_T && s < 1 - INTERIOR_T) {
        return { hit: true, t };
    }
    return { hit: false, t };
}

function nearAnyStarCenter(px: number, py: number, stars: Array<{ x: number; y: number }>): boolean {
    for (const s of stars) {
        if (hypot(px - s.x, py - s.y) < STAR_TOUCH_PX) return true;
    }
    return false;
}

function polylineCrossesPlaced(
    pts: Array<[number, number]>,
    placed: Seg[],
    starCenters: Array<{ x: number; y: number }>,
): boolean {
    for (let i = 0; i < pts.length - 1; i++) {
        const ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1];
        for (const seg of placed) {
            const { hit, t } = intersectionParams(ax, ay, bx, by, seg.ax, seg.ay, seg.bx, seg.by);
            if (!hit) continue;
            const ix = ax + (bx - ax) * t;
            const iy = ay + (by - ay) * t;
            if (nearAnyStarCenter(ix, iy, starCenters)) continue;
            return true;
        }
    }
    return false;
}

function polylineToSegments(pts: Array<[number, number]>): Seg[] {
    const out: Seg[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
        out.push({ ax: pts[i][0], ay: pts[i][1], bx: pts[i + 1][0], by: pts[i + 1][1] });
    }
    return out;
}

function bezierSamplesClear(
    ax: number, ay: number,
    cx: number, cy: number,
    bx: number, by: number,
    obstacles: Array<{ x: number; y: number }>,
    minDist: number,
): boolean {
    for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const [px, py] = quadBezierPoint(ax, ay, cx, cy, bx, by, t);
        for (const o of obstacles) {
            if (hypot(px - o.x, py - o.y) < minDist) return false;
        }
    }
    return true;
}

function buildBezierWaypoints(
    ax: number, ay: number,
    bx: number, by: number,
    bulgeSign: 1 | -1,
    bestD: number,
): Array<[number, number]> {
    const chord = hypot(bx - ax, by - ay);
    const mx = (ax + bx) * 0.5;
    const my = (ay + by) * 0.5;
    const ux = (bx - ax) / chord;
    const uy = (by - ay) / chord;
    const px = -uy * bulgeSign;
    const py = ux * bulgeSign;
    const cx = mx + px * bestD;
    const cy = my + py * bestD;
    const steps = 16;
    const out: Array<[number, number]> = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        out.push(quadBezierPoint(ax, ay, cx, cy, bx, by, t));
    }
    return out;
}

/** Largest feasible perpendicular offset (binary search) for one bulge sign. */
function searchBulge(
    ax: number, ay: number,
    bx: number, by: number,
    obstacles: Array<{ x: number; y: number }>,
    minDist: number,
    bulgeSign: 1 | -1,
): number {
    const chord = hypot(bx - ax, by - ay);
    if (chord < 1) return 0;
    const dMax = Math.min(chord * 0.38, 220);
    let lo = 0;
    let hi = dMax;
    let best = 0;
    for (let iter = 0; iter < 14; iter++) {
        const mid = (lo + hi) * 0.5;
        const mx = (ax + bx) * 0.5;
        const my = (ay + by) * 0.5;
        const ux = (bx - ax) / chord;
        const uy = (by - ay) / chord;
        const px = -uy * bulgeSign;
        const py = ux * bulgeSign;
        const cx = mx + px * mid;
        const cy = my + py * mid;
        if (bezierSamplesClear(ax, ay, cx, cy, bx, by, obstacles, minDist)) {
            best = mid;
            lo = mid;
        } else {
            hi = mid;
        }
    }
    return best;
}

function trySingleKinkDetour(
    ax: number, ay: number,
    bx: number, by: number,
    obstacles: Array<{ x: number; y: number }>,
    minDist: number,
    placed: Seg[],
    starCenters: Array<{ x: number; y: number }>,
): Array<[number, number]> | null {
    const chord = hypot(bx - ax, by - ay);
    if (chord < 1) return null;
    const mx = (ax + bx) * 0.5;
    const my = (ay + by) * 0.5;
    const ux = (bx - ax) / chord;
    const uy = (by - ay) / chord;
    const nx = -uy;
    const ny = ux;
    const dMax = Math.min(chord * 0.35, 180);
    for (let step = 0; step < 16; step++) {
        const off = (dMax * (step + 1)) / 16;
        for (const sign of [1, -1] as const) {
            const kx = mx + nx * off * sign;
            const ky = my + ny * off * sign;
            const pts: Array<[number, number]> = [[ax, ay], [kx, ky], [bx, by]];
            if (!polylineClearOfObstacles(pts, obstacles, minDist)) continue;
            if (polylineCrossesPlaced(pts, placed, starCenters)) continue;
            return pts;
        }
    }
    return null;
}

function chaikinSmoothOpenPolyline(
    pts: Array<[number, number]>,
    passes: number = 2,
): Array<[number, number]> {
    let out = pts.slice();
    for (let pass = 0; pass < passes; pass++) {
        if (out.length < 3) return out;
        const next: Array<[number, number]> = [out[0]];
        for (let i = 0; i < out.length - 1; i++) {
            const [x0, y0] = out[i];
            const [x1, y1] = out[i + 1];
            next.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25]);
            next.push([x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75]);
        }
        next.push(out[out.length - 1]);
        out = next;
    }
    return out;
}

function solveAdaptiveWaypoints(
    ax: number, ay: number,
    bx: number, by: number,
    obstacles: Array<{ x: number; y: number }>,
    clearancePx: number,
    placed: Seg[],
    starCenters: Array<{ x: number; y: number }>,
): Array<[number, number]> {
    const straight: Array<[number, number]> = [[ax, ay], [bx, by]];
    const okStraight =
        chordClearOfObstacles(ax, ay, bx, by, obstacles, clearancePx)
        && polylineClearOfObstacles(straight, obstacles, clearancePx)
        && !polylineCrossesPlaced(straight, placed, starCenters);
    if (okStraight) return straight;

    for (const bulgeSign of [1, -1] as const) {
        const best = searchBulge(ax, ay, bx, by, obstacles, clearancePx, bulgeSign);
        if (best < hypot(bx - ax, by - ay) * 0.015) continue;
        const cand = buildBezierWaypoints(ax, ay, bx, by, bulgeSign, best);
        if (!polylineClearOfObstacles(cand, obstacles, clearancePx)) continue;
        if (polylineCrossesPlaced(cand, placed, starCenters)) continue;
        return cand;
    }

    const kink = trySingleKinkDetour(ax, ay, bx, by, obstacles, clearancePx, placed, starCenters);
    if (kink) {
        const smoothed = chaikinSmoothOpenPolyline(kink, 2);
        if (
            polylineClearOfObstacles(smoothed, obstacles, clearancePx)
            && !polylineCrossesPlaced(smoothed, placed, starCenters)
        ) {
            return smoothed;
        }
        return kink;
    }

    // Last resort: chord (preserves clearance vs stars; may cross another lane in pathological maps)
    return straight;
}

/**
 * Single edge (no lane–lane crossing check). Same clearance and adaptive rules otherwise.
 * @param laneObstacleClearancePx — lane margin only (`mapgenLaneMarginPx`); independent of territory MSR.
 */
export function computeLaneWaypoints(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    obstacleCenters: Array<{ x: number; y: number }>,
    laneObstacleClearancePx: number,
    mode: MapLaneMode,
): Array<[number, number]> {
    if (mode === 'straight') {
        return [[ax, ay], [bx, by]];
    }
    return solveAdaptiveWaypoints(
        ax,
        ay,
        bx,
        by,
        obstacleCenters,
        laneObstacleClearancePx,
        [],
        obstacleCenters,
    );
}

export function attachLaneWaypointsToConnections<T extends Connectable>(
    nodes: T[],
    connections: MapConnection[],
    mode: MapLaneMode,
    /**
     * Minimum distance from sampled lane centerline to any non-endpoint star center.
     * Use the same **lane margin** (px) as `generateConnections` pass-through prune.
     */
    laneObstacleClearancePx: number,
): void {
    const pos = new Map(nodes.map((n) => [n.id, n]));
    const starCenters = nodes.map((n) => ({ x: n.x, y: n.y }));

    const withLen = connections.map((c) => {
        const a = pos.get(c.sourceId);
        const b = pos.get(c.targetId);
        const dist = a && b ? hypot(b.x - a.x, b.y - a.y) : 0;
        return { c, dist };
    });
    withLen.sort((u, v) => v.dist - u.dist);

    const placed: Seg[] = [];

    for (const { c } of withLen) {
        const a = pos.get(c.sourceId);
        const b = pos.get(c.targetId);
        if (!a || !b) continue;

        const obstacles = nodes
            .filter((n) => n.id !== c.sourceId && n.id !== c.targetId)
            .map((n) => ({ x: n.x, y: n.y }));

        const clearance = Math.max(0, laneObstacleClearancePx);
        let wp: Array<[number, number]>;
        let pathKind: LanePathKind;
        if (mode === 'straight') {
            wp = [[a.x, a.y], [b.x, b.y]];
            pathKind = 'straight';
        } else {
            wp = solveAdaptiveWaypoints(
                a.x,
                a.y,
                b.x,
                b.y,
                obstacles,
                clearance,
                placed,
                starCenters,
            );
            pathKind = wp.length <= 2 ? 'straight' : 'curved';
        }
        c.laneWaypoints = wp;
        c.lanePathKind = pathKind;
        placed.push(...polylineToSegments(wp));
    }
}
