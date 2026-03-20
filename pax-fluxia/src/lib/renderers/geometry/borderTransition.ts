/**
 * borderTransition.ts
 *
 * Dual-mode border transition system for territory conquest animations.
 *
 * Mode 1: Pixi Graphics Path Morph — morph control points with elastic easing
 * Mode 2: Pixi MeshRope — PIXI.MeshRope with animated control points
 *
 * Both modes share matching + resampling + orientation-fixing logic.
 * Only the drawing differs.
 */

import * as PIXI from 'pixi.js';
import { log } from '$lib/utils/logger';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { SharedPolyline } from '$lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator';
import type { MergedTerritory } from '$lib/renderers/geometry/types';
import { resamplePolyline, polygonCentroid } from '$lib/territory/geometry/morphUtils';

// ── Easing Functions ────────────────────────────────────────────────────────

/** Standard ease-in-out cubic (smooth default). */
export function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Ease-in-out with overshoot (back easing). c1 controls overshoot amount. */
export function easeInOutBack(t: number, c1 = 1.70158): number {
    const c2 = c1 * 1.525;
    return t < 0.5
        ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
        : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
}

/** Ease-in-out elastic (bouncy rope feel). */
export function easeInOutElastic(t: number): number {
    const c5 = (2 * Math.PI) / 4.5;
    if (t === 0 || t === 1) return t;
    return t < 0.5
        ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
        : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1;
}

/** Ease-out cubic — decelerates, no overshoot. */
export function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

/** Ease-out quadratic — lighter deceleration, no overshoot. */
export function easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
}

/** Linear — constant speed, no easing (useful for debugging). */
export function easeLinear(t: number): number {
    return t;
}

/** Ease-in-out sine — gentle S-curve, no overshoot. */
export function easeInOutSine(t: number): number {
    return -(Math.cos(Math.PI * t) - 1) / 2;
}

// ── Matching Logic (shared by both modes) ───────────────────────────────────

export interface MatchedPair {
    fromPoints: [number, number][];
    toPoints: [number, number][];
    color: number;
    ownerPairKey: string;
    matchType: 'matched' | 'new' | 'removed';
}

/**
 * Match prev→target polylines by ownerPairKey + endpoint-aware scoring.
 * Returns matched pairs with resampled, orientation-fixed points.
 */
export function matchPolylines(
    prev: SharedPolyline[],
    target: SharedPolyline[],
    resampleN: number = 32,
): MatchedPair[] {
    const result: MatchedPair[] = [];

    // Group by ownerPairKey
    const prevByKey = new Map<string, SharedPolyline[]>();
    for (const p of prev) {
        if (!prevByKey.has(p.ownerPairKey)) prevByKey.set(p.ownerPairKey, []);
        prevByKey.get(p.ownerPairKey)!.push(p);
    }
    const targetByKey = new Map<string, SharedPolyline[]>();
    for (const p of target) {
        if (!targetByKey.has(p.ownerPairKey)) targetByKey.set(p.ownerPairKey, []);
        targetByKey.get(p.ownerPairKey)!.push(p);
    }

    const allKeys = new Set([...prevByKey.keys(), ...targetByKey.keys()]);

    let matchedCount = 0, newCount = 0, removedCount = 0;

    for (const key of allKeys) {
        const pLines = prevByKey.get(key) ?? [];
        const tLines = targetByKey.get(key) ?? [];
        const usedTargets = new Set<number>();

        // Match prev → target with endpoint-aware scoring
        for (const pLine of pLines) {
            const pPts = pLine.points;
            const pC = polygonCentroid(pPts);
            const pStart = pPts[0];
            const pEnd = pPts[pPts.length - 1];

            let bestScore = Infinity;
            let bestIdx = -1;

            for (let ti = 0; ti < tLines.length; ti++) {
                if (usedTargets.has(ti)) continue;
                const tPts = tLines[ti].points;
                const tC = polygonCentroid(tPts);
                const tStart = tPts[0];
                const tEnd = tPts[tPts.length - 1];

                // Centroid distance
                const centroidDist = Math.hypot(pC[0] - tC[0], pC[1] - tC[1]);

                // Endpoint distance (min of same-dir and reversed)
                const sameDir = Math.hypot(pStart[0] - tStart[0], pStart[1] - tStart[1])
                    + Math.hypot(pEnd[0] - tEnd[0], pEnd[1] - tEnd[1]);
                const reversed = Math.hypot(pStart[0] - tEnd[0], pStart[1] - tEnd[1])
                    + Math.hypot(pEnd[0] - tStart[0], pEnd[1] - tStart[1]);
                const endpointDist = Math.min(sameDir, reversed);

                // Combined score: weight both centroid and endpoint proximity
                const score = 0.5 * centroidDist + 0.5 * endpointDist;
                if (score < bestScore) { bestScore = score; bestIdx = ti; }
            }

            if (bestIdx >= 0) {
                usedTargets.add(bestIdx);
                const tLine = tLines[bestIdx];
                const fromSampled = resamplePolyline(pLine.points, resampleN);
                let toSampled = resamplePolyline(tLine.points, resampleN);

                // Fix orientation: reverse target if endpoints suggest opposite direction
                const p0 = fromSampled[0];
                const t0 = toSampled[0];
                const tN = toSampled[toSampled.length - 1];
                const distSameDir = Math.hypot(p0[0] - t0[0], p0[1] - t0[1]);
                const distReversed = Math.hypot(p0[0] - tN[0], p0[1] - tN[1]);
                if (distReversed < distSameDir) {
                    toSampled = toSampled.slice().reverse() as [number, number][];
                }

                result.push({
                    fromPoints: fromSampled,
                    toPoints: toSampled,
                    color: tLine.color ?? 0x888888,
                    ownerPairKey: key,
                    matchType: 'matched',
                });
                matchedCount++;
            } else {
                // Prev-only: "retract" into first endpoint
                const fromSampled = resamplePolyline(pLine.points, resampleN);
                const endpoint = pLine.points[0];
                const toCollapsed: [number, number][] = Array.from({ length: resampleN }, () => [endpoint[0], endpoint[1]]);

                result.push({
                    fromPoints: fromSampled,
                    toPoints: toCollapsed,
                    color: pLine.color ?? 0x888888,
                    ownerPairKey: key,
                    matchType: 'removed',
                });
                removedCount++;
            }
        }

        // Target-only: "unroll" from first endpoint
        for (let ti = 0; ti < tLines.length; ti++) {
            if (usedTargets.has(ti)) continue;
            const tLine = tLines[ti];
            const toSampled = resamplePolyline(tLine.points, resampleN);
            const endpoint = tLine.points[0];
            const fromCollapsed: [number, number][] = Array.from({ length: resampleN }, () => [endpoint[0], endpoint[1]]);

            result.push({
                fromPoints: fromCollapsed,
                toPoints: toSampled,
                color: tLine.color ?? 0x888888,
                ownerPairKey: key,
                matchType: 'new',
            });
            newCount++;
        }
    }

    log.renderer('borderTransition', `matchPolylines: ${matchedCount} matched, ${newCount} new (unroll), ${removedCount} removed (retract) | total=${result.length}`);
    return result;
}

