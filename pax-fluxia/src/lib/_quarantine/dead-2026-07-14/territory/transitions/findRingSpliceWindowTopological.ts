// ---------------------------------------------------------------------------
// Pass 1: Topological splice detection via cyclic span matching.
// ---------------------------------------------------------------------------
// Compares spans by identity (sharedKey + owner sides) using cyclic rotation
// to find the best alignment. Outputs a candidate changed window in SPAN space
// (not point space — that's Pass 2's job).
// ---------------------------------------------------------------------------

import type { BoundaryRingSnapshot, BoundarySpan, TopologicalSpliceResult } from './types';

/**
 * Compare two spans for identity: same sharedKey and same owner sides.
 */
function spansMatch(a: BoundarySpan, b: BoundarySpan): boolean {
    if (!a.sharedKey || !b.sharedKey) return false;
    if (a.sharedKey !== b.sharedKey) return false;
    if (a.leftOwnerId !== b.leftOwnerId) return false;
    if (a.rightOwnerId !== b.rightOwnerId) return false;
    return true;
}

/**
 * Try all rotational alignments of nextSpans against prevSpans.
 * Returns the rotation that maximizes matched prefix + suffix.
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
        const rotatedLen = nextSpans.length;

        let prefix = 0;
        const maxPrefix = Math.min(prevSpans.length, rotatedLen);
        while (prefix < maxPrefix) {
            const nextIdx = (rot + prefix) % rotatedLen;
            if (!spansMatch(prevSpans[prefix], nextSpans[nextIdx])) break;
            prefix++;
        }

        if (prefix === prevSpans.length && prefix === rotatedLen) {
            return { rotation: rot, prefixLen: prefix, suffixLen: 0 };
        }

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
 * Pass 1: Topological splice detection.
 *
 * Finds the best cyclic alignment of span sequences between prev and next rings.
 * Returns the matched prefix/suffix and candidate changed window in SPAN indices.
 *
 * Does NOT determine point-level boundaries — that's Pass 2.
 */
export function findRingSpliceWindowTopological(
    prevRing: BoundaryRingSnapshot,
    nextRing: BoundaryRingSnapshot,
): TopologicalSpliceResult | null {
    const prevSpans = prevRing.spans;
    const nextSpans = nextRing.spans;

    if (prevSpans.length === 0 || nextSpans.length === 0) return null;

    const { rotation, prefixLen, suffixLen } = findBestRotation(prevSpans, nextSpans);

    // allSpansMatch = true ONLY when both prev and next are FULLY covered.
    // If next has extra spans beyond what matched, it's an insertion, not "all match".
    const allSpansMatch =
        prefixLen + suffixLen >= prevSpans.length &&
        prefixLen + suffixLen >= nextSpans.length;

    // Candidate changed window in span indices
    const prevChangedStart = prefixLen;
    const prevChangedEnd = prevSpans.length - suffixLen;
    const nextChangedStart = prefixLen;  // in rotated order
    const nextChangedEnd = nextSpans.length - suffixLen;  // in rotated order

    const candidateChangedPrevSpanRange: [number, number] | null =
        prevChangedStart < prevChangedEnd ? [prevChangedStart, prevChangedEnd] : null;
    const candidateChangedNextSpanRange: [number, number] | null =
        nextChangedStart < nextChangedEnd ? [nextChangedStart, nextChangedEnd] : null;

    return {
        rotation,
        prefixLen,
        suffixLen,
        candidateChangedPrevSpanRange,
        candidateChangedNextSpanRange,
        allSpansMatch,
    };
}
