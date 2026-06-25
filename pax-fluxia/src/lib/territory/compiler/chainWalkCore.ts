// ---------------------------------------------------------------------------
// chainWalkCore.ts — Shared Internal Chain-Walk Builder
// ---------------------------------------------------------------------------
// Extracts the core chain-walk logic from constructFillsFromFrontierChain
// into a reusable builder. Both the legacy MergedTerritory[] output and the
// new TerritoryFrontierMap output derive from this single walk result.
//
// Layer: Geometry (compiler internal)
// Does NOT: render, import PIXI, mutate inputs
// ---------------------------------------------------------------------------

import {
    buildSortedOutgoingArcMap,
    normalizePlanarAngle,
    pickClockwiseAdjacentArc,
    type DirectedPlanarArc,
} from './planarWalk';

export interface SharedPolylineLike {
    points: [number, number][];
    ownerPairKey: string;
    color: number;
}

export function ptKey(x: number, y: number): string {
    return `${+x.toFixed(2)},${+y.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Types — chain walk intermediate result
// ---------------------------------------------------------------------------

/** Info parsed from one polyline (shared or world-border). */
export interface PolylineInfo {
    points: [number, number][];
    ownerA: string;
    ownerB: string;
    ownerPairKey: string;
    startKey: string;
    endKey: string;
    /** Index in the combined (shared + world) polyline array */
    globalIdx: number;
}

/** One segment in a chain walk — one polyline traversal. */
export interface ChainWalkSegment {
    /** Index into the combined polyline array */
    polylineIdx: number;
    /** Which direction this polyline was traversed */
    direction: 'forward' | 'reverse';
    /** ptKey of the vertex where this segment starts in the walk */
    startVertexKey: string;
    /** ptKey of the vertex where this segment ends in the walk */
    endVertexKey: string;
    /** Owner pair key from the source polyline */
    ownerPairKey: string;
    /** The actual points for this segment (reversed if direction='reverse') */
    points: [number, number][];
}

/** One complete loop from the chain walk. */
export interface ChainWalkLoop {
    /** Owner this loop belongs to */
    ownerId: string;
    /** Ordered segments forming this loop */
    segments: ChainWalkSegment[];
    /** Ordered vertex keys at segment junctions */
    junctionVertexKeys: string[];
    /** Whether the chain walk closed successfully */
    closed: boolean;
}

/** Junction entry: which polyline and which end touches a vertex. */
interface JunctionEntry {
    plIdx: number;
    end: 'start' | 'end';
}

interface ChainWalkArc extends DirectedPlanarArc {
    direction: 'forward' | 'reverse';
}

/** Complete result of the shared chain walk. */
export interface ChainWalkResult {
    /** All loops discovered by the walk */
    loops: ChainWalkLoop[];
    /** Parsed info for each polyline */
    polylineInfos: PolylineInfo[];
    /** Junction vertex map: ptKey → entries */
    junctionMap: Map<string, JunctionEntry[]>;
}

// ---------------------------------------------------------------------------
// Core chain walk
// ---------------------------------------------------------------------------

function traversalKey(polylineIdx: number, direction: 'forward' | 'reverse'): string {
    return `${polylineIdx}:${direction}`;
}

function endpointTangentAngle(
    points: readonly [number, number][],
    direction: 'forward' | 'reverse',
): number {
    if (direction === 'forward') {
        const [fromX, fromY] = points[0]!;
        for (let i = 1; i < points.length; i++) {
            const [toX, toY] = points[i]!;
            if (toX !== fromX || toY !== fromY) {
                return normalizePlanarAngle(Math.atan2(toY - fromY, toX - fromX));
            }
        }
    } else {
        const [fromX, fromY] = points[points.length - 1]!;
        for (let i = points.length - 2; i >= 0; i--) {
            const [toX, toY] = points[i]!;
            if (toX !== fromX || toY !== fromY) {
                return normalizePlanarAngle(Math.atan2(toY - fromY, toX - fromX));
            }
        }
    }

    return 0;
}

/**
 * Execute the chain walk on combined polylines, producing a rich
 * intermediate result. This is the single source of truth for loop
 * discovery — both legacy fills and vector frontier maps derive
 * from this result.
 *
 * The algorithm mirrors the original constructFillsFromFrontierChain
 * exactly, preserving its closure detection, junction traversal,
 * and per-owner grouping logic.
 *
 * @param sharedPolylines       Chaikin-smoothed owner-owner border polylines
 * @param worldBorderPolylines  World-boundary edge polylines
 */
export function executeChainWalk(
    sharedPolylines: SharedPolylineLike[],
    worldBorderPolylines: SharedPolylineLike[],
): ChainWalkResult {
    // Combine all polylines for uniform indexing (same as original)
    const allPolylines = [...sharedPolylines, ...worldBorderPolylines];
    const N = allPolylines.length;

    if (N === 0) {
        return { loops: [], polylineInfos: [], junctionMap: new Map() };
    }

    // --- Parse polyline info ---
    const polylineInfos: PolylineInfo[] = allPolylines.map((pl, idx) => {
        const [a, b] = pl.ownerPairKey.split('|');
        const pts = pl.points;
        return {
            points: pts,
            ownerA: a,
            ownerB: b,
            ownerPairKey: pl.ownerPairKey,
            startKey: ptKey(pts[0][0], pts[0][1]),
            endKey: ptKey(pts[pts.length - 1][0], pts[pts.length - 1][1]),
            globalIdx: idx,
        };
    });

    // --- Build junction vertex map ---
    const junctionMap = new Map<string, JunctionEntry[]>();
    function addJunction(key: string, plIdx: number, end: 'start' | 'end') {
        if (!junctionMap.has(key)) junctionMap.set(key, []);
        junctionMap.get(key)!.push({ plIdx, end });
    }
    for (let i = 0; i < N; i++) {
        if (polylineInfos[i].points.length < 2) continue;
        addJunction(polylineInfos[i].startKey, i, 'start');
        addJunction(polylineInfos[i].endKey, i, 'end');
    }

    const directedArcs: ChainWalkArc[] = [];
    const directedArcByTraversal = new Map<string, ChainWalkArc>();
    for (let i = 0; i < N; i++) {
        const info = polylineInfos[i]!;
        if (info.points.length < 2) continue;

        const forwardArc: ChainWalkArc = {
            physicalIdx: i,
            fromKey: info.startKey,
            toKey: info.endKey,
            angle: endpointTangentAngle(info.points, 'forward'),
            direction: 'forward',
        };
        const reverseArc: ChainWalkArc = {
            physicalIdx: i,
            fromKey: info.endKey,
            toKey: info.startKey,
            angle: endpointTangentAngle(info.points, 'reverse'),
            direction: 'reverse',
        };

        directedArcs.push(forwardArc, reverseArc);
        directedArcByTraversal.set(traversalKey(i, 'forward'), forwardArc);
        directedArcByTraversal.set(traversalKey(i, 'reverse'), reverseArc);
    }
    const outgoingArcMap = buildSortedOutgoingArcMap(directedArcs);

    // --- Collect polylines per owner ---
    const ownerPolylines = new Map<string, Set<number>>();
    for (let i = 0; i < N; i++) {
        if (polylineInfos[i].points.length < 2) continue;
        const { ownerA, ownerB } = polylineInfos[i];
        for (const owner of [ownerA, ownerB]) {
            if (!owner || owner === 'world') continue;
            if (!ownerPolylines.has(owner)) ownerPolylines.set(owner, new Set());
            ownerPolylines.get(owner)!.add(i);
        }
    }

    // --- Chain walk per owner ---
    const loops: ChainWalkLoop[] = [];

    for (const [ownerId, plIdxSet] of ownerPolylines) {
        const ownerUsed = new Set<number>();

        for (const startPlIdx of plIdxSet) {
            if (ownerUsed.has(startPlIdx)) continue;
            ownerUsed.add(startPlIdx);

            const startInfo = polylineInfos[startPlIdx];
            const segments: ChainWalkSegment[] = [];
            const junctionKeys: string[] = [];

            // First segment: always forward
            const firstArc = directedArcByTraversal.get(
                traversalKey(startPlIdx, 'forward'),
            );
            if (!firstArc) continue;
            let currentArc: ChainWalkArc = firstArc;

            segments.push({
                polylineIdx: startPlIdx,
                direction: 'forward',
                startVertexKey: startInfo.startKey,
                endVertexKey: startInfo.endKey,
                ownerPairKey: startInfo.ownerPairKey,
                points: startInfo.points,
            });
            junctionKeys.push(startInfo.startKey);

            let tailKey = startInfo.endKey;
            const headKey = startInfo.startKey;
            let safety = N * 2;
            let closed = false;

            while (safety-- > 0 && !closed) {
                // Closure check (same threshold as original: length >= 4 points equivalent)
                if (segments.length >= 2 && tailKey === headKey) {
                    closed = true;
                    break;
                }

                const candidates = junctionMap.get(tailKey);
                if (!candidates) break;

                const nextArc: ChainWalkArc | null = pickClockwiseAdjacentArc({
                    adjacency: outgoingArcMap,
                    current: currentArc,
                    isAvailable: (arc) => {
                        if (ownerUsed.has(arc.physicalIdx)) return false;
                        const ci = polylineInfos[arc.physicalIdx];
                        return ci.ownerA === ownerId || ci.ownerB === ownerId;
                    },
                });

                if (!nextArc) break;

                ownerUsed.add(nextArc.physicalIdx);
                const ci = polylineInfos[nextArc.physicalIdx];
                if (nextArc.direction === 'forward') {
                    segments.push({
                        polylineIdx: nextArc.physicalIdx,
                        direction: 'forward',
                        startVertexKey: ci.startKey,
                        endVertexKey: ci.endKey,
                        ownerPairKey: ci.ownerPairKey,
                        points: ci.points,
                    });
                    junctionKeys.push(ci.startKey);
                } else {
                    segments.push({
                        polylineIdx: nextArc.physicalIdx,
                        direction: 'reverse',
                        startVertexKey: ci.endKey,
                        endVertexKey: ci.startKey,
                        ownerPairKey: ci.ownerPairKey,
                        points: [...ci.points].reverse(),
                    });
                    junctionKeys.push(ci.endKey);
                }
                tailKey = nextArc.toKey;
                currentArc = nextArc;
            }

            // Accept loops with at least 2 segments (mirrors original chain.length >= 3)
            if (segments.length >= 1) {
                loops.push({
                    ownerId,
                    segments,
                    junctionVertexKeys: junctionKeys,
                    closed,
                });
            }
        }
    }

    return { loops, polylineInfos, junctionMap };
}

// ---------------------------------------------------------------------------
// Legacy output derivation
// ---------------------------------------------------------------------------

/**
 * Flatten a ChainWalkLoop into a single point array for legacy
 * MergedTerritory consumption. Mirrors the original concatenation
 * logic: first segment's points verbatim, subsequent segments skip
 * their first point (it's a duplicate of the previous segment's last).
 */
export function flattenLoopPoints(loop: ChainWalkLoop): [number, number][] {
    const chain: [number, number][] = [];
    for (let i = 0; i < loop.segments.length; i++) {
        const seg = loop.segments[i];
        if (i === 0) {
            // First segment: all points
            for (const pt of seg.points) {
                chain.push(pt);
            }
        } else {
            // Subsequent segments: skip first point (duplicate of tail)
            for (let j = 1; j < seg.points.length; j++) {
                chain.push(seg.points[j]);
            }
        }
    }
    return chain;
}
