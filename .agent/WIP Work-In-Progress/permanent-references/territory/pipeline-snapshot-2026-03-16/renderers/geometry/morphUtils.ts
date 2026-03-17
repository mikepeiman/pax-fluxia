// ── Morph Utilities: parameterization, interpolation, canonical border drawing ──
//
// Extracted from PVV3Renderer.ts — rendering + geometry functions for border
// morphing and transition animation.

import * as PIXI from 'pixi.js';
import type { SharedPolyline, SharedBorderEdge } from './types';
import { resamplePolygon, resamplePolyline, polygonCentroid, lerpPolygon } from './polyUtils';
import { chaikinSmoothPolyline } from './chaikin';
import { log } from '$lib/utils/logger';

// ── Frontier Loop Parameterization (Step C) ───────────────────────────────

/**
 * Parameterize two frontier loops (F1, F2) to N control points and align
 * them at the longest static section.
 *
 * Algorithm:
 * 1. Resample both loops to N evenly-spaced CPs via arc-length
 * 2. For each possible rotation offset k of F2 relative to F1:
 *    count how many CPs are "static" (within ε pixels of each other)
 * 3. Find the rotation that maximizes the longest contiguous run of statics
 * 4. Rotate F2's CPs by that offset so CP[0] aligns at the static anchor
 *
 * Returns { f1CPs, f2CPs } — same length, aligned, ready for lerp.
 */
export function parameterizeAndAlign(
    f1Loop: [number, number][],
    f2Loop: [number, number][],
    n: number,
    epsilon: number = 2,
): { f1CPs: [number, number][]; f2CPs: [number, number][] } {
    // Guard: degenerate loops (< 3 points can't form a polygon)
    if (f1Loop.length < 3 || f2Loop.length < 3) {
        // Return single-point arrays — caller will handle gracefully
        const fallback: [number, number] = f1Loop[0] ?? f2Loop[0] ?? [0, 0];
        const arr = Array.from({ length: n }, () => [fallback[0], fallback[1]] as [number, number]);
        return { f1CPs: arr, f2CPs: arr };
    }

    // Resample both to N CPs (arc-length parameterization)
    const f1Raw = resamplePolygon(f1Loop, n);
    const f2Raw = resamplePolygon(f2Loop, n);

    // Remove closure point (resamplePolygon adds pts[n] = pts[0])
    const f1CPs = f1Raw.slice(0, n) as [number, number][];
    const f2CPs = f2Raw.slice(0, n) as [number, number][];

    // Validate: ensure both arrays have exactly n entries
    if (f1CPs.length < n || f2CPs.length < n) {
        log.sys('FrontierAlign', `WARNING: resample produced ${f1CPs.length}/${f2CPs.length} CPs instead of ${n} — skipping alignment`);
        // Pad to n if needed
        while (f1CPs.length < n) f1CPs.push(f1CPs[f1CPs.length - 1] ?? [0, 0]);
        while (f2CPs.length < n) f2CPs.push(f2CPs[f2CPs.length - 1] ?? [0, 0]);
    }

    // Find best rotation: maximize the longest contiguous static run
    let bestOffset = 0;
    let bestLongestRun = 0;
    const eps2 = epsilon * epsilon;

    for (let offset = 0; offset < n; offset++) {
        // Count longest contiguous run of static CPs at this rotation
        let longestRun = 0;
        let currentRun = 0;

        for (let i = 0; i < n; i++) {
            const j = (i + offset) % n;
            const dx = f1CPs[i][0] - f2CPs[j][0];
            const dy = f1CPs[i][1] - f2CPs[j][1];
            if (dx * dx + dy * dy <= eps2) {
                currentRun++;
                if (currentRun > longestRun) longestRun = currentRun;
            } else {
                currentRun = 0;
            }
        }

        // Also check wrap-around: a run that spans the array boundary
        if (longestRun < n) {
            // Check if the run wraps from end to start
            let wrapRun = 0;
            // Count from end backward
            for (let i = n - 1; i >= 0; i--) {
                const j = (i + offset) % n;
                const dx = f1CPs[i][0] - f2CPs[j][0];
                const dy = f1CPs[i][1] - f2CPs[j][1];
                if (dx * dx + dy * dy <= eps2) wrapRun++;
                else break;
            }
            // Count from start forward
            let startRun = 0;
            for (let i = 0; i < n; i++) {
                const j = (i + offset) % n;
                const dx = f1CPs[i][0] - f2CPs[j][0];
                const dy = f1CPs[i][1] - f2CPs[j][1];
                if (dx * dx + dy * dy <= eps2) startRun++;
                else break;
            }
            const wrapTotal = wrapRun + startRun;
            if (wrapTotal > longestRun && wrapTotal <= n) longestRun = wrapTotal;
        }

        if (longestRun > bestLongestRun) {
            bestLongestRun = longestRun;
            bestOffset = offset;
        }
    }

    // Rotate F2 CPs by bestOffset so they align with F1
    if (bestOffset !== 0) {
        const rotated: [number, number][] = new Array(n);
        for (let i = 0; i < n; i++) {
            rotated[i] = f2CPs[(i + bestOffset) % n];
        }
        log.renderer('FrontierAlign', `Aligned with offset=${bestOffset}, longestStaticRun=${bestLongestRun}/${n} CPs`);
        return { f1CPs, f2CPs: rotated };
    }

    log.renderer('FrontierAlign', `No rotation needed, longestStaticRun=${bestLongestRun}/${n} CPs`);
    return { f1CPs, f2CPs };
}

