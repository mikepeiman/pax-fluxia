// ============================================================================
// Lane polylines — centerlines between star centers (mapgen + runtime).
//
// Hierarchy:
// 1. Full traversal connectivity wins globally.
// 2. If a straight chord satisfies lane margin, keep it straight.
// 3. If a straight chord violates lane margin:
//    - remap enabled: try adjusted paths that satisfy the same clearance
//    - remap disabled: reject that specific lane
// 4. If the strict feasible graph is disconnected, connectivity is restored explicitly
//    at the graph layer, not by silently mutating renderer-only geometry.
//
// Solver bounds (deterministic): bulge binary search ≤14 iters; single-kink grid
// ≤16 offsets × 2 signs; Bézier sample count 21; polyline segment interior samples <8.
// ============================================================================

import type { Connectable, LaneAdjustmentStyle, LanePathKind, MapConnection } from './types';
import { pointToSegmentDistance } from './connections';

export type MapLaneMode = 'straight' | 'curved';

export interface LaneAttemptTrace {
    candidateKind: 'straight' | 'angular' | 'curved';
    sign?: 1 | -1;
    minimumClearancePx: number;
    requiredClearancePx: number;
    waypointCount: number;
    accepted: boolean;
    reason: string;
}

export interface LaneDecisionTrace {
    requestedClearancePx: number;
    effectiveClearancePx: number;
    chordDistancePx: number;
    chordMinClearancePx: number;
    chordPassesRequested: boolean;
    chordPassesEffective: boolean;
    straightBlockedByClearance: boolean;
    straightBlockedByLaneCross: boolean;
    finalPathKind: LanePathKind | 'missing';
    finalMinClearancePx: number;
    finalPassesRequested: boolean;
    finalReason: string;
    attempts: LaneAttemptTrace[];
}

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

