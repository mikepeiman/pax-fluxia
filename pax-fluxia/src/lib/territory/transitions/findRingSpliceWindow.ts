// ---------------------------------------------------------------------------
// Find the splice window between two boundary rings.
// ---------------------------------------------------------------------------
// Compares spans by identity (sharedKey + owner sides) to find the best
// rotational alignment, then extracts the maximal unchanged prefix/suffix.
// The middle is the changed window.
// ---------------------------------------------------------------------------

import type { BoundaryRingSnapshot, BoundarySpan, RingSpliceWindow, Vec2 } from './types';

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
 * Try all rotational alignments of nextSpans against prevSpans to find
 * the rotation that maximizes the matched prefix + suffix length.
 *
 * This handles the core bug: ring construction can put spans in different
 * order between frames, so a linear walk from position 0 fails. Circular
 * matching tries all starting positions and picks the best.
 *
 * O(S²) where S = number of spans per ring (typically 3-15).
 */
function findBestRotation(
    prevSpans: BoundarySpan[],
    nextSpans: BoundarySpan[],
): { rotation: number; prefixLen: number; suffixLen: number } {
    let bestRotation = 0;
    let bestPrefix = 0;
    let bestSuffix = 0;
    let bestTotal = 0;

    for (let rot = 0; rot < nextSpans.length; rot++) {
        // Build rotated view of nextSpans
        const rotatedLen = nextSpans.length;

        // Walk forward: find matching prefix with rotated next
        let prefix = 0;
        const maxPrefix = Math.min(prevSpans.length, rotatedLen);
        while (prefix < maxPrefix) {
            const nextIdx = (rot + prefix) % rotatedLen;
            if (!spansMatch(prevSpans[prefix], nextSpans[nextIdx])) break;
            prefix++;
        }

        // If everything matched
        if (prefix === prevSpans.length && prefix === rotatedLen) {
            return { rotation: rot, prefixLen: prefix, suffixLen: 0 };
        }

        // Walk backward: find matching suffix (don't overlap with prefix)
        let suffix = 0;
        const maxSuffix = Math.min(
            prevSpans.length - prefix,
            rotatedLen - prefix,
        );
        while (suffix < maxSuffix) {
            const prevIdx = prevSpans.length - 1 - suffix;
            const nextIdx = (rot + rotatedLen - 1 - suffix) % rotatedLen;
            if (!spansMatch(prevSpans[prevIdx], nextSpans[nextIdx])) break;
            suffix++;
        }

        const total = prefix + suffix;
        if (total > bestTotal) {
            bestTotal = total;
            bestRotation = rot;
            bestPrefix = prefix;
            bestSuffix = suffix;
        }
    }

    return { rotation: bestRotation, prefixLen: bestPrefix, suffixLen: bestSuffix };
}

/**
 * Rotate a ring's points array so that the point at `startIndex` becomes
 * the first point. This aligns the point array with the rotated span ordering.
 */
function rotatePoints(points: Vec2[], startIndex: number): Vec2[] {
    if (startIndex === 0 || points.length === 0) return points;
    const idx = ((startIndex % points.length) + points.length) % points.length;
    return [...points.slice(idx), ...points.slice(0, idx)];
}

/**
 * Compute the point index where a rotated span sequence starts.
 * If we rotate spans by `rotation`, the first span in the rotated
 * sequence starts at `nextSpans[rotation].startSample`.
 */
function getRotationPointOffset(spans: BoundarySpan[], rotation: number): number {
    if (rotation === 0 || spans.length === 0) return 0;
    return spans[rotation % spans.length].startSample;
}

/**
 * Find the splice window between two rings of the same territory.
 *
 * Algorithm:
 * 1. Try all rotational alignments of next spans against prev spans.
 * 2. Pick the rotation that maximizes matched prefix + suffix.
 * 3. Rotate next ring's points to align with the matched ordering.
 * 4. The middle region is the changed arc for prev/next.
 *
 * Returns null if rings have no spans or completely no matching spans.
 */
