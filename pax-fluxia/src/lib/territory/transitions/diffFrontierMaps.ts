// ---------------------------------------------------------------------------
// diffFrontierMaps.ts — Owner-Pair Polyline Diff
// ---------------------------------------------------------------------------
// Compares two TerritoryFrontierMaps by aggregating edges per owner-pair
// into concatenated polylines, then comparing by resampled RMS distance.
//
// This approach is IMMUNE to:
// - Edge count churn (4→1 edges per pair = same physical boundary)
// - ptKey jitter (junction vertices shift between frames)
// - Chain walk start-point variation
//
// The diff classifies each OWNER PAIR as:
// - unchanged: aggregate polyline RMS < threshold (copy verbatim)
// - modified:  aggregate polyline RMS > threshold (near conquest)
// - deleted:   pair only in prev
// - inserted:  pair only in next
//
// Layer: Transition (diff computation)
// Does NOT: render, import PIXI, modify geometry
// ---------------------------------------------------------------------------

import type { TerritoryFrontierMap, FrontierMapEdge } from '../compiler/frontierMapTypes';
import { log } from '$lib/utils/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PairDiffStatus = 'unchanged' | 'modified' | 'deleted' | 'inserted';

/** Result of diffing two TerritoryFrontierMaps at the owner-pair level. */
export interface FrontierMapDiff {
    /** Per-owner-pair classification */
    pairStatus: Map<string, PairDiffStatus>;

    /** Edges whose owner pair is classified as unchanged */
    unchangedEdgeIds: Set<string>;
    /** Edges whose owner pair is classified as modified */
    modifiedEdgeIds: Set<string>;
    /** Edges whose owner pair is classified as deleted (prev-only pair) */
    deletedEdgeIds: Set<string>;
    /** Edges whose owner pair is classified as inserted (next-only pair) */
    insertedEdgeIds: Set<string>;

    /** Vertices bordering modified/deleted/inserted edges */
    anchorVertexIds: Set<string>;
    /** Loop IDs containing at least one non-unchanged edge */
    affectedLoopIds: Set<string>;
    /** Whether the two maps are completely identical */
    identical: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the ownerPairKey from an edge ID.
 * Edge ID format: "startVertexKey->endVertexKey:ownerPairKey"
 */
function extractOwnerPairKey(edgeId: string): string {
    const arrowIdx = edgeId.indexOf('->');
    const colonIdx = edgeId.indexOf(':', arrowIdx);
    if (arrowIdx < 0 || colonIdx < 0) return edgeId;
    return edgeId.substring(colonIdx + 1);
}

/**
 * Distance squared between two points.
 */
function dist2(a: [number, number], b: [number, number]): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return dx * dx + dy * dy;
}

/**
 * Resample a polyline to N equally-spaced points along arc length.
 */