function minimumObstacleDistanceToPolyline(
    pts: Array<[number, number]>,
    obstacles: Array<{ x: number; y: number }>,
): number {
    if (obstacles.length === 0) return Number.POSITIVE_INFINITY;
    let nearest = Number.POSITIVE_INFINITY;
    for (const obstacle of obstacles) {
        for (let i = 0; i < pts.length - 1; i++) {
            const [ax, ay] = pts[i]!;
            const [bx, by] = pts[i + 1]!;
            const d = pointToSegmentDistance(obstacle.x, obstacle.y, ax, ay, bx, by);
            if (d < nearest) nearest = d;
        }
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

function buildQuadraticWaypointsViaControl(
    ax: number,
    ay: number,
    cx: number,
    cy: number,
    bx: number,
    by: number,
    steps: number = 20,
): Array<[number, number]> {
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

export function effectiveLaneClearanceForChord(
    chordPx: number,
    configuredClearancePx: number,
): number {
    void chordPx;
    return Math.max(0, configuredClearancePx);
}

type LaneSolveResult = {
    waypoints: Array<[number, number]>;
    kind: LanePathKind;
};

function tryAdjustedPath(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    obstacles: Array<{ x: number; y: number }>,
    clearancePx: number,
    placed: Seg[],
    starCenters: Array<{ x: number; y: number }>,
    adjustmentStyle: LaneAdjustmentStyle,
    trace?: LaneDecisionTrace,
): LaneSolveResult | null {
    if (adjustmentStyle === 'angular') {
        const kink = trySingleKinkDetour(ax, ay, bx, by, obstacles, clearancePx, placed, starCenters);
        if (!kink) {
            trace?.attempts.push({
                candidateKind: 'angular',
                minimumClearancePx: 0,
                requiredClearancePx: clearancePx,
                waypointCount: 0,
                accepted: false,
                reason: 'no_valid_angular_detour',
            });
            return null;
        }
        trace?.attempts.push({
            candidateKind: 'angular',
            minimumClearancePx: minimumObstacleDistanceToPolyline(kink, obstacles),
            requiredClearancePx: clearancePx,
            waypointCount: kink.length,
            accepted: true,
            reason: 'accepted',
        });
        return { waypoints: kink, kind: 'angular' };
    }

    for (const bulgeSign of preferredBulgeSigns(ax, ay, bx, by, obstacles)) {
        const best = searchBulge(ax, ay, bx, by, obstacles, clearancePx, bulgeSign);
        if (best < hypot(bx - ax, by - ay) * 0.015) {
            trace?.attempts.push({
                candidateKind: 'curved',
                sign: bulgeSign,
                minimumClearancePx: 0,
                requiredClearancePx: clearancePx,
                waypointCount: 0,
                accepted: false,
                reason: 'insufficient_bulge',
            });
            continue;
        }
        const cand = buildBezierWaypoints(ax, ay, bx, by, bulgeSign, best);
        const minimumClearancePx = minimumObstacleDistanceToPolyline(cand, obstacles);
        if (!polylineClearOfObstacles(cand, obstacles, clearancePx)) {
            trace?.attempts.push({
                candidateKind: 'curved',
                sign: bulgeSign,
                minimumClearancePx,
                requiredClearancePx: clearancePx,
                waypointCount: cand.length,
                accepted: false,
                reason: 'clearance_fail',
            });
            continue;
        }
        if (polylineCrossesPlaced(cand, placed, starCenters)) {
            trace?.attempts.push({
                candidateKind: 'curved',
                sign: bulgeSign,
                minimumClearancePx,
                requiredClearancePx: clearancePx,
                waypointCount: cand.length,
                accepted: false,
                reason: 'lane_cross',
            });
            continue;
        }
        trace?.attempts.push({
            candidateKind: 'curved',
            sign: bulgeSign,
            minimumClearancePx,
            requiredClearancePx: clearancePx,
            waypointCount: cand.length,
            accepted: true,
            reason: 'accepted',
        });
        return { waypoints: cand, kind: 'curved' };
    }

    const kink = trySingleKinkDetour(ax, ay, bx, by, obstacles, clearancePx, placed, starCenters);
    if (kink) {
        const [, control, ] = kink;
        const curved = buildQuadraticWaypointsViaControl(ax, ay, control[0], control[1], bx, by);
        const minimumClearancePx = minimumObstacleDistanceToPolyline(curved, obstacles);
        if (
            polylineClearOfObstacles(curved, obstacles, clearancePx)
            && !polylineCrossesPlaced(curved, placed, starCenters)
        ) {
            trace?.attempts.push({
                candidateKind: 'curved',
                minimumClearancePx,
                requiredClearancePx: clearancePx,
                waypointCount: curved.length,
                accepted: true,
                reason: 'accepted_via_quadratic_remap',
            });
            return { waypoints: curved, kind: 'curved' };
        }
        trace?.attempts.push({
            candidateKind: 'curved',
            minimumClearancePx,
            requiredClearancePx: clearancePx,
            waypointCount: curved.length,
            accepted: false,
            reason: 'quadratic_remap_failed',
        });
    } else {
        trace?.attempts.push({
            candidateKind: 'curved',
            minimumClearancePx: 0,
            requiredClearancePx: clearancePx,
            waypointCount: 0,
            accepted: false,
            reason: 'no_valid_kink_seed',
        });
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
    adjustmentStyle: LaneAdjustmentStyle,
    allowRemap: boolean,
    trace?: LaneDecisionTrace,
): LaneSolveResult | null {
    const chord = hypot(bx - ax, by - ay);
    const effectiveClearancePx = effectiveLaneClearanceForChord(chord, clearancePx);
    const straight: Array<[number, number]> = [[ax, ay], [bx, by]];
    const chordMinClearancePx = nearestObstacleDistanceToChord(ax, ay, bx, by, obstacles);
    if (trace) {
        trace.requestedClearancePx = clearancePx;
        trace.effectiveClearancePx = effectiveClearancePx;
        trace.chordDistancePx = chord;
        trace.chordMinClearancePx = chordMinClearancePx;
        trace.chordPassesRequested = chordMinClearancePx >= clearancePx;
        trace.chordPassesEffective = chordMinClearancePx >= effectiveClearancePx;
    }
    const straightBlockedByClearance =
        !chordClearOfObstacles(ax, ay, bx, by, obstacles, effectiveClearancePx)
        || !polylineClearOfObstacles(straight, obstacles, effectiveClearancePx);
    const straightBlockedByLaneCross = polylineCrossesPlaced(straight, placed, starCenters);
    if (trace) {
        trace.straightBlockedByClearance = straightBlockedByClearance;
        trace.straightBlockedByLaneCross = straightBlockedByLaneCross;
    }
    const okStraight = !straightBlockedByClearance;
    trace?.attempts.push({
        candidateKind: 'straight',
        minimumClearancePx: chordMinClearancePx,
        requiredClearancePx: clearancePx,
        waypointCount: straight.length,
        accepted: okStraight,
        reason: okStraight
            ? 'accepted'
            : straightBlockedByClearance && straightBlockedByLaneCross
              ? 'blocked_by_clearance_and_lane_cross'
              : straightBlockedByClearance
                ? 'blocked_by_clearance'
                : 'blocked_by_lane_cross',
    });
    if (okStraight) {
        if (trace) {
            trace.finalPathKind = 'straight';
            trace.finalMinClearancePx = chordMinClearancePx;
            trace.finalPassesRequested = chordMinClearancePx >= clearancePx;
            trace.finalReason = 'straight_clear';
        }
        return { waypoints: straight, kind: 'straight' };
    }

    if (!allowRemap) {
        if (trace) {
            trace.finalPathKind = 'missing';
            trace.finalMinClearancePx = chordMinClearancePx;
            trace.finalPassesRequested = chordMinClearancePx >= clearancePx;
            trace.finalReason = 'blocked_and_remap_disabled';
        }
        return null;
    }

    const strictSolved = tryAdjustedPath(
        ax,
        ay,
        bx,
        by,
        obstacles,
        effectiveClearancePx,
        placed,
        starCenters,
        adjustmentStyle,
        trace,
    );
    if (strictSolved) {
        if (trace) {
            const finalMinClearancePx = minimumObstacleDistanceToPolyline(
                strictSolved.waypoints,
                obstacles,
            );
            trace.finalPathKind = strictSolved.kind;
            trace.finalMinClearancePx = finalMinClearancePx;
            trace.finalPassesRequested = finalMinClearancePx >= clearancePx;
            trace.finalReason = 'adjusted_path_accepted';
        }
        return strictSolved;
    }
    if (trace) {
        trace.finalPathKind = 'missing';
        trace.finalMinClearancePx = chordMinClearancePx;
        trace.finalPassesRequested = false;
        trace.finalReason = 'no_valid_adjusted_path';
    }
    return null;
}

function createLaneDecisionTrace(): LaneDecisionTrace {
    return {
        requestedClearancePx: 0,
        effectiveClearancePx: 0,
        chordDistancePx: 0,
        chordMinClearancePx: 0,
        chordPassesRequested: false,
        chordPassesEffective: false,
        straightBlockedByClearance: false,
        straightBlockedByLaneCross: false,
        finalPathKind: 'missing',
        finalMinClearancePx: 0,
        finalPassesRequested: false,
        finalReason: 'unresolved',
        attempts: [],
    };
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
        'curved',
        true,
    )?.waypoints ?? [];
}

function tryResolveLaneConnection(
    a: Connectable,
    b: Connectable,
    nodes: Connectable[],
    placed: Seg[],
    starCenters: Array<{ x: number; y: number }>,
    mode: MapLaneMode,
    laneObstacleClearancePx: number,
    remapBias: number,
    adjustmentStyle: LaneAdjustmentStyle,
    trace?: LaneDecisionTrace,
): MapConnection | null {
    const obstacles = nodes
        .filter((n) => n.id !== a.id && n.id !== b.id)
        .map((n) => ({ x: n.x, y: n.y }));
    const clearance = Math.max(0, laneObstacleClearancePx);

    let laneWaypoints: Array<[number, number]> = [];
    let lanePathKind: LanePathKind = 'straight';
    if (mode === 'straight') {
        laneWaypoints = [[a.x, a.y], [b.x, b.y]];
    } else {
        const resolved = solveAdaptiveWaypoints(
            a.x,
            a.y,
            b.x,
            b.y,
            obstacles,
            clearance,
            placed,
            starCenters,
            adjustmentStyle,
            remapBias > 0,
            trace,
        );
        if (!resolved || resolved.waypoints.length < 2) return null;
        laneWaypoints = resolved.waypoints;
        lanePathKind = resolved.kind;
    }

    return {
        sourceId: a.id,
        targetId: b.id,
        distance: hypot(b.x - a.x, b.y - a.y),
        laneWaypoints,
        lanePathKind,
    };
}

export function debugResolveLaneConnection(
    a: Connectable,
    b: Connectable,
    nodes: Connectable[],
    placed: Seg[],
    starCenters: Array<{ x: number; y: number }>,
    mode: MapLaneMode,
    laneObstacleClearancePx: number,
    remapBias: number,
    adjustmentStyle: LaneAdjustmentStyle,
): { connection: MapConnection | null; trace: LaneDecisionTrace } {
    const trace = createLaneDecisionTrace();
    const connection = tryResolveLaneConnection(
        a,
        b,
        nodes,
        placed,
        starCenters,
        mode,
        laneObstacleClearancePx,
        remapBias,
        adjustmentStyle,
        trace,
    );
    return { connection, trace };
}

function countConnectedComponents(
    nodes: Connectable[],
    connections: MapConnection[],
): number {
    if (nodes.length === 0) return 0;
    const adj = new Map<string, string[]>();
    for (const node of nodes) adj.set(node.id, []);
    for (const connection of connections) {
        adj.get(connection.sourceId)?.push(connection.targetId);
        adj.get(connection.targetId)?.push(connection.sourceId);
    }
    let components = 0;
    const seen = new Set<string>();
    for (const node of nodes) {
        if (seen.has(node.id)) continue;
        components++;
        const stack = [node.id];
        seen.add(node.id);
        while (stack.length > 0) {
            const current = stack.pop()!;
            for (const next of adj.get(current) ?? []) {
                if (seen.has(next)) continue;
                seen.add(next);
                stack.push(next);
            }
        }
    }
    return components;
}

function buildComponentIndex(
    nodes: Connectable[],
    connections: MapConnection[],
): Map<string, number> {
    const adj = new Map<string, string[]>();
    for (const node of nodes) adj.set(node.id, []);
    for (const connection of connections) {
        adj.get(connection.sourceId)?.push(connection.targetId);
        adj.get(connection.targetId)?.push(connection.sourceId);
    }

    const componentIndex = new Map<string, number>();
    let componentId = 0;
    for (const node of nodes) {
        if (componentIndex.has(node.id)) continue;
        const stack = [node.id];
        componentIndex.set(node.id, componentId);
        while (stack.length > 0) {
            const current = stack.pop()!;
            for (const next of adj.get(current) ?? []) {
                if (componentIndex.has(next)) continue;
                componentIndex.set(next, componentId);
                stack.push(next);
            }
        }
        componentId += 1;
    }
    return componentIndex;
}

function buildFallbackBridgeCandidates(
    nodes: Connectable[],
    componentIndex: Map<string, number>,
    acceptedKeys: Set<string>,
): MapConnection[] {
    const out: MapConnection[] = [];
    for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j]!;
            const key = a.id <= b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
            if (acceptedKeys.has(key)) continue;
            const aComponent = componentIndex.get(a.id);
            const bComponent = componentIndex.get(b.id);
            if (aComponent === undefined || bComponent === undefined || aComponent === bComponent) continue;
            out.push({
                sourceId: a.id,
                targetId: b.id,
                distance: hypot(b.x - a.x, b.y - a.y),
            });
        }
    }
    out.sort((left, right) => left.distance - right.distance);
    return out;
}

