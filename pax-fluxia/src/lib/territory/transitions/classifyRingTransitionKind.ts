// ---------------------------------------------------------------------------
// Classify a ring's transition kind and validate invariants.
// ---------------------------------------------------------------------------
// Uses the geometric refinement result to assign one of 5 explicit kinds.
// Validates invariants and produces clean diagnostics.
// ---------------------------------------------------------------------------

import type {
    RingTransitionKind,
    TopologicalSpliceResult,
    GeometricRefinementResult,
    RingPlanDiagnostics,
} from './types';

/**
 * Classify the ring transition and validate invariants.
 *
 * Classification rules:
 * - unchanged:      no changed range on either side, geometry equal
 * - splice-replace: both prev and next have non-empty changed ranges
 * - splice-insert:  prev changed range is null/empty, next has points
 * - splice-delete:  prev changed range has points, next is null/empty
 * - fallback-snap:  invariants broken or degenerate case
 */
export function classifyRingTransitionKind(
    ringId: string,
    topo: TopologicalSpliceResult,
    geom: GeometricRefinementResult,
    prevTotalPoints: number,
    nextTotalPoints: number,
): RingPlanDiagnostics {
    const prevChangedLen = geom.prevChangedRange
        ? geom.prevChangedRange[1] - geom.prevChangedRange[0]
        : 0;
    const nextChangedLen = geom.nextChangedRange
        ? geom.nextChangedRange[1] - geom.nextChangedRange[0]
        : 0;
    const staticPrefixLen = geom.staticPrefixEnd;
    const staticSuffixLen = prevTotalPoints - geom.staticSuffixStart;
    const staticSamples = staticPrefixLen + staticSuffixLen;

    let kind: RingTransitionKind;
    let valid = true;
    let reason: string | undefined;

    // Classification
    if (prevChangedLen === 0 && nextChangedLen === 0) {
        if (geom.geomEqualOutsidePatch) {
            kind = 'unchanged';
        } else {
            // No topological change, no geometric change range found,
            // but geometry isn't equal — degenerate
            kind = 'fallback-snap';
            reason = 'no-change-range-but-geom-differs';
        }
    } else if (prevChangedLen > 0 && nextChangedLen > 0) {
        kind = 'splice-replace';
    } else if (prevChangedLen === 0 && nextChangedLen > 0) {
        kind = 'splice-insert';
    } else if (prevChangedLen > 0 && nextChangedLen === 0) {
        kind = 'splice-delete';
    } else {
        kind = 'fallback-snap';
        reason = 'unexpected-range-combination';
    }

    // Invariant checks
    if (kind === 'unchanged') {
        // No patch should exist
        if (prevChangedLen > 0 || nextChangedLen > 0) {
            valid = false;
            reason = 'unchanged-but-has-changed-range';
            kind = 'fallback-snap';
        }
    } else if (kind === 'splice-replace') {
        if (prevChangedLen <= 0 || nextChangedLen <= 0) {
            valid = false;
            reason = 'splice-replace-but-empty-range';
            kind = 'fallback-snap';
        }
    } else if (kind === 'splice-insert') {
        if (prevChangedLen !== 0) {
            valid = false;
            reason = 'splice-insert-but-prev-has-range';
            kind = 'fallback-snap';
        }
    } else if (kind === 'splice-delete') {
        if (nextChangedLen !== 0) {
            valid = false;
            reason = 'splice-delete-but-next-has-range';
            kind = 'fallback-snap';
        }
    }

    // staticCount + changedCount should = totalSamples (approximately, due to rounding)
    if (kind !== 'unchanged' && kind !== 'fallback-snap') {
        const computed = staticSamples + prevChangedLen;
        if (Math.abs(computed - prevTotalPoints) > 2) {
            // Allow small rounding error from resample mapping
            console.warn(
                `[RING INVARIANT] ring=${ringId} staticSamples(${staticSamples}) + prevChanged(${prevChangedLen}) = ${computed} ≠ prevTotal(${prevTotalPoints})`
            );
        }
    }

    const diag: RingPlanDiagnostics = {
        kind,
        rotation: topo.rotation,
        matchedSpansPrefix: topo.prefixLen,
        matchedSpansSuffix: topo.suffixLen,
        prevChangedSamples: prevChangedLen,
        nextChangedSamples: nextChangedLen,
        staticSamples,
        anchorsPrev: [geom.staticPrefixEnd, geom.staticSuffixStart],
        anchorsNext: geom.nextChangedRange
            ? [geom.nextChangedRange[0], geom.nextChangedRange[1]]
            : [0, 0],
        geomEqualOutsidePatch: geom.geomEqualOutsidePatch,
        valid,
        reason,
    };

    // Structured diagnostic log
    console.log(
        `[RING PLAN]\n` +
        `  ring=${ringId}\n` +
        `  kind=${kind}\n` +
        `  rotation=${topo.rotation}\n` +
        `  matchedSpansPrefix=${topo.prefixLen}\n` +
        `  matchedSpansSuffix=${topo.suffixLen}\n` +
        `  prevChangedSamples=${prevChangedLen}\n` +
        `  nextChangedSamples=${nextChangedLen}\n` +
        `  staticSamples=${staticSamples}\n` +
        `  anchorsPrev=[${geom.staticPrefixEnd},${geom.staticSuffixStart}]\n` +
        `  anchorsNext=[${geom.nextChangedRange?.[0] ?? '-'},${geom.nextChangedRange?.[1] ?? '-'}]\n` +
        `  geomEqualOutsidePatch=${geom.geomEqualOutsidePatch}\n` +
        `  valid=${valid}` +
        (reason ? `\n  reason=${reason}` : '')
    );

    return diag;
}
