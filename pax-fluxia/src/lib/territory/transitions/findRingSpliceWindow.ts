// ---------------------------------------------------------------------------
// Find the splice window between two boundary rings.
// ---------------------------------------------------------------------------
// Compares spans by identity (spanId/sharedKey + owner sides) to find
// maximal unchanged prefix and suffix. The middle is the changed window.
// ---------------------------------------------------------------------------

import type { BoundaryRingSnapshot, BoundarySpan, RingSpliceWindow } from './types';

/**
 * Compare two spans for identity: same sharedKey and same owner sides.
 */
function spansMatch(a: BoundarySpan, b: BoundarySpan): boolean {
    // Both must have sharedKey defined and equal
    if (!a.sharedKey || !b.sharedKey) return false;
    if (a.sharedKey !== b.sharedKey) return false;
    // Owner sides must match
    if (a.leftOwnerId !== b.leftOwnerId) return false;
    if (a.rightOwnerId !== b.rightOwnerId) return false;
    return true;
}

/**
 * Find the splice window between two rings of the same territory.
 *
 * Algorithm:
 * 1. Walk spans from the start: while spans match → unchanged prefix.
 * 2. Walk spans from the end: while spans match → unchanged suffix.
 * 3. The middle region is the changed arc for prev/next.
 * 4. Convert span ranges to sample index ranges.
 *
 * Returns null if rings are completely different (no matching spans)
 * or if multiple disjoint changed windows are found (v1 limitation).
 */
export function findRingSpliceWindow(
    prevRing: BoundaryRingSnapshot,
    nextRing: BoundaryRingSnapshot,
    _epsilon: number = 2.0,
): RingSpliceWindow | null {
    const prevSpans = prevRing.spans;
    const nextSpans = nextRing.spans;

    if (prevSpans.length === 0 || nextSpans.length === 0) return null;

    // Walk forward: find matching prefix
    let prefixLen = 0;
    const maxPrefix = Math.min(prevSpans.length, nextSpans.length);
    while (prefixLen < maxPrefix && spansMatch(prevSpans[prefixLen], nextSpans[prefixLen])) {
        prefixLen++;
    }

    // If everything matched, no change
    if (prefixLen === prevSpans.length && prefixLen === nextSpans.length) {
        return {
            ringId: prevRing.ringId,
            anchorStartPrev: 0,
            anchorEndPrev: prevRing.points.length,
            anchorStartNext: 0,
            anchorEndNext: nextRing.points.length,
            changedPrevRange: null,
            changedNextRange: null,
        };
    }

    // Walk backward: find matching suffix (don't overlap with prefix)
    let suffixLen = 0;
    const maxSuffix = Math.min(
        prevSpans.length - prefixLen,
        nextSpans.length - prefixLen,
    );
    while (
        suffixLen < maxSuffix &&
        spansMatch(
            prevSpans[prevSpans.length - 1 - suffixLen],
            nextSpans[nextSpans.length - 1 - suffixLen],
        )
    ) {
        suffixLen++;
    }

    // No matching spans at all — can't splice
    if (prefixLen === 0 && suffixLen === 0) return null;

    // Convert span ranges to sample indices
    // Unchanged prefix ends at the last sample of the last matching prefix span
    const anchorStartPrev = prefixLen > 0
        ? prevSpans[prefixLen - 1].endSample
        : 0;
    const anchorStartNext = prefixLen > 0
        ? nextSpans[prefixLen - 1].endSample
        : 0;

    // Unchanged suffix starts at the first sample of the first matching suffix span
    const anchorEndPrev = suffixLen > 0
        ? prevSpans[prevSpans.length - suffixLen].startSample
        : prevRing.points.length;
    const anchorEndNext = suffixLen > 0
        ? nextSpans[nextSpans.length - suffixLen].startSample
        : nextRing.points.length;

    // Changed ranges: the gap between prefix end and suffix start
    const changedPrevRange: [number, number] | null =
        anchorStartPrev < anchorEndPrev
            ? [anchorStartPrev, anchorEndPrev]
            : null;
    const changedNextRange: [number, number] | null =
        anchorStartNext < anchorEndNext
            ? [anchorStartNext, anchorEndNext]
            : null;

    return {
        ringId: prevRing.ringId,
        anchorStartPrev,
        anchorEndPrev,
        anchorStartNext,
        anchorEndNext,
        changedPrevRange,
        changedNextRange,
    };
}