function resampleToFixed(pts: [number, number][], n: number): [number, number][] {
    if (pts.length === 0) return [];
    if (pts.length === 1) return Array(n).fill(pts[0]);
    if (n <= 1) return [pts[0]];

    // Compute cumulative arc lengths
    const cumLen = [0];
    for (let i = 1; i < pts.length; i++) {
        const dx = pts[i][0] - pts[i - 1][0];
        const dy = pts[i][1] - pts[i - 1][1];
        cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const totalLen = cumLen[cumLen.length - 1];
    if (totalLen < 1e-6) return Array(n).fill(pts[0]);

    const result: [number, number][] = [];
    let segIdx = 0;

    for (let si = 0; si < n; si++) {
        const targetLen = (si / (n - 1)) * totalLen;
        // Advance segIdx to the segment containing targetLen
        while (segIdx < cumLen.length - 2 && cumLen[segIdx + 1] < targetLen) {
            segIdx++;
        }
        const segStart = cumLen[segIdx];
        const segEnd = cumLen[segIdx + 1];
        const segLen = segEnd - segStart;
        const t = segLen > 1e-8 ? (targetLen - segStart) / segLen : 0;
        result.push([
            pts[segIdx][0] + t * (pts[segIdx + 1][0] - pts[segIdx][0]),
            pts[segIdx][1] + t * (pts[segIdx + 1][1] - pts[segIdx][1]),
        ]);
    }
    return result;
}

/**
 * Compute RMS distance between two resampled polylines.
 * Checks both forward and reverse orientations.
 */
function computeResampledRMS(
    ptsA: [number, number][],
    ptsB: [number, number][],
    numSamples: number = 32,
): number {
    const a = resampleToFixed(ptsA, numSamples);
    const b = resampleToFixed(ptsB, numSamples);

    if (a.length === 0 || b.length === 0) return Infinity;

    // Forward RMS
    let fwdSum = 0;
    for (let i = 0; i < numSamples; i++) {
        fwdSum += dist2(a[i], b[i]);
    }
    const fwdRms = Math.sqrt(fwdSum / numSamples);

    // Reverse RMS (polyline traversed in opposite direction)
    let revSum = 0;
    for (let i = 0; i < numSamples; i++) {
        revSum += dist2(a[i], b[numSamples - 1 - i]);
    }
    const revRms = Math.sqrt(revSum / numSamples);

    return Math.min(fwdRms, revRms);
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

interface AggregatedPairPolyline {
    pairKey: string;
    points: [number, number][];
    edgeIds: string[];
}

/**
 * Aggregate all edges per owner-pair into concatenated polylines.
 * Edges are collected from loop traversal order to maintain chain ordering.
 */
function aggregatePairPolylines(tmap: TerritoryFrontierMap): Map<string, AggregatedPairPolyline> {
    const result = new Map<string, AggregatedPairPolyline>();

    for (const loop of tmap.loops) {
        for (const edgeId of loop.edgeIds) {
            const edge = tmap.edges.get(edgeId);
            if (!edge) continue;
            const opk = extractOwnerPairKey(edgeId);

            if (!result.has(opk)) {
                result.set(opk, { pairKey: opk, points: [], edgeIds: [] });
            }
            const agg = result.get(opk)!;
            // Append points, skip first point if continuing chain (avoid duplicates)
            if (agg.points.length > 0 && edge.curvePoints.length > 0) {
                for (let i = 1; i < edge.curvePoints.length; i++) {
                    agg.points.push(edge.curvePoints[i]);
                }
            } else {
                for (const pt of edge.curvePoints) {
                    agg.points.push(pt);
                }
            }
            agg.edgeIds.push(edgeId);
        }
    }

    return result;
}

// ---------------------------------------------------------------------------
// Main differ
// ---------------------------------------------------------------------------

const RMS_UNCHANGED_THRESHOLD = 3.0; // px — below this, pair is static

/**
 * Diff two TerritoryFrontierMaps at the owner-pair polyline level.
 *
 * Strategy:
 * 1. Aggregate edges per ownerPairKey into concatenated polylines
 * 2. For matching pairs: resample + RMS → unchanged vs modified
 * 3. Pairs only in prev → deleted, only in next → inserted
 * 4. Back-propagate pair status to individual edge IDs
 */
export function diffFrontierMaps(
    prev: TerritoryFrontierMap,
    next: TerritoryFrontierMap,
): FrontierMapDiff {
    const pairStatus = new Map<string, PairDiffStatus>();
    const unchangedEdgeIds = new Set<string>();
    const modifiedEdgeIds = new Set<string>();
    const deletedEdgeIds = new Set<string>();
    const insertedEdgeIds = new Set<string>();
    const anchorVertexIds = new Set<string>();
    const affectedLoopIds = new Set<string>();

    // Step 1: Aggregate
    const prevPairs = aggregatePairPolylines(prev);
    const nextPairs = aggregatePairPolylines(next);

    // Step 2: Compare matching pairs
    const matchedNextKeys = new Set<string>();

    for (const [pairKey, prevPoly] of prevPairs) {
        const nextPoly = nextPairs.get(pairKey);

        if (!nextPoly) {
            // Pair deleted
            pairStatus.set(pairKey, 'deleted');
            for (const eid of prevPoly.edgeIds) {
                deletedEdgeIds.add(eid);
                const edge = prev.edges.get(eid);
                if (edge) {
                    anchorVertexIds.add(edge.startVertexId);
                    anchorVertexIds.add(edge.endVertexId);
                }
            }
            log.sys('TMAP-Diff', `  pair=${pairKey}: DELETED prev=${prevPoly.edgeIds.length}edges/${prevPoly.points.length}pts`);
            continue;
        }

        matchedNextKeys.add(pairKey);

        // Compare by resampled RMS
        const rms = computeResampledRMS(prevPoly.points, nextPoly.points, 32);

        if (rms < RMS_UNCHANGED_THRESHOLD) {
            pairStatus.set(pairKey, 'unchanged');
            // ALL edges in this pair → unchanged
            for (const eid of prevPoly.edgeIds) {
                unchangedEdgeIds.add(eid);
            }
        } else {
            pairStatus.set(pairKey, 'modified');
            // ALL edges in this pair → modified
            for (const eid of prevPoly.edgeIds) {
                modifiedEdgeIds.add(eid);
                const edge = prev.edges.get(eid);
                if (edge) {
                    anchorVertexIds.add(edge.startVertexId);
                    anchorVertexIds.add(edge.endVertexId);
                }
            }
            log.sys('TMAP-Diff', `  pair=${pairKey}: MODIFIED rms=${rms.toFixed(1)} prev=${prevPoly.edgeIds.length}edges/${prevPoly.points.length}pts next=${nextPoly.edgeIds.length}edges/${nextPoly.points.length}pts`);
        }
    }

    // Step 3: Pairs only in next → inserted
    for (const [pairKey, nextPoly] of nextPairs) {
        if (!matchedNextKeys.has(pairKey)) {
            pairStatus.set(pairKey, 'inserted');
            for (const eid of nextPoly.edgeIds) {
                insertedEdgeIds.add(eid);
                const edge = next.edges.get(eid);
                if (edge) {
                    anchorVertexIds.add(edge.startVertexId);
                    anchorVertexIds.add(edge.endVertexId);
                }
            }
            log.sys('TMAP-Diff', `  pair=${pairKey}: INSERTED next=${nextPoly.edgeIds.length}edges/${nextPoly.points.length}pts`);
        }
    }

    // Step 4: Find affected loops
    const changedPairKeys = new Set<string>();
    for (const [pk, status] of pairStatus) {
        if (status !== 'unchanged') changedPairKeys.add(pk);
    }

    for (const loop of prev.loops) {
        for (const eid of loop.edgeIds) {
            const opk = extractOwnerPairKey(eid);
            if (changedPairKeys.has(opk)) {
                affectedLoopIds.add(loop.loopId);
                break;
            }
        }
    }
    for (const loop of next.loops) {
        for (const eid of loop.edgeIds) {
            const opk = extractOwnerPairKey(eid);
            if (changedPairKeys.has(opk)) {
                affectedLoopIds.add(loop.loopId);
                break;
            }
        }
    }

    const identical = modifiedEdgeIds.size === 0 &&
        deletedEdgeIds.size === 0 &&
        insertedEdgeIds.size === 0;

    // Summary counts
    const unchangedPairs = [...pairStatus.values()].filter(s => s === 'unchanged').length;
    const modifiedPairs = [...pairStatus.values()].filter(s => s === 'modified').length;
    const deletedPairs = [...pairStatus.values()].filter(s => s === 'deleted').length;
    const insertedPairs = [...pairStatus.values()].filter(s => s === 'inserted').length;

    log.sys('TMAP-Diff',
        `PAIRS: unchanged=${unchangedPairs} modified=${modifiedPairs} ` +
        `deleted=${deletedPairs} inserted=${insertedPairs} ` +
        `affectedLoops=${affectedLoopIds.size} identical=${identical}`
    );

    return {
        pairStatus,
        unchangedEdgeIds,
        modifiedEdgeIds,
        deletedEdgeIds,
        insertedEdgeIds,
        anchorVertexIds,
        affectedLoopIds,
        identical,
    };
}
