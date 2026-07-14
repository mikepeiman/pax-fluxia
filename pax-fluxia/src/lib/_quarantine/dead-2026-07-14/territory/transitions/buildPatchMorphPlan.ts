// ---------------------------------------------------------------------------
// Build a local morph plan for the changed patch between two anchor points.
// ---------------------------------------------------------------------------

import type {
    Vec2,
    BoundaryRingSnapshot,
    RingSpliceWindow,
    PatchMorphPlan,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a subarray from a ring's points using sample indices.
 * Handles wrapping for closed rings.
 */
function sliceRingPoints(points: Vec2[], start: number, end: number): Vec2[] {
    if (start <= end) {
        return points.slice(start, end);
    }
    // Wrapping case: start is past end in a closed ring
    return [...points.slice(start), ...points.slice(0, end)];
}

/**
 * Compute total arc length of a polyline segment.
 */
function polylineLength(pts: Vec2[]): number {
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        const dy = pts[i].y - pts[i - 1].y;
        len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
}

/**
 * Resample an open polyline to exactly N equidistant points along arc length.
 * First and last points are preserved exactly (anchor lock).
 */
export function resamplePolylineByArcLength(pts: Vec2[], n: number): Vec2[] {
    if (pts.length < 2 || n < 2) return [...pts];

    // Compute cumulative arc lengths
    const cumLen: number[] = [0];
    for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        const dy = pts[i].y - pts[i - 1].y;
        cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const totalLen = cumLen[cumLen.length - 1];
    if (totalLen < 1e-6) return [...pts];

    const result: Vec2[] = [{ x: pts[0].x, y: pts[0].y }]; // anchor A locked

    for (let j = 1; j < n - 1; j++) {
        const targetLen = (j / (n - 1)) * totalLen;

        // Find the segment containing this arc length
        let segIdx = 0;
        while (segIdx < cumLen.length - 1 && cumLen[segIdx + 1] < targetLen) {
            segIdx++;
        }

        const segStart = cumLen[segIdx];
        const segEnd = cumLen[segIdx + 1];
        const segFrac = (segEnd - segStart) > 1e-6
            ? (targetLen - segStart) / (segEnd - segStart)
            : 0;

        result.push({
            x: pts[segIdx].x + (pts[segIdx + 1].x - pts[segIdx].x) * segFrac,
            y: pts[segIdx].y + (pts[segIdx + 1].y - pts[segIdx].y) * segFrac,
        });
    }

    result.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y }); // anchor B locked
    return result;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Build a local morph plan for the changed patch of a ring.
 *
 * Extracts the changed arc from both prev and next rings,
 * resamples both to equal point counts, and locks anchor endpoints.
 */
export function buildPatchMorphPlan(
    prevRing: BoundaryRingSnapshot,
    nextRing: BoundaryRingSnapshot,
    window: RingSpliceWindow,
    sampleCount: number = 32,
    conquestOrigin?: Vec2,
): PatchMorphPlan | null {
    if (!window.changedPrevRange && !window.changedNextRange) return null;

    // Extract changed arcs
    const prevArc = window.changedPrevRange
        ? sliceRingPoints(prevRing.points, window.changedPrevRange[0], window.changedPrevRange[1])
        : [];
    const nextArc = window.changedNextRange
        ? sliceRingPoints(nextRing.points, window.changedNextRange[0], window.changedNextRange[1])
        : [];

    // If either arc is empty, use the other's endpoints as a degenerate segment
    if (prevArc.length < 2 && nextArc.length < 2) return null;

    // Ensure minimum viable arcs
    const fromArc = prevArc.length >= 2 ? prevArc : [nextArc[0], nextArc[nextArc.length - 1]];
    const toArc = nextArc.length >= 2 ? nextArc : [prevArc[0], prevArc[prevArc.length - 1]];

    // Resample both to equal point counts
    const resampleN = Math.max(sampleCount, 8);
    const fromSamples = resamplePolylineByArcLength(fromArc, resampleN);
    const toSamples = resamplePolylineByArcLength(toArc, resampleN);

    return {
        ringId: prevRing.ringId,
        anchorA: fromSamples[0],
        anchorB: fromSamples[fromSamples.length - 1],
        fromSamples,
        toSamples,
        localOrigin: conquestOrigin,
    };
}