// ── Mode 1: Pixi Graphics Path Morph ────────────────────────────────────────

/**
 * Morphs border polylines as Graphics paths with elastic easing.
 * `easing`: 'cubic'|'back'|'elastic' include overshoot; 'ease-out'|'ease-out-quad'|'sine'|'linear' do not.
 * Redraws the path every frame with interpolated control points.
 */
export class SegmentMorphTransitionHandler {
    private pairs: MatchedPair[];
    private easingFn: (t: number) => number;

    constructor(
        prev: SharedPolyline[],
        target: SharedPolyline[],
        easing: 'cubic' | 'back' | 'elastic' | 'ease-out' | 'ease-out-quad' | 'sine' | 'linear' = 'back',
        resampleN: number = 32,
        overshoot: number = 1.70158,
    ) {
        this.pairs = matchPolylines(prev, target, resampleN);
        this.easingFn = easing === 'elastic' ? easeInOutElastic
            : easing === 'back' ? (t: number) => easeInOutBack(t, overshoot)
                : easing === 'ease-out' ? easeOutCubic
                    : easing === 'ease-out-quad' ? easeOutQuad
                        : easing === 'sine' ? easeInOutSine
                            : easing === 'linear' ? easeLinear
                                : easeInOutCubic;

        log.renderer('SegmentMorphTransitionHandler', `created | pairs=${this.pairs.length} easing=${easing} resampleN=${resampleN} overshoot=${overshoot.toFixed(2)}`);
    }

    /**
     * Draw all morphed polylines onto the given Graphics object at time t (0→1).
     * Does NOT clear the graphics — caller should clear + draw fills first.
     */
    drawFrame(
        graphics: PIXI.Graphics,
        rawT: number,
        width: number,
        alpha: number,
    ): void {
        const t = this.easingFn(Math.max(0, Math.min(1, rawT)));
        let drawn = 0;

        for (const pair of this.pairs) {
            const { fromPoints, toPoints, color } = pair;
            const n = Math.min(fromPoints.length, toPoints.length);
            if (n < 2) continue;

            // Lerp each point
            const x0 = fromPoints[0][0] + (toPoints[0][0] - fromPoints[0][0]) * t;
            const y0 = fromPoints[0][1] + (toPoints[0][1] - fromPoints[0][1]) * t;
            graphics.moveTo(x0, y0);

            for (let i = 1; i < n; i++) {
                const x = fromPoints[i][0] + (toPoints[i][0] - fromPoints[i][0]) * t;
                const y = fromPoints[i][1] + (toPoints[i][1] - fromPoints[i][1]) * t;
                graphics.lineTo(x, y);
            }
            graphics.stroke({ width, color, alpha, cap: 'round', join: 'round' });
            drawn++;
        }

        log.renderer('SegmentMorphTransitionHandler', `drawFrame t=${rawT.toFixed(3)} eased=${t.toFixed(3)} | drew ${drawn}/${this.pairs.length} polylines | w=${width} a=${alpha.toFixed(2)}`);
    }

