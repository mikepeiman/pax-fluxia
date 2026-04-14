// ============================================================================
// Lane polylines — centerlines between star centers (mapgen + runtime).
//
// Hierarchy:
// 1. Full traversal connectivity wins globally.
// 2. If a straight line satisfies lane margin, keep it straight.
// 3. If a straight line violates lane margin:
//    - reshape enabled: try adjusted lane geometry that satisfies the same clearance
//    - reshape disabled: reject that specific lane
// 4. If the strict feasible graph is disconnected, connectivity is restored explicitly
//    at the graph layer, not by silently mutating renderer-only geometry.
//
// Solver shape:
// - derive the nearest blocking star-to-lane measurement
// - insert a vertex on that exact shortest path
// - push the vertex to the requested lane margin and no farther
// - repeat deterministically for remaining blockers when needed
// ============================================================================

import type {
    Connectable,
    LaneAdjustmentStyle,
    LaneConstraintStatus,
    LanePathKind,
    MapConnection,
} from './types';
import { pointToSegmentDistance } from './connections';

export type MapLaneMode = 'straight' | 'curved';
export type LaneBuildMode = 'preserve_authored' | 'recompute_connectivity';
export interface LaneBuildPerfStats {
    preferredSolveMs: number;
    candidateBridgeMs: number;
    fallbackBridgeMs: number;
    connectivityRestoreMs: number;
    edgeSolveMs: number;
    edgeSolveCount: number;
    edgeCacheHits: number;
}
export interface BuildLaneAwareOptions {
    buildMode?: LaneBuildMode;
    debugPerf?: LaneBuildPerfStats | null;
}

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
const CLEARANCE_EPSILON_PX = 0.1;
const ENDPOINT_RESHAPE_GUARD_T = 0.14;
const ENDPOINT_CLEARANCE_GUARD_PX = 72;
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
type SegmentGuardRange = { minT: number; maxT: number };

function nearestPointOnSegmentClampedSquared(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    minT: number,
    maxT: number,
): { x: number; y: number; distanceSq: number; t: number } {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq <= 1e-9) {
        const deltaX = px - ax;
        const deltaY = py - ay;
        return { x: ax, y: ay, distanceSq: deltaX * deltaX + deltaY * deltaY, t: 0 };
    }
    const rawT = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    const t = Math.max(minT, Math.min(maxT, rawT));
    const x = ax + dx * t;
    const y = ay + dy * t;
    const deltaX = px - x;
    const deltaY = py - y;
    return { x, y, distanceSq: deltaX * deltaX + deltaY * deltaY, t };
}

function nearestPointOnSegmentClamped(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
    minT: number,
    maxT: number,
): { x: number; y: number; distance: number; t: number } {
    const nearest = nearestPointOnSegmentClampedSquared(px, py, ax, ay, bx, by, minT, maxT);
    return { x: nearest.x, y: nearest.y, distance: Math.sqrt(nearest.distanceSq), t: nearest.t };
}

function segmentEndpointGuardRange(
    segmentIndex: number,
    segmentCount: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
): { minT: number; maxT: number } {
    const segLen = hypot(bx - ax, by - ay);
    if (segLen <= 1e-9) return { minT: 0, maxT: 1 };
    const guardT = Math.min(0.49, ENDPOINT_CLEARANCE_GUARD_PX / segLen);
    let minT = 0;
    let maxT = 1;
    if (segmentIndex === 0) minT = guardT;
    if (segmentIndex === segmentCount - 1) maxT = 1 - guardT;
    if (minT > maxT) {
        minT = 0.5;
        maxT = 0.5;
    }
    return { minT, maxT };
}

function buildSegmentGuardRanges(
    pts: Array<[number, number]>,
): SegmentGuardRange[] {
    const segmentCount = Math.max(0, pts.length - 1);
    const out: SegmentGuardRange[] = [];
    for (let i = 0; i < segmentCount; i++) {
        const [ax, ay] = pts[i]!;
        const [bx, by] = pts[i + 1]!;
        out.push(segmentEndpointGuardRange(i, segmentCount, ax, ay, bx, by));
    }
    return out;
}

