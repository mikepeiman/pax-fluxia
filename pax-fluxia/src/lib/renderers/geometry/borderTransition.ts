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
import type { SharedPolyline } from '$lib/territory/compiler/pvv2MetricStage';
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
 * Redraws the path every frame with interpolated control points.
 */
export class GraphicsPathMorpher {
    private pairs: MatchedPair[];
    private easingFn: (t: number) => number;

    constructor(
        prev: SharedPolyline[],
        target: SharedPolyline[],
        easing: 'cubic' | 'back' | 'elastic' = 'back',
        resampleN: number = 32,
        overshoot: number = 1.70158,
    ) {
        this.pairs = matchPolylines(prev, target, resampleN);
        this.easingFn = easing === 'elastic' ? easeInOutElastic
            : easing === 'back' ? (t: number) => easeInOutBack(t, overshoot)
                : easeInOutCubic;

        log.renderer('GraphicsPathMorpher', `created | pairs=${this.pairs.length} easing=${easing} resampleN=${resampleN} overshoot=${overshoot.toFixed(2)}`);
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

        log.renderer('GraphicsPathMorpher', `drawFrame t=${rawT.toFixed(3)} eased=${t.toFixed(3)} | drew ${drawn}/${this.pairs.length} polylines | w=${width} a=${alpha.toFixed(2)}`);
    }
}

// ── Mode 2: Glow Path Morpher (double-stroke rope-like effect) ──────────────

/**
 * Morphs border polylines with a double-stroke "rope glow" visual.
 * Outer stroke: wide, low-alpha glow in the border color.
 * Inner stroke: narrow, full-alpha core line.
 * Uses Graphics (proven to work in voronoiContainer) instead of MeshRope.
 */
export class GlowPathMorpher {
    private pairs: MatchedPair[];
    private easingFn: (t: number) => number;

    constructor(
        prev: SharedPolyline[],
        target: SharedPolyline[],
        easing: 'cubic' | 'back' | 'elastic' = 'back',
        resampleN: number = 32,
        overshoot: number = 1.70158,
    ) {
        this.pairs = matchPolylines(prev, target, resampleN);
        this.easingFn = easing === 'elastic' ? easeInOutElastic
            : easing === 'back' ? (t: number) => easeInOutBack(t, overshoot)
                : easeInOutCubic;

        log.renderer('GlowPathMorpher', `created | pairs=${this.pairs.length} easing=${easing} resampleN=${resampleN} overshoot=${overshoot.toFixed(2)}`);
    }

    /**
     * Draw all morphed polylines with glow effect onto the given Graphics at time t (0→1).
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

            // Compute interpolated points once
            const lerpedX: number[] = new Array(n);
            const lerpedY: number[] = new Array(n);
            for (let i = 0; i < n; i++) {
                lerpedX[i] = fromPoints[i][0] + (toPoints[i][0] - fromPoints[i][0]) * t;
                lerpedY[i] = fromPoints[i][1] + (toPoints[i][1] - fromPoints[i][1]) * t;
            }

            // Outer glow stroke (wide, translucent)
            graphics.moveTo(lerpedX[0], lerpedY[0]);
            for (let i = 1; i < n; i++) {
                graphics.lineTo(lerpedX[i], lerpedY[i]);
            }
            graphics.stroke({ width: width * 3, color, alpha: alpha * 0.3, cap: 'round', join: 'round' });

            // Inner core stroke (narrow, bright)
            graphics.moveTo(lerpedX[0], lerpedY[0]);
            for (let i = 1; i < n; i++) {
                graphics.lineTo(lerpedX[i], lerpedY[i]);
            }
            graphics.stroke({ width, color, alpha, cap: 'round', join: 'round' });
            drawn++;
        }

        log.renderer('GlowPathMorpher', `drawFrame t=${rawT.toFixed(3)} eased=${t.toFixed(3)} | drew ${drawn}/${this.pairs.length} polylines | w=${width} a=${alpha.toFixed(2)}`);
    }

    /** No-op cleanup (nothing to remove, we draw on shared Graphics). */
    removeAll(): void {
        log.renderer('GlowPathMorpher', 'removeAll: no-op (Graphics-based)');
    }
}