    /**
     * Return interpolated polylines as SharedPolyline[] at time t.
     * Single-source: fills derive from these same points via assembleFrontierLoops.
     */
    getInterpolatedPolylines(rawT: number): SharedPolyline[] {
        const t = this.easingFn(Math.max(0, Math.min(1, rawT)));
        const result: SharedPolyline[] = [];

        for (const pair of this.pairs) {
            const { fromPoints, toPoints, color, ownerPairKey } = pair;
            const n = Math.min(fromPoints.length, toPoints.length);
            if (n < 2) continue;

            const points: [number, number][] = new Array(n);
            for (let i = 0; i < n; i++) {
                points[i] = [
                    fromPoints[i][0] + (toPoints[i][0] - fromPoints[i][0]) * t,
                    fromPoints[i][1] + (toPoints[i][1] - fromPoints[i][1]) * t,
                ];
            }
            result.push({ points, ownerPairKey, color });
        }
        return result;
    }
}

// ── Mode 2: Pixi MeshRope ──────────────────────────────────────────────────

/**
 * Creates MeshRope instances per polyline and animates control points.
 * Provides a rope-like visual with constant-width bending texture.
 *
 * IMPORTANT: The parent voronoiContainer blanket-hides ALL children every frame.
 * You MUST call setVisible(true) each frame during the transition animation
 * after the blanket-hide, or the ropes will be invisible.
 */
export class RopeBorderRenderer {
    private pairs: MatchedPair[];
    private ropes: PIXI.MeshRope[] = [];
    private ropePoints: PIXI.Point[][] = [];
    private container: PIXI.Container | null = null;
    private easingFn: (t: number) => number;
    private ropeTexture: PIXI.Texture;

    constructor(
        prev: SharedPolyline[],
        target: SharedPolyline[],
        easing: 'cubic' | 'back' | 'elastic' | 'ease-out' | 'ease-out-quad' | 'sine' | 'linear' = 'back',
        resampleN: number = 32,
        ropeWidth: number = 3,
        overshoot: number = 1.70158,
    ) {
        this.pairs = matchPolylines(prev, target, resampleN);
        this.easingFn = easing === 'elastic' ? easeInOutElastic
            : easing === 'back' ? (t: number) => easeInOutBack(t, overshoot)
                : easing === 'ease-out' ? easeOutCubic
                    : easing === 'ease-out-quad' ? easeOutQuad
                        : easing === 'sine' ? easeInOutSine
                            : easing === 'linear' ? easeLinear
                                : easeInOutCubic;

        // Create a narrow white texture sized to the desired rope width
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = Math.max(2, Math.ceil(ropeWidth));
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.ropeTexture = PIXI.Texture.from(canvas);

        log.renderer('RopeBorderRenderer', `created | pairs=${this.pairs.length} easing=${easing} resampleN=${resampleN} ropeWidth=${ropeWidth} textureH=${canvas.height} overshoot=${overshoot.toFixed(2)}`);
    }

    /** Add all ropes to the given container (call once). */
    addTo(container: PIXI.Container): void {
        this.container = container;
        for (const pair of this.pairs) {
            const points = pair.fromPoints.map(([x, y]) => new PIXI.Point(x, y));
            this.ropePoints.push(points);

            const rope = new PIXI.MeshRope({
                texture: this.ropeTexture,
                points,
                textureScale: 1,
            });
            rope.tint = pair.color;
            this.ropes.push(rope);
            container.addChild(rope);
        }
        log.renderer('RopeBorderRenderer', `addTo: added ${this.ropes.length} ropes to container`);
    }

    /**
     * Re-show all ropes after the parent container's blanket-hide.
     * MUST be called every frame during animation.
     */
    setVisible(visible: boolean): void {
        for (const rope of this.ropes) {
            rope.visible = visible;
        }
    }

    /** Update all rope control points at time t (0→1). Call every frame. */
    update(rawT: number, alpha: number = 1.0): void {
        const t = this.easingFn(Math.max(0, Math.min(1, rawT)));

        for (let ri = 0; ri < this.pairs.length; ri++) {
            const pair = this.pairs[ri];
            const points = this.ropePoints[ri];
            if (!points) continue;

            const n = Math.min(pair.fromPoints.length, pair.toPoints.length);
            for (let i = 0; i < n && i < points.length; i++) {
                points[i].x = pair.fromPoints[i][0] + (pair.toPoints[i][0] - pair.fromPoints[i][0]) * t;
                points[i].y = pair.fromPoints[i][1] + (pair.toPoints[i][1] - pair.fromPoints[i][1]) * t;
            }

            if (this.ropes[ri]) {
                this.ropes[ri].alpha = alpha;
            }
        }

        log.renderer('RopeBorderRenderer', `update t=${rawT.toFixed(3)} eased=${t.toFixed(3)} | ${this.ropes.length} ropes`);
    }