function chordClearOfObstacles(
    ax: number, ay: number,
    bx: number, by: number,
    obstacles: Array<{ x: number; y: number }>,
    minDist: number,
): boolean {
    const { minT, maxT } = segmentEndpointGuardRange(0, 1, ax, ay, bx, by);
    const thresholdPx = Math.max(0, minDist - CLEARANCE_EPSILON_PX);
    const minDistSq = thresholdPx * thresholdPx;
    for (const o of obstacles) {
        if (
            nearestPointOnSegmentClampedSquared(o.x, o.y, ax, ay, bx, by, minT, maxT).distanceSq
            < minDistSq
        ) {
            return false;
        }
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
    let nearestSq = Infinity;
    const { minT, maxT } = segmentEndpointGuardRange(0, 1, ax, ay, bx, by);
    for (const obstacle of obstacles) {
        const dSq = nearestPointOnSegmentClampedSquared(
            obstacle.x,
            obstacle.y,
            ax,
            ay,
            bx,
            by,
            minT,
            maxT,
        ).distanceSq;
        if (dSq < nearestSq) nearestSq = dSq;
    }
    return Math.sqrt(nearestSq);
}

function minimumObstacleDistanceToPolyline(
    pts: Array<[number, number]>,
    obstacles: Array<{ x: number; y: number }>,
): number {
    if (obstacles.length === 0) return Number.POSITIVE_INFINITY;
    let nearestSq = Number.POSITIVE_INFINITY;
    const guardRanges = buildSegmentGuardRanges(pts);
    for (const obstacle of obstacles) {
        for (let i = 0; i < pts.length - 1; i++) {
            const [ax, ay] = pts[i]!;
            const [bx, by] = pts[i + 1]!;
            const { minT, maxT } = guardRanges[i]!;
            const dSq = nearestPointOnSegmentClampedSquared(
                obstacle.x,
                obstacle.y,
                ax,
                ay,
                bx,
                by,
                minT,
                maxT,
            ).distanceSq;
            if (dSq < nearestSq) nearestSq = dSq;
        }
    }
    return Math.sqrt(nearestSq);
}

/** Dense-enough sample along polyline segments vs obstacles. */
function polylineClearOfObstacles(
    pts: Array<[number, number]>,
    obstacles: Array<{ x: number; y: number }>,
    minDist: number,
): boolean {
    const guardRanges = buildSegmentGuardRanges(pts);
    const thresholdPx = Math.max(0, minDist - CLEARANCE_EPSILON_PX);
    const minDistSq = thresholdPx * thresholdPx;
    for (let i = 0; i < pts.length - 1; i++) {
        const x1 = pts[i][0], y1 = pts[i][1];
        const x2 = pts[i + 1][0], y2 = pts[i + 1][1];
        const { minT, maxT } = guardRanges[i]!;
        for (const o of obstacles) {
            if (
                nearestPointOnSegmentClampedSquared(o.x, o.y, x1, y1, x2, y2, minT, maxT).distanceSq
                < minDistSq
            ) {
                return false;
            }
        }
        for (let s = 1; s < 8; s++) {
            const t = minT + (maxT - minT) * (s / 8);
            const px = x1 + (x2 - x1) * t;
            const py = y1 + (y2 - y1) * t;
            for (const o of obstacles) {
                const dx = px - o.x;
                const dy = py - o.y;
                if (dx * dx + dy * dy < minDistSq) return false;
            }
        }
    }
    return true;
}

type Seg = { ax: number; ay: number; bx: number; by: number };
type ObstacleWitness = {
    obstacle: { x: number; y: number };
    pointX: number;
    pointY: number;
    distance: number;
    segmentIndex: number;
    t: number;
};

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
    const starTouchSq = STAR_TOUCH_PX * STAR_TOUCH_PX;
    for (const s of stars) {
        const dx = px - s.x;
        const dy = py - s.y;
        if (dx * dx + dy * dy < starTouchSq) return true;
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

function nearestPointOnSegment(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
): { x: number; y: number; distance: number; t: number } {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq <= 1e-9) {
        return { x: ax, y: ay, distance: hypot(px - ax, py - ay), t: 0 };
    }
    const rawT = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    const t = Math.max(0, Math.min(1, rawT));
    const x = ax + dx * t;
    const y = ay + dy * t;
    return { x, y, distance: hypot(px - x, py - y), t };
}

function nearestObstacleWitnessToPolyline(
    pts: Array<[number, number]>,
    obstacles: Array<{ x: number; y: number }>,
): ObstacleWitness | null {
    let bestWitness: ObstacleWitness | null = null;
    let bestDistanceSq = Number.POSITIVE_INFINITY;
    const guardRanges = buildSegmentGuardRanges(pts);
    for (const obstacle of obstacles) {
        for (let i = 0; i < pts.length - 1; i++) {
            const [ax, ay] = pts[i]!;
            const [bx, by] = pts[i + 1]!;
            const { minT, maxT } = guardRanges[i]!;
            const nearest = nearestPointOnSegmentClampedSquared(
                obstacle.x,
                obstacle.y,
                ax,
                ay,
                bx,
                by,
                minT,
                maxT,
            );
            if (nearest.distanceSq < bestDistanceSq) {
                bestDistanceSq = nearest.distanceSq;
                bestWitness = {
                    obstacle,
                    pointX: nearest.x,
                    pointY: nearest.y,
                    distance: Math.sqrt(nearest.distanceSq),
                    segmentIndex: i,
                    t: nearest.t,
                };
            }
        }
    }
    return bestWitness;
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

function trySingleKinkDetour(
    ax: number, ay: number,
    bx: number, by: number,
    obstacles: Array<{ x: number; y: number }>,
    minDist: number,
    placed: Seg[],
    starCenters: Array<{ x: number; y: number }>,
    maxIterations: number,
): Array<[number, number]> | null {
    let current: Array<[number, number]> = [[ax, ay], [bx, by]];
    for (let iteration = 0; iteration < maxIterations; iteration++) {
        const blockingMeasurement = nearestObstacleWitnessToPolyline(current, obstacles);
        if (!blockingMeasurement || blockingMeasurement.distance >= minDist - CLEARANCE_EPSILON_PX) {
            if (polylineCrossesPlaced(current, placed, starCenters)) return null;
            return current;
        }
        const [segA, segB] = [
            current[blockingMeasurement.segmentIndex]!,
            current[blockingMeasurement.segmentIndex + 1]!,
        ];
        const segDx = segB[0] - segA[0];
        const segDy = segB[1] - segA[1];
        const segLen = hypot(segDx, segDy) || 1;
        // When the nearest point lands at or near a segment endpoint, inserting a
        // vertex at that exact point creates a degenerate duplicate and the solver
        // makes no progress. In that case, move to the first interior point on the
        // segment that can actually change the outgoing angle.
        let anchorT = blockingMeasurement.t;
        if (anchorT <= ENDPOINT_RESHAPE_GUARD_T) {
            anchorT = ENDPOINT_RESHAPE_GUARD_T;
        } else if (anchorT >= 1 - ENDPOINT_RESHAPE_GUARD_T) {
            anchorT = 1 - ENDPOINT_RESHAPE_GUARD_T;
        }
        const anchorX = segA[0] + segDx * anchorT;
        const anchorY = segA[1] + segDy * anchorT;

        let pushDx = anchorX - blockingMeasurement.obstacle.x;
        let pushDy = anchorY - blockingMeasurement.obstacle.y;
        let pushLen = hypot(pushDx, pushDy);
        if (pushLen <= 1e-6) {
            pushDx = -segDy / segLen;
            pushDy = segDx / segLen;
            pushLen = 1;
        }
        const anchorDistance = hypot(pushDx, pushDy);
        const delta = Math.max(0, minDist - anchorDistance);
        const vertex: [number, number] = [
            anchorX + (pushDx / pushLen) * delta,
            anchorY + (pushDy / pushLen) * delta,
        ];
        const next: Array<[number, number]> = [];
        for (let i = 0; i < current.length - 1; i++) {
            next.push(current[i]!);
            if (i === blockingMeasurement.segmentIndex) next.push(vertex);
        }
        next.push(current[current.length - 1]!);
        current = next;
    }
    if (!polylineClearOfObstacles(current, obstacles, minDist)) return null;
    if (polylineCrossesPlaced(current, placed, starCenters)) return null;
    return current;
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

export function effectiveLaneClearanceForChord(
    chordPx: number,
    configuredClearancePx: number,
): number {
    void chordPx;
    return Math.max(0, configuredClearancePx);
}

function reshapeAttemptBudget(reshapeBias: number, obstacleCount: number): number {
    if (reshapeBias <= 0) return 0;
    const maxUsefulIterations = Math.max(12, Math.min(64, obstacleCount * 2 + 8));
    return Math.max(12, Math.round(12 + reshapeBias * (maxUsefulIterations - 12)));
}

type LaneSolveResult = {
    waypoints: Array<[number, number]>;
    kind: LanePathKind;
    constraintStatus: LaneConstraintStatus;
};

type EdgeSolvePrecomputed = {
    obstacles: Array<{ x: number; y: number }>;
    chordMinClearancePx: number;
    distance: number;
};

type LaneEdgeCacheEntry = EdgeSolvePrecomputed & {
    key: string;
    a: Connectable;
    b: Connectable;
    resolved?: MapConnection | null;
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
    reshapeBias: number,
    trace?: LaneDecisionTrace,
): LaneSolveResult | null {
    const maxIterations = reshapeAttemptBudget(reshapeBias, obstacles.length);
    if (adjustmentStyle === 'angular') {
        const kink = trySingleKinkDetour(
            ax,
            ay,
            bx,
            by,
            obstacles,
            clearancePx,
            placed,
            starCenters,
            maxIterations,
        );
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
        return {
            waypoints: kink,
            kind: 'angular',
            constraintStatus: 'reshaped_ok_angular',
        };
    }

    const kink = trySingleKinkDetour(
        ax,
        ay,
        bx,
        by,
        obstacles,
        clearancePx,
        placed,
        starCenters,
        maxIterations,
    );
    if (kink) {
        const roundedCandidates = [0.3, 0.22, 0.16, 0.12, 0.08, 0.05, 0.035, 0.025, 0.015]
            .map((fraction) => roundPolylineWithQuadraticCorners(kink, fraction));
        const curvedCandidates = kink.length === 3
            ? [
                ...roundedCandidates,
                buildQuadraticWaypointsViaControl(ax, ay, kink[1]![0], kink[1]![1], bx, by),
            ]
            : roundedCandidates;
        for (const curved of curvedCandidates) {
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
                    reason: 'accepted_via_deterministic_vertex',
                });
                return {
                    waypoints: curved,
                    kind: 'curved',
                    constraintStatus: 'reshaped_ok_curved',
                };
            }
            trace?.attempts.push({
                candidateKind: 'curved',
                minimumClearancePx,
                requiredClearancePx: clearancePx,
                waypointCount: curved.length,
                accepted: false,
                reason: 'deterministic_vertex_curve_failed',
            });
        }
        trace?.attempts.push({
            candidateKind: 'angular',
            minimumClearancePx: minimumObstacleDistanceToPolyline(kink, obstacles),
            requiredClearancePx: clearancePx,
            waypointCount: kink.length,
            accepted: true,
            reason: 'curve_conversion_failed_kept_angular',
        });
        return {
            waypoints: kink,
            kind: 'angular',
            constraintStatus: 'reshaped_ok_angular',
        };
    } else {
        trace?.attempts.push({
            candidateKind: 'curved',
            minimumClearancePx: 0,
            requiredClearancePx: clearancePx,
            waypointCount: 0,
            accepted: false,
            reason: 'no_valid_deterministic_vertex',
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
    allowReshape: boolean,
    reshapeBias: number,
    trace?: LaneDecisionTrace,
    precomputedChordMinClearancePx?: number,
): LaneSolveResult | null {
    const chord = hypot(bx - ax, by - ay);
    const effectiveClearancePx = effectiveLaneClearanceForChord(chord, clearancePx);
    const straight: Array<[number, number]> = [[ax, ay], [bx, by]];
    const chordMinClearancePx =
        precomputedChordMinClearancePx
        ?? nearestObstacleDistanceToChord(ax, ay, bx, by, obstacles);
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
        return {
            waypoints: straight,
            kind: 'straight',
            constraintStatus: 'straight_ok',
        };
    }

    if (!allowReshape) {
        if (trace) {
            trace.finalPathKind = 'missing';
            trace.finalMinClearancePx = chordMinClearancePx;
            trace.finalPassesRequested = chordMinClearancePx >= clearancePx;
            trace.finalReason = 'blocked_and_reshape_disabled';
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
        reshapeBias,
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
        1,
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
    reshapeBias: number,
    adjustmentStyle: LaneAdjustmentStyle,
    trace?: LaneDecisionTrace,
    precomputed?: EdgeSolvePrecomputed,
): MapConnection | null {
    const obstacles =
        precomputed?.obstacles
        ?? nodes
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
            reshapeBias > 0,
            reshapeBias,
            trace,
            precomputed?.chordMinClearancePx,
        );
        if (!resolved || resolved.waypoints.length < 2) return null;
        laneWaypoints = resolved.waypoints;
        lanePathKind = resolved.kind;
        return {
            sourceId: a.id,
            targetId: b.id,
            distance: precomputed?.distance ?? hypot(b.x - a.x, b.y - a.y),
            laneWaypoints,
            lanePathKind,
            laneConstraintStatus: resolved.constraintStatus,
        };
    }

    return {
        sourceId: a.id,
        targetId: b.id,
        distance: precomputed?.distance ?? hypot(b.x - a.x, b.y - a.y),
        laneWaypoints,
        lanePathKind,
        laneConstraintStatus: 'straight_ok',
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
    reshapeBias: number,
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
        reshapeBias,
        adjustmentStyle,
        trace,
        undefined,
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

function normalizeVector(dx: number, dy: number): [number, number] {
    const len = hypot(dx, dy) || 1;
    return [dx / len, dy / len];
}

function sampleQuadraticSegment(
    ax: number,
    ay: number,
    cx: number,
    cy: number,
    bx: number,
    by: number,
    steps: number = 8,
): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        out.push(quadBezierPoint(ax, ay, cx, cy, bx, by, t));
    }
    return out;
}

function roundPolylineWithQuadraticCorners(
    pts: Array<[number, number]>,
    fraction: number,
): Array<[number, number]> {
    if (pts.length < 3) return pts.slice();
    const out: Array<[number, number]> = [pts[0]!];
    let carryStart = pts[0]!;
    for (let i = 1; i < pts.length - 1; i++) {
        const prev = pts[i - 1]!;
        const curr = pts[i]!;
        const next = pts[i + 1]!;
        const [prevNx, prevNy] = normalizeVector(prev[0] - curr[0], prev[1] - curr[1]);
        const [nextNx, nextNy] = normalizeVector(next[0] - curr[0], next[1] - curr[1]);
        const prevLen = hypot(prev[0] - curr[0], prev[1] - curr[1]);
        const nextLen = hypot(next[0] - curr[0], next[1] - curr[1]);
        const prevTrim = Math.min(prevLen * fraction, prevLen * 0.5);
        const nextTrim = Math.min(nextLen * fraction, nextLen * 0.5);
        const inPoint: [number, number] = [curr[0] + prevNx * prevTrim, curr[1] + prevNy * prevTrim];
        const outPoint: [number, number] = [curr[0] + nextNx * nextTrim, curr[1] + nextNy * nextTrim];

        if (hypot(inPoint[0] - carryStart[0], inPoint[1] - carryStart[1]) > 1e-6) {
            out.push(inPoint);
        }
        const curve = sampleQuadraticSegment(inPoint[0], inPoint[1], curr[0], curr[1], outPoint[0], outPoint[1]);
        out.push(...curve.slice(1));
        carryStart = outPoint;
    }
    const last = pts[pts.length - 1]!;
    if (hypot(last[0] - out[out.length - 1]![0], last[1] - out[out.length - 1]![1]) > 1e-6) {
        out.push(last);
    }
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

function buildConnectivityRestoreConnection(
    a: Connectable,
    b: Connectable,
): MapConnection {
    return {
        sourceId: a.id,
        targetId: b.id,
        distance: hypot(b.x - a.x, b.y - a.y),
        laneWaypoints: [[a.x, a.y], [b.x, b.y]],
        lanePathKind: 'straight',
        laneConstraintStatus: 'connectivity_restore',
    };
}

function buildConstraintUnsatisfiedAuthoredConnection(
    a: Connectable,
    b: Connectable,
): MapConnection {
    return {
        sourceId: a.id,
        targetId: b.id,
        distance: hypot(b.x - a.x, b.y - a.y),
        laneWaypoints: [[a.x, a.y], [b.x, b.y]],
        lanePathKind: 'straight',
        laneConstraintStatus: 'constraint_unsatisfied_authored',
    };
}

function nowMs(): number {
    return globalThis.performance?.now?.() ?? Date.now();
}

function createLaneBuildPerfStats(): LaneBuildPerfStats {
    return {
        preferredSolveMs: 0,
        candidateBridgeMs: 0,
        fallbackBridgeMs: 0,
        connectivityRestoreMs: 0,
        edgeSolveMs: 0,
        edgeSolveCount: 0,
        edgeCacheHits: 0,
    };
}

class UnionFind {
    private readonly parent = new Map<string, string>();
    private readonly rank = new Map<string, number>();
    componentCount: number;

    constructor(ids: string[]) {
        this.componentCount = ids.length;
        for (const id of ids) {
            this.parent.set(id, id);
            this.rank.set(id, 0);
        }
    }

    find(id: string): string {
        const current = this.parent.get(id);
        if (!current || current === id) return id;
        const root = this.find(current);
        this.parent.set(id, root);
        return root;
    }

    connected(left: string, right: string): boolean {
        return this.find(left) === this.find(right);
    }

    union(left: string, right: string): boolean {
        let leftRoot = this.find(left);
        let rightRoot = this.find(right);
        if (leftRoot === rightRoot) return false;

        const leftRank = this.rank.get(leftRoot) ?? 0;
        const rightRank = this.rank.get(rightRoot) ?? 0;
        if (leftRank < rightRank) {
            [leftRoot, rightRoot] = [rightRoot, leftRoot];
        }

        this.parent.set(rightRoot, leftRoot);
        if (leftRank === rightRank) {
            this.rank.set(leftRoot, leftRank + 1);
        }
        this.componentCount -= 1;
        return true;
    }
}

export function buildLaneAwareConnections<T extends Connectable>(
    nodes: T[],
    preferredConnections: MapConnection[],
    candidateConnections: MapConnection[],
    mode: MapLaneMode,
    laneObstacleClearancePx: number,
    reshapeBias: number = 1,
    adjustmentStyle: LaneAdjustmentStyle = 'curved',
    options: BuildLaneAwareOptions = {},
): MapConnection[] {
    const buildMode = options.buildMode ?? 'recompute_connectivity';
    const perf = options.debugPerf ?? null;
    if (perf) {
        Object.assign(perf, createLaneBuildPerfStats());
    }
    const starCenters = nodes.map((n) => ({ x: n.x, y: n.y }));
    const accepted: MapConnection[] = [];
    const placed: Seg[] = [];
    const acceptedKeys = new Set<string>();
    const dsu = new UnionFind(nodes.map((node) => node.id));
    const keyOf = (sourceId: string, targetId: string) =>
        sourceId <= targetId ? `${sourceId}|${targetId}` : `${targetId}|${sourceId}`;
    const emptyPlaced: Seg[] = [];

    const edgeCache = new Map<string, LaneEdgeCacheEntry>();
    const allEdges: LaneEdgeCacheEntry[] = [];
    for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]!;
        for (let j = i + 1; j < nodes.length; j++) {
            const b = nodes[j]!;
            const key = keyOf(a.id, b.id);
            const obstacles: Array<{ x: number; y: number }> = [];
            for (let k = 0; k < nodes.length; k++) {
                if (k === i || k === j) continue;
                const obstacle = nodes[k]!;
                obstacles.push({ x: obstacle.x, y: obstacle.y });
            }
            const distance = hypot(b.x - a.x, b.y - a.y);
            const entry: LaneEdgeCacheEntry = {
                key,
                a,
                b,
                obstacles,
                distance,
                chordMinClearancePx: nearestObstacleDistanceToChord(
                    a.x,
                    a.y,
                    b.x,
                    b.y,
                    obstacles,
                ),
            };
            edgeCache.set(key, entry);
            allEdges.push(entry);
        }
    }

    const preferredSorted = preferredConnections
        .map((connection) => edgeCache.get(keyOf(connection.sourceId, connection.targetId)))
        .filter((entry): entry is LaneEdgeCacheEntry => Boolean(entry))
        .sort((left, right) => left.distance - right.distance);
    const preferredKeys = new Set(preferredSorted.map((entry) => entry.key));
    const candidateKeys = new Set(
        candidateConnections.map((connection) => keyOf(connection.sourceId, connection.targetId)),
    );
    const candidateSorted = candidateConnections
        .map((connection) => edgeCache.get(keyOf(connection.sourceId, connection.targetId)))
        .filter(
            (entry): entry is LaneEdgeCacheEntry =>
                entry !== undefined && !preferredKeys.has(entry.key),
        )
        .sort((left, right) => {
            if (right.chordMinClearancePx !== left.chordMinClearancePx) {
                return right.chordMinClearancePx - left.chordMinClearancePx;
            }
            return left.distance - right.distance;
        });
    const fallbackSorted = allEdges
        .filter((entry) => !preferredKeys.has(entry.key) && !candidateKeys.has(entry.key))
        .sort((left, right) => {
            if (right.chordMinClearancePx !== left.chordMinClearancePx) {
                return right.chordMinClearancePx - left.chordMinClearancePx;
            }
            return left.distance - right.distance;
        });
    const overrideSorted = allEdges
        .slice()
        .sort((left, right) => {
            if (right.chordMinClearancePx !== left.chordMinClearancePx) {
                return right.chordMinClearancePx - left.chordMinClearancePx;
            }
            return left.distance - right.distance;
        });

    const acceptResolved = (connection: MapConnection, entry: LaneEdgeCacheEntry) => {
        accepted.push(connection);
        acceptedKeys.add(entry.key);
        dsu.union(connection.sourceId, connection.targetId);
        placed.push(
            ...polylineToSegments(connection.laneWaypoints ?? [[entry.a.x, entry.a.y], [entry.b.x, entry.b.y]]),
        );
    };

    const resolveEntry = (
        entry: LaneEdgeCacheEntry,
        trace?: LaneDecisionTrace,
    ): MapConnection | null => {
        if (entry.resolved !== undefined) {
            perf && (perf.edgeCacheHits += 1);
            return entry.resolved;
        }
        const startedAt = nowMs();
        const resolved = tryResolveLaneConnection(
            entry.a,
            entry.b,
            nodes,
            emptyPlaced,
            starCenters,
            mode,
            laneObstacleClearancePx,
            reshapeBias,
            adjustmentStyle,
            trace,
            entry,
        );
        perf && (perf.edgeSolveMs += nowMs() - startedAt);
        perf && (perf.edgeSolveCount += 1);
        entry.resolved = resolved;
        return resolved;
    };

    const tryAcceptEntry = (entry: LaneEdgeCacheEntry): boolean => {
        if (acceptedKeys.has(entry.key)) return false;
        const resolved = resolveEntry(entry);
        if (!resolved) return false;
        if (
            resolved.lanePathKind !== 'straight'
            && resolved.laneWaypoints
            && polylineCrossesPlaced(resolved.laneWaypoints, placed, starCenters)
        ) {
            return false;
        }
        acceptResolved(resolved, entry);
        return true;
    };

    const preferredStartedAt = nowMs();
    for (const entry of preferredSorted) {
        if (tryAcceptEntry(entry)) continue;
        if (buildMode !== 'preserve_authored') continue;
        acceptResolved(buildConstraintUnsatisfiedAuthoredConnection(entry.a, entry.b), entry);
    }
    perf && (perf.preferredSolveMs += nowMs() - preferredStartedAt);

    if (buildMode === 'preserve_authored') {
        return accepted;
    }

    const candidateStartedAt = nowMs();
    for (const entry of candidateSorted) {
        if (dsu.componentCount <= 1) break;
        if (acceptedKeys.has(entry.key) || dsu.connected(entry.a.id, entry.b.id)) continue;
        tryAcceptEntry(entry);
    }
    perf && (perf.candidateBridgeMs += nowMs() - candidateStartedAt);

    if (dsu.componentCount > 1) {
        const fallbackStartedAt = nowMs();
        for (const entry of fallbackSorted) {
            if (dsu.componentCount <= 1) break;
            if (acceptedKeys.has(entry.key) || dsu.connected(entry.a.id, entry.b.id)) continue;
            tryAcceptEntry(entry);
        }
        perf && (perf.fallbackBridgeMs += nowMs() - fallbackStartedAt);
    }

    if (dsu.componentCount > 1) {
        const restoreStartedAt = nowMs();
        for (const entry of overrideSorted) {
            if (dsu.componentCount <= 1) break;
            if (acceptedKeys.has(entry.key) || dsu.connected(entry.a.id, entry.b.id)) continue;
            acceptResolved(buildConnectivityRestoreConnection(entry.a, entry.b), entry);
        }
        perf && (perf.connectivityRestoreMs += nowMs() - restoreStartedAt);
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
                1,
            );
            if (!resolved || resolved.waypoints.length < 2) continue;
            wp = resolved.waypoints;
            pathKind = resolved.kind;
            c.laneConstraintStatus = resolved.constraintStatus;
        }
        c.laneWaypoints = wp;
        c.lanePathKind = pathKind;
        if (mode === 'straight') {
            c.laneConstraintStatus = 'straight_ok';
        }
        placed.push(...polylineToSegments(wp));
    }
}