function buildConnectivityOverrideCandidates(
    nodes: Connectable[],
    componentIndex: Map<string, number>,
    acceptedKeys: Set<string>,
): Array<MapConnection & { chordMinClearancePx: number }> {
    const out: Array<MapConnection & { chordMinClearancePx: number }> = [];
    for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j]!;
            const key = a.id <= b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
            if (acceptedKeys.has(key)) continue;
            const aComponent = componentIndex.get(a.id);
            const bComponent = componentIndex.get(b.id);
            if (aComponent === undefined || bComponent === undefined || aComponent === bComponent) continue;
            const obstacles = nodes
                .filter((node) => node.id !== a.id && node.id !== b.id)
                .map((node) => ({ x: node.x, y: node.y }));
            out.push({
                sourceId: a.id,
                targetId: b.id,
                distance: hypot(b.x - a.x, b.y - a.y),
                chordMinClearancePx: nearestObstacleDistanceToChord(a.x, a.y, b.x, b.y, obstacles),
            });
        }
    }
    out.sort((left, right) => {
        if (right.chordMinClearancePx !== left.chordMinClearancePx) {
            return right.chordMinClearancePx - left.chordMinClearancePx;
        }
        return left.distance - right.distance;
    });
    return out;
}

function buildConnectivityOverrideConnection(
    a: Connectable,
    b: Connectable,
): MapConnection {
    return {
        sourceId: a.id,
        targetId: b.id,
        distance: hypot(b.x - a.x, b.y - a.y),
        laneWaypoints: [[a.x, a.y], [b.x, b.y]],
        lanePathKind: 'straight',
    };
}