    /** Remove all ropes from their container and clean up. */
    removeAll(): void {
        for (const rope of this.ropes) {
            if (rope.parent) rope.parent.removeChild(rope);
            rope.destroy();
        }
        this.ropes = [];
        this.ropePoints = [];
        this.ropeTexture.destroy(true);
        log.renderer('RopeBorderRenderer', 'removeAll: cleaned up all ropes + texture');
    }
}

// ── Mode 3: Fill Polygon Morpher (B-101 / D-79) ────────────────────────────

interface MatchedFillPair {
    fromPoints: [number, number][];
    toPoints: [number, number][];
    color: number;
    ownerId: string;
}

/**
 * Resample a CLOSED polygon to N equidistant points.
 * Closes the loop before resampling, then removes the duplicate last point.
 */
function resampleClosedPolygon(pts: [number, number][], n: number): [number, number][] {
    if (pts.length < 3) return pts;
    // Close the loop if not already closed
    const first = pts[0];
    const last = pts[pts.length - 1];
    const isClosed = Math.abs(first[0] - last[0]) < 0.01 && Math.abs(first[1] - last[1]) < 0.01;
    const closed = isClosed ? pts : [...pts, first];
    // Resample the closed loop as if it were a polyline
    const resampled = resamplePolyline(closed, n + 1);
    // Remove the duplicate closing point
    return resampled.slice(0, n);
}

/**
 * Align target polygon to minimize total displacement from source.
 * Tries ALL cyclic rotations of BOTH forward and reversed winding,
 * picking whichever combination gives the lowest sum-of-squared-distances.
 * This prevents the "horizontal flip" artifact when winding direction differs.
 * O(N²) but runs once at transition start, not per frame.
 */
function alignClosedPolygon(from: [number, number][], to: [number, number][]): [number, number][] {
    const n = Math.min(from.length, to.length);
    if (n < 3) return to;

    // Compute best rotation cost for a given candidate array
    function bestRotation(candidate: [number, number][]): { cost: number; offset: number } {
        let bestOffset = 0;
        let bestCost = Infinity;
        for (let k = 0; k < n; k++) {
            let cost = 0;
            for (let i = 0; i < n; i++) {
                const j = (i + k) % n;
                const dx = from[i][0] - candidate[j][0];
                const dy = from[i][1] - candidate[j][1];
                cost += dx * dx + dy * dy;
                if (cost >= bestCost) break; // early exit
            }
            if (cost < bestCost) {
                bestCost = cost;
                bestOffset = k;
            }
        }
        return { cost: bestCost, offset: bestOffset };
    }

    // Try forward winding
    const fwd = bestRotation(to);

    // Try reversed winding
    const reversed: [number, number][] = [...to].reverse();
    const rev = bestRotation(reversed);

    // Pick the better one
    const useFwd = fwd.cost <= rev.cost;
    const bestSource = useFwd ? to : reversed;
    const bestOffset = useFwd ? fwd.offset : rev.offset;

    if (bestOffset === 0 && useFwd) return to;

    const aligned: [number, number][] = new Array(n);
    for (let i = 0; i < n; i++) {
        aligned[i] = bestSource[(i + bestOffset) % n];
    }
    return aligned;
}

/**
 * Match prev→target MergedTerritory fill polygons.
 * Groups by ownerId, then matches regions within each owner by nearest centroid.
 * Handles multi-region owners (player has discontiguous territory pieces).
 * New regions morph from centroid, removed regions collapse to centroid.
 */

/**
 * Project a single point onto the nearest point on a closed polygon's perimeter.
 * Returns the [x, y] of the nearest point and its arc-length position along the perimeter.
 */
function projectPointOntoPerimeter(
    px: number, py: number,
    closed: [number, number][],
    edgeLengths: number[],
    edgeCumLen: number[],
): { x: number; y: number; arcLen: number } {
    const nEdges = closed.length - 1;
    let bestDistSq = Infinity;
    let bestX = px, bestY = py, bestArc = 0;

    for (let ei = 0; ei < nEdges; ei++) {
        const ax = closed[ei][0], ay = closed[ei][1];
        const bx = closed[ei + 1][0], by = closed[ei + 1][1];
        const abx = bx - ax, aby = by - ay;
        const lenSq = abx * abx + aby * aby;
        if (lenSq < 1e-10) continue;

        const apx = px - ax, apy = py - ay;
        const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / lenSq));
        const cx = ax + t * abx, cy = ay + t * aby;
        const dx = px - cx, dy = py - cy;
        const distSq = dx * dx + dy * dy;

        if (distSq < bestDistSq) {
            bestDistSq = distSq;
            bestX = cx;
            bestY = cy;
            // Arc-length = cumulative length to start of this edge + t * edge length
            bestArc = (ei > 0 ? edgeCumLen[ei - 1] : 0) + t * edgeLengths[ei];
        }
    }
    return { x: bestX, y: bestY, arcLen: bestArc };
}