export function findRingSpliceWindow(
    prevRing: BoundaryRingSnapshot,
    nextRing: BoundaryRingSnapshot,
    _epsilon: number = 2.0,
): { window: RingSpliceWindow; rotatedNextPoints: Vec2[] } | null {
    const prevSpans = prevRing.spans;
    const nextSpans = nextRing.spans;

    if (prevSpans.length === 0 || nextSpans.length === 0) return null;

    // Find best rotational alignment
    const { rotation, prefixLen, suffixLen } = findBestRotation(prevSpans, nextSpans);

    // Diagnostic log
    const prevUnmatched = prevSpans.filter(s => !s.sharedKey).length;
    const nextUnmatched = nextSpans.filter(s => !s.sharedKey).length;
    console.log(
        `[SPLICE DIAG] ring=${prevRing.ringId} prevSpans=${prevSpans.length}(unmatched=${prevUnmatched}) nextSpans=${nextSpans.length}(unmatched=${nextUnmatched}) rotation=${rotation} prefix=${prefixLen} suffix=${suffixLen}`,
        prefixLen === 0 && suffixLen === 0 ? '→ NO MATCH' : `→ changed window`,
    );
    if (prefixLen === 0 && suffixLen === 0 && prevSpans.length > 0 && nextSpans.length > 0) {
        const prevKeys = prevSpans.slice(0, 3).map(s => s.sharedKey ?? '__none__');
        const nextKeys = nextSpans.slice(0, 3).map(s => s.sharedKey ?? '__none__');
        console.log(`  prev first 3 keys: ${prevKeys.join(', ')}`);
        console.log(`  next first 3 keys: ${nextKeys.join(', ')}`);
    }

    // No matching spans at all — can't splice
    if (prefixLen === 0 && suffixLen === 0) return null;

    // All matched — no change
    if (prefixLen === prevSpans.length && prefixLen === nextSpans.length) {
        return {
            window: {
                ringId: prevRing.ringId,
                anchorStartPrev: 0,
                anchorEndPrev: prevRing.points.length,
                anchorStartNext: 0,
                anchorEndNext: nextRing.points.length,
                changedPrevRange: null,
                changedNextRange: null,
            },
            rotatedNextPoints: nextRing.points,
        };
    }

    // Compute rotated span indices for the next ring
    const rotatedNextSpans: BoundarySpan[] = [];
    for (let i = 0; i < nextSpans.length; i++) {
        rotatedNextSpans.push(nextSpans[(rotation + i) % nextSpans.length]);
    }

    // Rotate next ring's points to match span alignment
    const pointOffset = getRotationPointOffset(nextSpans, rotation);
    const rotatedNextPts = rotatePoints(nextRing.points, pointOffset);

    // Recompute rotated span sample indices (relative to rotated points)
    // The spans are now in a different order, so their startSample/endSample
    // need to be remapped relative to the rotation offset.
    const nTotal = nextRing.points.length;

    // Convert span ranges to sample indices on PREV (unchanged, no rotation)
    const anchorStartPrev = prefixLen > 0
        ? prevSpans[prefixLen - 1].endSample
        : 0;
    const anchorEndPrev = suffixLen > 0
        ? prevSpans[prevSpans.length - suffixLen].startSample
        : prevRing.points.length;

    // Convert span ranges to sample indices on NEXT (rotated)
    // After rotation, the rotated spans have remapped indices.
    // The prefix-th span in rotated order ends at some point.
    // We need to compute where spans fall in the rotated point array.
    function remapSampleIndex(originalIdx: number): number {
        return ((originalIdx - pointOffset) % nTotal + nTotal) % nTotal;
    }

    const anchorStartNext = prefixLen > 0
        ? remapSampleIndex(nextSpans[(rotation + prefixLen - 1) % nextSpans.length].endSample)
        : 0;
    const anchorEndNext = suffixLen > 0
        ? remapSampleIndex(nextSpans[(rotation + nextSpans.length - suffixLen) % nextSpans.length].startSample)
        : nTotal;

    // Changed ranges
    const changedPrevRange: [number, number] | null =
        anchorStartPrev < anchorEndPrev
            ? [anchorStartPrev, anchorEndPrev]
            : null;
    const changedNextRange: [number, number] | null =
        anchorStartNext < anchorEndNext
            ? [anchorStartNext, anchorEndNext]
            : null;

    return {
        window: {
            ringId: prevRing.ringId,
            anchorStartPrev,
            anchorEndPrev,
            anchorStartNext,
            anchorEndNext,
            changedPrevRange,
            changedNextRange,
        },
        rotatedNextPoints: rotatedNextPts,
    };
}