export function buildLaneAwareConnections<T extends Connectable>(
    nodes: T[],
    preferredConnections: MapConnection[],
    candidateConnections: MapConnection[],
    mode: MapLaneMode,
    laneObstacleClearancePx: number,
    remapBias: number = 1,
    adjustmentStyle: LaneAdjustmentStyle = 'curved',
): MapConnection[] {
    const pos = new Map(nodes.map((n) => [n.id, n]));
    const starCenters = nodes.map((n) => ({ x: n.x, y: n.y }));
    const accepted: MapConnection[] = [];
    const placed: Seg[] = [];
    const acceptedKeys = new Set<string>();
    const keyOf = (sourceId: string, targetId: string) =>
        sourceId <= targetId ? `${sourceId}|${targetId}` : `${targetId}|${sourceId}`;

    const preferredSorted = preferredConnections
        .slice()
        .sort((left, right) => left.distance - right.distance);
    const preferredKeys = new Set(preferredSorted.map((connection) => keyOf(connection.sourceId, connection.targetId)));
    const candidateSorted = candidateConnections
        .filter((connection) => !preferredKeys.has(keyOf(connection.sourceId, connection.targetId)))
        .slice()
        .sort((left, right) => left.distance - right.distance);

    const acceptResolved = (connection: MapConnection, a: Connectable, b: Connectable) => {
        accepted.push(connection);
        acceptedKeys.add(keyOf(connection.sourceId, connection.targetId));
        placed.push(...polylineToSegments(connection.laneWaypoints ?? [[a.x, a.y], [b.x, b.y]]));
    };

    const tryAccept = (connection: MapConnection): boolean => {
        const key = keyOf(connection.sourceId, connection.targetId);
        if (acceptedKeys.has(key)) return false;
        const a = pos.get(connection.sourceId);
        const b = pos.get(connection.targetId);
        if (!a || !b) return false;
        const resolved = tryResolveLaneConnection(
            a,
            b,
            nodes,
            placed,
            starCenters,
            mode,
            laneObstacleClearancePx,
            remapBias,
            adjustmentStyle,
        );
        if (!resolved) return false;
        acceptResolved(resolved, a, b);
        return true;
    };

    for (const connection of preferredSorted) {
        tryAccept(connection);
    }

    if (countConnectedComponents(nodes, accepted) > 1) {
        let progressed = true;
        while (countConnectedComponents(nodes, accepted) > 1 && progressed) {
            progressed = false;
            const componentIndex = buildComponentIndex(nodes, accepted);
            for (const connection of candidateSorted) {
                if (countConnectedComponents(nodes, accepted) <= 1) break;
                const aComponent = componentIndex.get(connection.sourceId);
                const bComponent = componentIndex.get(connection.targetId);
                if (aComponent === undefined || bComponent === undefined || aComponent === bComponent) continue;
                if (tryAccept(connection)) {
                    progressed = true;
                }
            }
            if (progressed) continue;
            const fallbackCandidates = buildFallbackBridgeCandidates(
                nodes,
                componentIndex,
                acceptedKeys,
            );
            for (const connection of fallbackCandidates) {
                if (countConnectedComponents(nodes, accepted) <= 1) break;
                if (tryAccept(connection)) {
                    progressed = true;
                    break;
                }
            }
            if (progressed) continue;
            const overrideCandidates = buildConnectivityOverrideCandidates(
                nodes,
                componentIndex,
                acceptedKeys,
            );
            for (const connection of overrideCandidates) {
                if (countConnectedComponents(nodes, accepted) <= 1) break;
                const a = pos.get(connection.sourceId);
                const b = pos.get(connection.targetId);
                if (!a || !b) continue;
                acceptResolved(buildConnectivityOverrideConnection(a, b), a, b);
                progressed = true;
                break;
            }
        }
    }

    return accepted;
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
            const resolved = solveAdaptiveWaypoints(
                a.x,
                a.y,
                b.x,
                b.y,
                obstacles,
                clearance,
                placed,
                starCenters,
                'curved',
                true,
            );
            if (!resolved || resolved.waypoints.length < 2) continue;
            wp = resolved.waypoints;
            pathKind = resolved.kind;
        }
        c.laneWaypoints = wp;
        c.lanePathKind = pathKind;
        placed.push(...polylineToSegments(wp));
    }
}