/**
 * Lerp between two aligned CP arrays.
 * Static CPs (within ε) stay fixed. Changed CPs interpolate linearly.
 */
export function lerpFrontierCPs(
    f1CPs: [number, number][],
    f2CPs: [number, number][],
    t: number,
    epsilon: number = 2,
): [number, number][] {
    const n = f1CPs.length;
    const result: [number, number][] = new Array(n);
    const eps2 = epsilon * epsilon;

    for (let i = 0; i < n; i++) {
        const dx = f1CPs[i][0] - f2CPs[i][0];
        const dy = f1CPs[i][1] - f2CPs[i][1];

        if (dx * dx + dy * dy <= eps2) {
            // Static CP — stays at F1 position (no flicker)
            result[i] = [f1CPs[i][0], f1CPs[i][1]];
        } else {
            // Changed CP — interpolate
            result[i] = [
                f1CPs[i][0] + (f2CPs[i][0] - f1CPs[i][0]) * t,
                f1CPs[i][1] + (f2CPs[i][1] - f1CPs[i][1]) * t,
            ];
        }
    }

    // Close the loop
    result.push([result[0][0], result[0][1]]);
    return result;
}

// ── Canonical Border Drawing ───────────────────────────────────────────────

/**
 * Draw border polylines into a Graphics object as smooth Bézier curves.
 * Uses quadraticCurveTo through midpoints for smooth arc geometry.
 * This is the SINGLE canonical function for all border rendering — steady-state,
 * transition animation, and segment mode all use this function.
 *
 * If smoothPasses > 0, Chaikin subdivision is applied first to generate more
 * control points for the Bézier interpolation. Round caps and joins ensure
 * clean visual connections at polyline junctions.
 */
export function drawBorderPolylines(
    graphics: PIXI.Graphics,
    polylines: { points: [number, number][]; color: number }[],
    smoothPasses: number,
    width: number,
    alpha: number,
): void {
    let drawn = 0;
    for (const polyline of polylines) {
        const pts = smoothPasses > 0
            ? chaikinSmoothPolyline(polyline.points, smoothPasses)
            : polyline.points;
        if (pts.length < 2) continue;

        graphics.beginPath();
        graphics.moveTo(pts[0][0], pts[0][1]);
        if (smoothPasses <= 0 || pts.length === 2) {
            for (let i = 1; i < pts.length; i++) {
                graphics.lineTo(pts[i][0], pts[i][1]);
            }
        } else {
            // Quadratic Bézier through midpoints for smooth arc geometry
            const mid0x = (pts[0][0] + pts[1][0]) / 2;
            const mid0y = (pts[0][1] + pts[1][1]) / 2;
            graphics.lineTo(mid0x, mid0y);
            for (let i = 1; i < pts.length - 1; i++) {
                const midX = (pts[i][0] + pts[i + 1][0]) / 2;
                const midY = (pts[i][1] + pts[i + 1][1]) / 2;
                graphics.quadraticCurveTo(pts[i][0], pts[i][1], midX, midY);
            }
            const last = pts[pts.length - 1];
            graphics.lineTo(last[0], last[1]);
        }
        graphics.stroke({ width, color: polyline.color, alpha, cap: 'round', join: 'round' });
        drawn++;
    }
}

/** Build lerped polylines from prev → target for transition animation.
 *  Matches polylines by ownerPairKey + nearest centroid, resamples + lerps.
 *  Returns an array suitable for drawBorderPolylines. */