/**
 * Sample a point at a given arc-length position along a closed polygon's perimeter.
 */
function sampleAtArcLength(
    arcLen: number,
    closed: [number, number][],
    edgeLengths: number[],
    edgeCumLen: number[],
    totalLen: number,
): [number, number] {
    // Wrap arc-length to [0, totalLen)
    let s = arcLen % totalLen;
    if (s < 0) s += totalLen;

    // Find which edge this arc-length falls on
    for (let ei = 0; ei < edgeLengths.length; ei++) {
        const edgeStart = ei > 0 ? edgeCumLen[ei - 1] : 0;
        const edgeEnd = edgeCumLen[ei];
        if (s <= edgeEnd + 1e-6) {
            const t = edgeLengths[ei] > 1e-10 ? (s - edgeStart) / edgeLengths[ei] : 0;
            const ax = closed[ei][0], ay = closed[ei][1];
            const bx = closed[ei + 1][0], by = closed[ei + 1][1];
            return [ax + t * (bx - ax), ay + t * (by - ay)];
        }
    }
    // Fallback: last vertex
    return [closed[closed.length - 1][0], closed[closed.length - 1][1]];
}

/**
 * Build morph targets using even-distribution algorithm:
 * 1. Project each `from` vertex onto `to` perimeter to compute displacement
 * 2. Classify: pinned (displacement < threshold) or morphing
 * 3. Pinned vertices: toPoints = fromPoints (they don't move)
 * 4. Morphing runs: distribute evenly along the `to` boundary section
 *    between the two adjacent pinned anchors, in original order
 */
