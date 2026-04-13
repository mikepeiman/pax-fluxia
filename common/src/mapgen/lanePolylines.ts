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
const SOFT_CURVE_MIN_CHORD_PX = 180;
const SOFT_CURVE_BAND_MIN_PX = 10;
const SOFT_CURVE_BAND_MAX_PX = 28;
const SOFT_CURVE_BAND_SCALE = 0.22;
const RELAXED_CLEARANCE_FACTORS = [0.85, 0.7, 0.55, 0.4, 0.25, 0.1, 0] as const;

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

function nearestObstacleDistanceToChord(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    obstacles: Array<{ x: number; y: number }>,
): number {
    let nearest = Infinity;
    for (const obstacle of obstacles) {
        const d = pointToSegmentDistance(obstacle.x, obstacle.y, ax, ay, bx, by);
        if (d < nearest) nearest = d;
    }
    return nearest;
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

function searchBulgeWithCap(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    obstacles: Array<{ x: number; y: number }>,
    minDist: number,
    bulgeSign: 1 | -1,
    dCap: number,
): number {
    const chord = hypot(bx - ax, by - ay);
    if (chord < 1 || dCap <= 0) return 0;
    let lo = 0;
    let hi = Math.max(0, dCap);
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
    const preferredSigns = preferredBulgeSigns(ax, ay, bx, by, obstacles);
    const kinkSigns: Array<1 | -1> =
        preferredSigns.length === 1 ? [preferredSigns[0], preferredSigns[0] === 1 ? -1 : 1] : preferredSigns;
    for (let step = 0; step < 16; step++) {
        const off = (dMax * (step + 1)) / 16;
        for (const sign of kinkSigns) {
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

function preferredBulgeSigns(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    obstacles: Array<{ x: number; y: number }>,
): Array<1 | -1> {
    if (obstacles.length === 0) return [1, -1];
    let nearest: { x: number; y: number } | null = null;
    let nearestDist = Infinity;
    for (const obstacle of obstacles) {
        const d = pointToSegmentDistance(obstacle.x, obstacle.y, ax, ay, bx, by);
        if (d < nearestDist) {
            nearest = obstacle;
            nearestDist = d;
        }
    }
    if (!nearest) return [1, -1];

    const chord = hypot(bx - ax, by - ay) || 1;
    const ux = (bx - ax) / chord;
    const uy = (by - ay) / chord;
    const px = -uy;
    const py = ux;
    const mx = (ax + bx) * 0.5;
    const my = (ay + by) * 0.5;
    const obstacleSide = (nearest.x - mx) * px + (nearest.y - my) * py;
    return obstacleSide >= 0 ? [-1] : [1];
}

function effectiveLaneClearanceForChord(
    chordPx: number,
    configuredClearancePx: number,
): number {
    if (configuredClearancePx <= 0) return 0;
    // Short, direct local links should not be forced into decorative detours by
    // a large global lane-margin setting. Reserve the full margin for longer,
    // more crowd-prone lanes where clearance meaningfully improves readability.
    const lengthScaledCap = Math.max(18, chordPx * 0.32);
    return Math.min(configuredClearancePx, lengthScaledCap);
}

function tryCurveOrDetour(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    obstacles: Array<{ x: number; y: number }>,
    clearancePx: number,
    placed: Seg[],
    starCenters: Array<{ x: number; y: number }>,
): Array<[number, number]> | null {
    for (const bulgeSign of preferredBulgeSigns(ax, ay, bx, by, obstacles)) {
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

    return null;
}

function solveAdaptiveWaypoints(
    ax: number, ay: number,
    bx: number, by: number,
    obstacles: Array<{ x: number; y: number }>,
    clearancePx: number,
    placed: Seg[],
    starCenters: Array<{ x: number; y: number }>,
): Array<[number, number]> {
    const chord = hypot(bx - ax, by - ay);
    const effectiveClearancePx = effectiveLaneClearanceForChord(chord, clearancePx);
    const straight: Array<[number, number]> = [[ax, ay], [bx, by]];
    const okStraight =
        chordClearOfObstacles(ax, ay, bx, by, obstacles, effectiveClearancePx)
        && polylineClearOfObstacles(straight, obstacles, effectiveClearancePx)
        && !polylineCrossesPlaced(straight, placed, starCenters);
    if (okStraight) {
        const nearestObstacleDist = nearestObstacleDistanceToChord(ax, ay, bx, by, obstacles);
        const softCurveBand =
            effectiveClearancePx <= 0
                ? 0
                : Math.min(
                    SOFT_CURVE_BAND_MAX_PX,
                    Math.max(SOFT_CURVE_BAND_MIN_PX, effectiveClearancePx * SOFT_CURVE_BAND_SCALE),
                );
        const softCurveEligible =
            Number.isFinite(nearestObstacleDist)
            && chord >= SOFT_CURVE_MIN_CHORD_PX
            && nearestObstacleDist < effectiveClearancePx + softCurveBand;
        if (softCurveEligible) {
            const closenessRatio = Math.max(
                0,
                Math.min(1, 1 - (nearestObstacleDist - effectiveClearancePx) / Math.max(softCurveBand, 1)),
            );
            const softBulgeCap = Math.min(
                140,
                Math.max(20, chord * (0.06 + 0.18 * closenessRatio)),
            );
            for (const bulgeSign of preferredBulgeSigns(ax, ay, bx, by, obstacles)) {
                const best = searchBulgeWithCap(
                    ax,
                    ay,
                    bx,
                    by,
                    obstacles,
                    Math.max(0, effectiveClearancePx),
                    bulgeSign,
                    softBulgeCap,
                );
                if (best < chord * 0.015) continue;
                const cand = buildBezierWaypoints(ax, ay, bx, by, bulgeSign, best);
                if (!polylineClearOfObstacles(cand, obstacles, effectiveClearancePx)) continue;
                if (polylineCrossesPlaced(cand, placed, starCenters)) continue;
                return cand;
            }
        }
        return straight;
    }

    const strictSolved = tryCurveOrDetour(
        ax,
        ay,
        bx,
        by,
        obstacles,
        effectiveClearancePx,
        placed,
        starCenters,
    );
    if (strictSolved) return strictSolved;

    for (const factor of RELAXED_CLEARANCE_FACTORS) {
        const relaxedClearance = Math.max(0, effectiveClearancePx * factor);
        if (relaxedClearance >= effectiveClearancePx) continue;
        const relaxedSolved = tryCurveOrDetour(
            ax,
            ay,
            bx,
            by,
            obstacles,
            relaxedClearance,
            placed,
            starCenters,
        );
        if (relaxedSolved) return relaxedSolved;
    }

    // Last resort: preserve the connection visibly even if we have to relax the
    // lane-margin ambition all the way down to a straight chord.
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
