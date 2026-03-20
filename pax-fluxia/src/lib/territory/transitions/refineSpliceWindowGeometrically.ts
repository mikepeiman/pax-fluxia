// ---------------------------------------------------------------------------
// Pass 2: Geometric refinement of the candidate splice window.
// ---------------------------------------------------------------------------
// Takes the topological candidate window (span-level) and refines it to
// exact point-level boundaries by comparing sampled geometry within epsilon.
//
// Handles the key case that topology alone cannot: "all spans match but
// geometry changed locally" — by walking from the static ends inward to
// find where displacement first exceeds epsilon.
// ---------------------------------------------------------------------------

import type {
    Vec2,
    BoundaryRingSnapshot,
    BoundarySpan,
    TopologicalSpliceResult,
    GeometricRefinementResult,
} from './types';

const DEFAULT_EPSILON = 5.0;  // pixels

function dist2(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

/**
 * Rotate a ring's points so that the point at `startIndex` becomes index 0.
 */
function rotatePoints(points: Vec2[], startIndex: number): Vec2[] {
    if (startIndex === 0 || points.length === 0) return points;
    const idx = ((startIndex % points.length) + points.length) % points.length;
    return [...points.slice(idx), ...points.slice(0, idx)];
}

/**
 * Get the point offset for rotating the next ring to match span alignment.
 * The rotation moves span[rotation] to be first, so we need to offset
 * the points by span[rotation].startSample.
 */
function getRotationPointOffset(spans: BoundarySpan[], rotation: number): number {
    if (rotation === 0 || spans.length === 0) return 0;
    return spans[rotation % spans.length].startSample;
}

/**
 * Resample a closed ring to exactly N equidistant points along arc length.
 */
function resampleClosedRing(pts: Vec2[], n: number): Vec2[] {
    if (pts.length < 3 || n < 3) return [...pts];

    const closed = [...pts, pts[0]];
    const cumLen: number[] = [0];
    for (let i = 1; i < closed.length; i++) {
        const dx = closed[i].x - closed[i - 1].x;
        const dy = closed[i].y - closed[i - 1].y;
        cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const totalLen = cumLen[cumLen.length - 1];
    if (totalLen < 1e-6) return [...pts];

    const result: Vec2[] = [];
    for (let j = 0; j < n; j++) {
        const targetLen = (j / n) * totalLen;
        let segIdx = 0;
        while (segIdx < cumLen.length - 2 && cumLen[segIdx + 1] < targetLen) segIdx++;
        const segStart = cumLen[segIdx];
        const segEnd = cumLen[segIdx + 1];
        const segFrac = (segEnd - segStart) > 1e-6 ? (targetLen - segStart) / (segEnd - segStart) : 0;
        result.push({
            x: closed[segIdx].x + (closed[segIdx + 1].x - closed[segIdx].x) * segFrac,
            y: closed[segIdx].y + (closed[segIdx + 1].y - closed[segIdx].y) * segFrac,
        });
    }
    return result;
}

/**
 * Pass 2: Geometric refinement.
 *
 * Takes the topological result and refines to exact point boundaries.
 * Two modes:
 *   A) Topological change exists → use span boundaries as initial anchors,
 *      then adjust by checking geometry at the edges.
 *   B) All spans match (no topological change) → full-ring geometric scan
 *      to find localized displacement.
 */
export function refineSpliceWindowGeometrically(
    prevRing: BoundaryRingSnapshot,
    nextRing: BoundaryRingSnapshot,
    topo: TopologicalSpliceResult,
    epsilon: number = DEFAULT_EPSILON,
): GeometricRefinementResult {
    const eps2 = epsilon * epsilon;
    const prevSpans = prevRing.spans;
    const nextSpans = nextRing.spans;

    // Rotate next ring points to match topological alignment
    const pointOffset = getRotationPointOffset(nextSpans, topo.rotation);
    const nextPtsAligned = rotatePoints(nextRing.points, pointOffset);

    // ── Case B: All spans match — full-ring geometric scan ──
    if (topo.allSpansMatch) {
        // Resample both rings to equal N for point-by-point comparison
        const N = Math.max(prevRing.points.length, nextPtsAligned.length, 64);
        const prevResampled = resampleClosedRing(prevRing.points, N);
        const nextResampled = resampleClosedRing(nextPtsAligned, N);

        // Walk from "far end" (N/2, opposite the likely change zone).
        // Use span-boundary alignment: since all spans match, span[0] starts at
        // sample 0 on both rings. The geometric change is typically localized.
        const halfN = Math.floor(N / 2);

        // Check if the far point is static
        if (dist2(prevResampled[halfN], nextResampled[halfN]) > eps2) {
            // Even the far point moved → entire ring geometry changed, can't localize
            return {
                prevChangedRange: [0, prevRing.points.length],
                nextChangedRange: [0, nextPtsAligned.length],
                staticPrefixEnd: 0,
                staticSuffixStart: prevRing.points.length,
                geomEqualOutsidePatch: false,
            };
        }

        // Walk backward from halfN toward 0
        let leftBoundary = halfN;
        while (leftBoundary > 0 && dist2(prevResampled[leftBoundary - 1], nextResampled[leftBoundary - 1]) <= eps2) {
            leftBoundary--;
        }

        // Walk forward from halfN toward N-1
        let rightBoundary = halfN;
        while (rightBoundary < N - 1 && dist2(prevResampled[rightBoundary + 1], nextResampled[rightBoundary + 1]) <= eps2) {
            rightBoundary++;
        }

        // If we reached both ends (leftBoundary=0 and rightBoundary=N-1), check boundary
        if (leftBoundary === 0 && rightBoundary === N - 1) {
            // All points match → truly unchanged
            return {
                prevChangedRange: null,
                nextChangedRange: null,
                staticPrefixEnd: prevRing.points.length,
                staticSuffixStart: prevRing.points.length,
                geomEqualOutsidePatch: true,
            };
        }

        // Changed region wraps around index 0 (which is where span[0] starts)
        // Map resampled indices back to original ring proportions
        const staticFraction = (rightBoundary - leftBoundary + 1) / N;
        const prevLen = prevRing.points.length;
        const nextLen = nextPtsAligned.length;

        // Static region in original coords: proportional mapping
        const staticStartPrev = Math.round((leftBoundary / N) * prevLen);
        const staticEndPrev = Math.round(((rightBoundary + 1) / N) * prevLen);
        const staticStartNext = Math.round((leftBoundary / N) * nextLen);
        const staticEndNext = Math.round(((rightBoundary + 1) / N) * nextLen);

        // Changed regions: before static start and after static end (wraps around 0)
        const prevChangedRange: [number, number] | null =
            staticStartPrev > 0 || staticEndPrev < prevLen
                ? [staticEndPrev % prevLen, staticStartPrev] : null;
        const nextChangedRange: [number, number] | null =
            staticStartNext > 0 || staticEndNext < nextLen
                ? [staticEndNext % nextLen, staticStartNext] : null;

        return {
            prevChangedRange,
            nextChangedRange,
            staticPrefixEnd: staticStartPrev > 0 ? 0 : staticEndPrev,
            staticSuffixStart: staticEndPrev < prevLen ? staticEndPrev : prevLen,
            geomEqualOutsidePatch: true,
        };
    }

    // ── Case A: Topological change exists — use span boundaries as initial anchors ──
    const { prefixLen, suffixLen } = topo;

    // Convert span-level boundaries to point-level boundaries
    const anchorStartPrev = prefixLen > 0 ? prevSpans[prefixLen - 1].endSample : 0;
    const anchorEndPrev = suffixLen > 0 ? prevSpans[prevSpans.length - suffixLen].startSample : prevRing.points.length;

    // For next ring: use rotated span indices
    const rotatedNextSpanIdx = (i: number) => (topo.rotation + i) % nextSpans.length;

    // Compute next anchors in ORIGINAL (unrotated) next ring coordinates
    const rawAnchorStartNext = prefixLen > 0 ? nextSpans[rotatedNextSpanIdx(prefixLen - 1)].endSample : 0;
    const rawAnchorEndNext = suffixLen > 0 ? nextSpans[rotatedNextSpanIdx(nextSpans.length - suffixLen)].startSample : nextRing.points.length;

    // Remap to rotated coordinate space
    let anchorStartNext: number;
    let anchorEndNext: number;
    if (pointOffset > 0) {
        const nTotal = nextRing.points.length;
        anchorStartNext = ((rawAnchorStartNext - pointOffset) % nTotal + nTotal) % nTotal;
        anchorEndNext = ((rawAnchorEndNext - pointOffset) % nTotal + nTotal) % nTotal;

        // If remapping caused wrapping (start > end), normalize to valid forward range
        if (anchorStartNext > anchorEndNext) {
            // The changed region wraps around 0 in rotated coordinates.
            // Expand to include the wrap: changed = [0, anchorEndNext] union [anchorStartNext, nTotal]
            // Simplify: treat as [anchorStartNext, nTotal] (largest contiguous range)
            anchorEndNext = nTotal;
        }
    } else {
        anchorStartNext = rawAnchorStartNext;
        anchorEndNext = rawAnchorEndNext;
    }

    // Validate: anchorStart <= anchorEnd for both prev and next
    const prevChangedRange: [number, number] | null =
        anchorStartPrev < anchorEndPrev ? [anchorStartPrev, anchorEndPrev] : null;
    const nextChangedRange: [number, number] | null =
        anchorStartNext < anchorEndNext ? [anchorStartNext, anchorEndNext] : null;

    // Check if geometry outside the changed region matches
    let geomEqualOutside = true;
    const checkCount = Math.min(anchorStartPrev, anchorStartNext, 10);
    if (checkCount > 0) {
        for (let i = 0; i < checkCount; i++) {
            if (dist2(prevRing.points[i], nextPtsAligned[i]) > eps2) {
                geomEqualOutside = false;
                break;
            }
        }
    }

    return {
        prevChangedRange,
        nextChangedRange,
        staticPrefixEnd: anchorStartPrev,
        staticSuffixStart: anchorEndPrev,
        geomEqualOutsidePatch: geomEqualOutside,
    };
}