export function buildLerpedPolylines(
    prev: SharedPolyline[], target: SharedPolyline[],
    t: number,
): { points: [number, number][]; color: number }[] {
    const RESAMPLE_N = 32;
    const result: { points: [number, number][]; color: number }[] = [];

    // Group by ownerPairKey for matching
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

    for (const key of allKeys) {
        const pLines = prevByKey.get(key) ?? [];
        const tLines = targetByKey.get(key) ?? [];
        const usedTargets = new Set<number>();

        for (const pLine of pLines) {
            const pC = polygonCentroid(pLine.points);
            let bestDist = Infinity;
            let bestIdx = -1;
            for (let ti = 0; ti < tLines.length; ti++) {
                if (usedTargets.has(ti)) continue;
                const tC = polygonCentroid(tLines[ti].points);
                const d = Math.hypot(pC[0] - tC[0], pC[1] - tC[1]);
                if (d < bestDist) { bestDist = d; bestIdx = ti; }
            }

            if (bestIdx >= 0) {
                usedTargets.add(bestIdx);
                const tLine = tLines[bestIdx];
                const pSampled = resamplePolyline(pLine.points, RESAMPLE_N);
                let tSampled = resamplePolyline(tLine.points, RESAMPLE_N);

                // Fix flipping: ensure polylines are oriented the same direction.
                // If start-of-prev is closer to end-of-target than start-of-target,
                // reverse the target to match orientation.
                const p0 = pSampled[0];
                const t0 = tSampled[0];
                const tN = tSampled[tSampled.length - 1];
                const distSameDir = Math.hypot(p0[0] - t0[0], p0[1] - t0[1]);
                const distReversed = Math.hypot(p0[0] - tN[0], p0[1] - tN[1]);
                if (distReversed < distSameDir) {
                    tSampled = tSampled.slice().reverse() as [number, number][];
                }

                result.push({ points: lerpPolygon(pSampled, tSampled, t), color: tLine.color });
            } else {
                // Prev-only: use prev points (will fade out via alpha in caller)
                result.push({ points: pLine.points, color: pLine.color });
            }
        }

        // Target-only polylines: use target points (fade in via alpha in caller)
        for (let ti = 0; ti < tLines.length; ti++) {
            if (usedTargets.has(ti)) continue;
            result.push({ points: tLines[ti].points, color: tLines[ti].color });
        }
    }
    return result;
}

/** Draw shared border edges at interpolated positions between prev and target.
 *  Matches edges by midpoint proximity for smooth "borders sliding" animation.
 *
 *  Note: `borderGraphics` is passed in as parameter — caller owns the PIXI.Graphics lifecycle. */
export function renderInterpolatedBorders(
    borderGraphics: PIXI.Graphics,
    prev: SharedBorderEdge[], target: SharedBorderEdge[],
    t: number,  // 0=prev, 1=target (eased)
    borderWidth: number, borderAlpha: number,
): void {
    borderGraphics.clear();
    borderGraphics.visible = true;

    const blendWidth = borderWidth * 2.5;

    // Build midpoint index for target edges
    const targetUsed = new Set<number>();

    // For each prev edge, find nearest target edge by midpoint
    for (const pEdge of prev) {
        const pMx = (pEdge.x1 + pEdge.x2) / 2;
        const pMy = (pEdge.y1 + pEdge.y2) / 2;

        let bestDist = Infinity;
        let bestIdx = -1;
        for (let ti = 0; ti < target.length; ti++) {
            if (targetUsed.has(ti)) continue;
            const tMx = (target[ti].x1 + target[ti].x2) / 2;
            const tMy = (target[ti].y1 + target[ti].y2) / 2;
            const d = Math.hypot(pMx - tMx, pMy - tMy);
            if (d < bestDist) { bestDist = d; bestIdx = ti; }
        }

        if (bestIdx >= 0 && bestDist < 200) {
            // Matched pair — lerp endpoints
            targetUsed.add(bestIdx);
            const tEdge = target[bestIdx];
            const x1 = pEdge.x1 + (tEdge.x1 - pEdge.x1) * t;
            const y1 = pEdge.y1 + (tEdge.y1 - pEdge.y1) * t;
            const x2 = pEdge.x2 + (tEdge.x2 - pEdge.x2) * t;
            const y2 = pEdge.y2 + (tEdge.y2 - pEdge.y2) * t;
            // Use target edge color (since fills show target state)
            const color = tEdge.colorA || pEdge.colorA || 0x888888;
            borderGraphics.beginPath();
            borderGraphics.moveTo(x1, y1);
            borderGraphics.lineTo(x2, y2);
            borderGraphics.stroke({ width: blendWidth, color, alpha: borderAlpha });
        } else {
            // Prev edge fading out (no match) — draw at prev position with decreasing alpha
            borderGraphics.beginPath();
            borderGraphics.moveTo(pEdge.x1, pEdge.y1);
            borderGraphics.lineTo(pEdge.x2, pEdge.y2);
            borderGraphics.stroke({ width: blendWidth, color: pEdge.colorA || 0x888888, alpha: borderAlpha * (1 - t) });
        }
    }

    // Unmatched target edges — fade in
    for (let ti = 0; ti < target.length; ti++) {
        if (targetUsed.has(ti)) continue;
        const tEdge = target[ti];
        borderGraphics.beginPath();
        borderGraphics.moveTo(tEdge.x1, tEdge.y1);
        borderGraphics.lineTo(tEdge.x2, tEdge.y2);
        borderGraphics.stroke({ width: blendWidth, color: tEdge.colorA || 0x888888, alpha: borderAlpha * t });
    }
}