function buildEvenDistributionTargets(
    from: [number, number][],
    target: [number, number][],
    pinThreshold: number,
): [number, number][] {
    const n = from.length;
    if (n < 3) return from.map(p => [p[0], p[1]] as [number, number]);

    // Close the target polygon
    const closed = [...target];
    const first = target[0], last = target[target.length - 1];
    if (Math.abs(first[0] - last[0]) > 0.01 || Math.abs(first[1] - last[1]) > 0.01) {
        closed.push(first);
    }
    const nEdges = closed.length - 1;

    // Pre-compute edge lengths and cumulative lengths
    const edgeLengths: number[] = new Array(nEdges);
    const edgeCumLen: number[] = new Array(nEdges);
    let totalLen = 0;
    for (let ei = 0; ei < nEdges; ei++) {
        const dx = closed[ei + 1][0] - closed[ei][0];
        const dy = closed[ei + 1][1] - closed[ei][1];
        edgeLengths[ei] = Math.sqrt(dx * dx + dy * dy);
        totalLen += edgeLengths[ei];
        edgeCumLen[ei] = totalLen;
    }

    // Step 1: Project each from vertex, compute displacement, classify
    const projections: { x: number; y: number; arcLen: number; dist: number }[] = new Array(n);
    const isPinned: boolean[] = new Array(n);

    for (let i = 0; i < n; i++) {
        const proj = projectPointOntoPerimeter(from[i][0], from[i][1], closed, edgeLengths, edgeCumLen);
        const dx = proj.x - from[i][0], dy = proj.y - from[i][1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        projections[i] = { ...proj, dist };
        isPinned[i] = dist < pinThreshold;
    }

    // Step 2: Build result — pinned vertices stay, morphing runs distribute evenly
    const result: [number, number][] = new Array(n);

    // Set pinned vertices immediately
    for (let i = 0; i < n; i++) {
        if (isPinned[i]) {
            result[i] = [from[i][0], from[i][1]]; // Pinned: don't move
        }
    }

    // Find morphing runs (contiguous sequences of non-pinned vertices)
    // Walk circularly to find run boundaries
    let i = 0;
    while (i < n) {
        if (isPinned[i]) { i++; continue; }

        // Found start of a morphing run — find its extent
        const runStart = i;
        let runEnd = i;
        while (runEnd < n && !isPinned[runEnd]) runEnd++;
        const runLen = runEnd - runStart;

        // Find the pinned anchors bounding this run
        // Left anchor: last pinned vertex before runStart (wrapping)
        const leftAnchorIdx = (runStart - 1 + n) % n;
        // Right anchor: first pinned vertex after runEnd-1 (wrapping)
        const rightAnchorIdx = runEnd % n;

        // Get arc-length positions of the anchors on `to`'s perimeter
        let arcStart: number, arcEnd: number;

        if (isPinned[leftAnchorIdx]) {
            arcStart = projections[leftAnchorIdx].arcLen;
        } else {
            // If no pinned anchor exists (all morphing), use from[0]'s projection
            arcStart = projections[runStart].arcLen;
        }

        if (isPinned[rightAnchorIdx]) {
            arcEnd = projections[rightAnchorIdx].arcLen;
        } else {
            // All morphing: distribute along entire perimeter
            arcEnd = arcStart + totalLen;
        }

        // Ensure arcEnd > arcStart (wrapping around if needed)
        if (arcEnd <= arcStart) arcEnd += totalLen;

        // Distribute morphing vertices evenly between anchors
        const divisions = runLen + 1; // +1 because anchors are boundaries
        const arcStep = (arcEnd - arcStart) / divisions;

        for (let j = 0; j < runLen; j++) {
            const s = arcStart + arcStep * (j + 1);
            result[runStart + j] = sampleAtArcLength(s, closed, edgeLengths, edgeCumLen, totalLen);
        }

        i = runEnd;
    }

    return result;
}

/**
 * Build morph pairs from prev→target territories using star-ID graph identity.
 *
 * KEY DESIGN: Matches across ALL owners, not within owner groups.
 * When a star changes owner (e.g. neutral→ai-2), the region appears under
 * different ownerIds in prev vs target. Star-ID overlap identifies them as
 * the same geographic region regardless of ownership change.
 *
 * Algorithm:
 *  1. Score every (prev, target) pair by starIds set intersection size
 *  2. Greedily match highest-overlap pairs first
 *  3. Apply even-distribution vertex morph within each matched pair
 *  4. Unmatched regions are SKIPPED (appear/disappear instantly)
 */
function buildMorphPairs(
    prev: MergedTerritory[],
    target: MergedTerritory[],
    resampleN: number,
): MatchedFillPair[] {
    const result: MatchedFillPair[] = [];
    const pinThresh = GAME_CONFIG.DEBUG_MORPH_PIN_THRESHOLD ?? 5;

    // Build overlap scores for all (prev, target) combinations
    type OverlapEntry = { pi: number; ti: number; overlap: number };
    const scores: OverlapEntry[] = [];

    for (let pi = 0; pi < prev.length; pi++) {
        const pStarSet = new Set(prev[pi].starIds);
        if (pStarSet.size === 0) continue; // no identity — skip
        for (let ti = 0; ti < target.length; ti++) {
            let overlap = 0;
            for (const sid of target[ti].starIds) {
                if (pStarSet.has(sid)) overlap++;
            }
            if (overlap > 0) {
                scores.push({ pi, ti, overlap });
            }
        }
    }

    // Sort by overlap descending — greedy best-match-first
    scores.sort((a, b) => b.overlap - a.overlap);

    const usedPrev = new Set<number>();
    const usedTarget = new Set<number>();

    // Match by best overlap
    for (const { pi, ti } of scores) {
        if (usedPrev.has(pi) || usedTarget.has(ti)) continue;
        usedPrev.add(pi);
        usedTarget.add(ti);

        const pT = prev[pi], tT = target[ti];
        const n = Math.max(resampleN, pT.points.length, tT.points.length);
        const fromPts = resampleClosedPolygon(pT.points, n);
        const toPts = buildEvenDistributionTargets(fromPts, tT.points, pinThresh);
        result.push({ fromPoints: fromPts, toPoints: toPts, color: tT.color, ownerId: tT.ownerId });
    }

    // Log unmatched regions (they appear/disappear instantly — no morph)
    const unmatchedPrev = prev.filter((_, i) => !usedPrev.has(i));
    const unmatchedTarget = target.filter((_, i) => !usedTarget.has(i));
    if (unmatchedPrev.length > 0 || unmatchedTarget.length > 0) {
        console.log(`[MORPH] Unmatched: ${unmatchedPrev.length} prev (${unmatchedPrev.map(t => `${t.ownerId}[${t.starIds.length}★]`).join(',')}) | ${unmatchedTarget.length} target (${unmatchedTarget.map(t => `${t.ownerId}[${t.starIds.length}★]`).join(',')})`);
    }

    return result;
}

/**
 * PolygonMorphTransitionHandler: unified territory transition renderer.
 *
 * Frontier = closed loop of x,y coordinates with ownership.
 * This morpher interpolates closed territory polygons per frame
 * and draws BOTH fill AND stroke from the same points.
 * Single geometry source. No fill/border divergence possible.
 */
export class PolygonMorphTransitionHandler {
    private pairs: MatchedFillPair[];
    private easingFn: (t: number) => number;
    /** Labels added directly as children of the graphics object. */
    private labels: PIXI.Text[] = [];
    private labelsAttachedTo: PIXI.Graphics | null = null;
    private static tickCounter = 0;

    constructor(
        prev: MergedTerritory[],
        target: MergedTerritory[],
        easing: 'cubic' | 'back' | 'elastic' | 'ease-out' | 'ease-out-quad' | 'sine' | 'linear' = 'ease-out',
        resampleN: number = 48,
        overshoot: number = 1.70158,
    ) {
        this.pairs = buildMorphPairs(prev, target, resampleN);
        this.easingFn = easing === 'elastic' ? easeInOutElastic
            : easing === 'back' ? (t: number) => easeInOutBack(t, overshoot)
                : easing === 'ease-out' ? easeOutCubic
                    : easing === 'ease-out-quad' ? easeOutQuad
                        : easing === 'sine' ? easeInOutSine
                            : easing === 'linear' ? easeLinear
                                : easeInOutCubic;

        PolygonMorphTransitionHandler.tickCounter++;
        const tick = PolygonMorphTransitionHandler.tickCounter;
        log.renderer('PolygonMorphTransitionHandler', `created | tick=${tick} pairs=${this.pairs.length} easing=${easing} resampleN=${resampleN}`);

        // ── Morph Trace Log ────────────────────────────────────────────
        if (GAME_CONFIG.DEBUG_MORPH_TRACE_LOG) {
            const pinThreshold = GAME_CONFIG.DEBUG_MORPH_PIN_THRESHOLD ?? 5;
            const verbose = (GAME_CONFIG as unknown as Record<string, unknown>).DEBUG_MORPH_TRACE_VERBOSE === true;
            console.log(`%c[MORPH TICK ${tick}] ${this.pairs.length} pairs`, 'background:#224;color:#8cf;font-weight:bold;padding:2px 6px;');
            for (let pi = 0; pi < this.pairs.length; pi++) {
                const pair = this.pairs[pi];
                const n = Math.min(pair.fromPoints.length, pair.toPoints.length);
                let pinned = 0, morph = 0, maxDist = 0, sumDist = 0;
                let morphStart = -1, morphEnd = -1;
                const verboseLines: string[] = [];
                for (let i = 0; i < n; i++) {
                    const dx = pair.toPoints[i][0] - pair.fromPoints[i][0];
                    const dy = pair.toPoints[i][1] - pair.fromPoints[i][1];
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const isPinned = dist < pinThreshold;
                    if (isPinned) { pinned++; } else {
                        morph++;
                        sumDist += dist;
                        if (dist > maxDist) maxDist = dist;
                        if (morphStart < 0) morphStart = i;
                        morphEnd = i;
                    }
                    if (verbose) {
                        verboseLines.push(`    v${i}: (${pair.fromPoints[i][0].toFixed(1)},${pair.fromPoints[i][1].toFixed(1)}) \u2192 (${pair.toPoints[i][0].toFixed(1)},${pair.toPoints[i][1].toFixed(1)}) dist=${dist.toFixed(1)}px ${isPinned ? '\u{1F7E2}PIN' : '\u{1F534}MORPH'}`);
                    }
                }
                const avgDist = morph > 0 ? (sumDist / morph) : 0;
                const rangeStr = morph > 0 ? ` range=[v${morphStart}..v${morphEnd}]` : '';
                const warnStr = morph === n ? ' \u26A0\uFE0FALL-MORPH' : '';
                console.log(`[MORPH] pair[${pi}] ${pair.ownerId} ${n}v: ${pinned}pin ${morph}morph (max=${maxDist.toFixed(0)}px avg=${avgDist.toFixed(0)}px)${rangeStr}${warnStr}`);
                if (verbose && verboseLines.length > 0) {
                    console.log(verboseLines.join('\n'));
                }
            }
        }
    }

    /**
     * Draw all morphed territory regions at time t (0→1).
     * Each polygon: lerp vertices, then fill AND stroke from the same points.
     */
    drawFrame(
        graphics: PIXI.Graphics,
        rawT: number,
        fillAlpha: number,
        borderWidth: number,
        borderAlpha: number,
    ): void {
        const t = this.easingFn(Math.max(0, Math.min(1, rawT)));
        let drawn = 0;
        const showVertices = GAME_CONFIG.DEBUG_MORPH_VERTICES;
        const vertexSize = GAME_CONFIG.DEBUG_MORPH_VERTEX_SIZE ?? 3;
        const pinThreshold = GAME_CONFIG.DEBUG_MORPH_PIN_THRESHOLD ?? 5;
        const vertexNth = GAME_CONFIG.DEBUG_MORPH_VERTEX_NTH ?? 10;

        // Track which label index we're at for pooling
        let labelIdx = 0;

        for (const pair of this.pairs) {
            const { fromPoints, toPoints, color } = pair;
            const n = Math.min(fromPoints.length, toPoints.length);
            if (n < 3) continue;

            // Build morphed polygon as flat array — SINGLE SOURCE for both fill and border
            // Vertices below pin threshold snap directly to target (no lerp jitter)
            const flat: number[] = new Array(n * 2);
            for (let i = 0; i < n; i++) {
                const dx = toPoints[i][0] - fromPoints[i][0];
                const dy = toPoints[i][1] - fromPoints[i][1];
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < pinThreshold) {
                    // Pin: snap to target immediately, no interpolation
                    flat[i * 2] = toPoints[i][0];
                    flat[i * 2 + 1] = toPoints[i][1];
                } else {
                    // Morph: lerp from→to
                    flat[i * 2] = fromPoints[i][0] + dx * t;
                    flat[i * 2 + 1] = fromPoints[i][1] + dy * t;
                }
            }

            // Fill the territory region
            graphics.poly(flat);
            graphics.fill({ color, alpha: fillAlpha });

            // Stroke the border — same exact points
            if (borderWidth > 0 && borderAlpha > 0) {
                graphics.poly(flat);
                graphics.stroke({ width: borderWidth, color, alpha: borderAlpha, cap: 'round', join: 'round' });
            }

            // ── Vertex Debug Overlay (dots + numbered labels) ──────────
            if (showVertices) {
                const colorMode = GAME_CONFIG.DEBUG_MORPH_VERTEX_COLOR_MODE ?? 'pinmorph';

                // Pre-compute owner color (lightened) for 'owner' mode
                let ownerDotColor = 0xbbbbbb;
                if (colorMode === 'owner') {
                    const r = ((color >> 16) & 0xff);
                    const g = ((color >> 8) & 0xff);
                    const b = (color & 0xff);
                    const lightR = Math.min(255, r + Math.round((255 - r) * 0.5));
                    const lightG = Math.min(255, g + Math.round((255 - g) * 0.5));
                    const lightB = Math.min(255, b + Math.round((255 - b) * 0.5));
                    ownerDotColor = (lightR << 16) | (lightG << 8) | lightB;
                }

                // Attach labels directly as children of the graphics object
                // (PIXI.Graphics extends Container; children survive clear())
                if (this.labelsAttachedTo !== graphics) {
                    // Detach from old graphics if any
                    for (const lbl of this.labels) {
                        if (lbl.parent) lbl.parent.removeChild(lbl);
                    }
                    this.labelsAttachedTo = graphics;
                }

                for (let i = 0; i < n; i++) {
                    // Nth filter: only show every Nth vertex dot + label
                    if (i % vertexNth !== 0) continue;

                    const dx = toPoints[i][0] - fromPoints[i][0];
                    const dy = toPoints[i][1] - fromPoints[i][1];
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const isPinned = dist < pinThreshold;
                    const cx = flat[i * 2];
                    const cy = flat[i * 2 + 1];

                    // Resolve dot color based on mode
                    const dotColor = colorMode === 'pinmorph'
                        ? (isPinned ? 0x00ff00 : 0xff0000)
                        : colorMode === 'owner'
                            ? ownerDotColor
                            : 0xbbbbbb; // neutral grey

                    // Draw vertex dot
                    graphics.circle(cx, cy, vertexSize);
                    graphics.fill({ color: dotColor, alpha: 0.9 });
                    // Pinned: thin dark outline; Morph: bright white outline
                    graphics.circle(cx, cy, vertexSize + 1);
                    graphics.stroke({
                        width: isPinned ? 0.5 : 1.5,
                        color: isPinned ? 0x333333 : 0xffffff,
                        alpha: isPinned ? 0.5 : 0.9,
                    });

                    // Draw numbered label only on MORPH vertices (not pinned)
                    const showLabels = GAME_CONFIG.DEBUG_MORPH_VERTEX_LABELS ?? true;
                    if (showLabels && !isPinned) {
                        let label = this.labels[labelIdx];
                        if (!label) {
                            const style = new PIXI.TextStyle({
                                fontSize: 11,
                                fill: '#ffffff',
                                fontFamily: 'monospace',
                                fontWeight: 'bold',
                                stroke: { color: '#000000', width: 3 },
                            });
                            label = new PIXI.Text({ text: `${i}`, style });
                            label.anchor.set(0.5, 1.4);
                            label.zIndex = 10000;
                            this.labels.push(label);
                            graphics.addChild(label);
                        }
                        label.text = `${i}`;
                        label.style.fill = dotColor;
                        label.position.set(cx, cy);
                        label.visible = true;
                        labelIdx++;
                    }
                }
            }

            drawn++;
        }

        // Hide unused labels from previous frames
        for (let i = labelIdx; i < this.labels.length; i++) {
            this.labels[i].visible = false;
        }

        // If overlay was turned off, hide all labels
        if (!showVertices) {
            for (const lbl of this.labels) lbl.visible = false;
        }

        log.renderer('PolygonMorphTransitionHandler', `drawFrame t=${rawT.toFixed(3)} eased=${t.toFixed(3)} | drew ${drawn}/${this.pairs.length} regions`);
    }

    /** Clean up label text objects. Call when transition ends. */
    cleanup(): void {
        for (const lbl of this.labels) {
            if (lbl.parent) lbl.parent.removeChild(lbl);
            lbl.destroy();
        }
        this.labels = [];
        this.labelsAttachedTo = null;
    }
}
