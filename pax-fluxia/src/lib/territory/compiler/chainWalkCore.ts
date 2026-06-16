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

/** Complete result of the shared chain walk. */
export interface ChainWalkResult {
    /** All loops discovered by the walk */
    loops: ChainWalkLoop[];
    /** Parsed info for each polyline */
    polylineInfos: PolylineInfo[];
    /** Junction vertex map: ptKey → entries */
    junctionMap: Map<string, JunctionEntry[]>;
}

interface OwnerDirectedPolylineArc extends DirectedPlanarArc {
    ownerId: string;
    polylineIdx: number;
    direction: 'forward' | 'reverse';
    ownerPairKey: string;
    points: [number, number][];
    startVertexKey: string;
    endVertexKey: string;
}

interface WalkCandidate {
    loop: ChainWalkLoop;
    usedPolylineIds: Set<number>;
    nearClosed: boolean;
    areaMagnitude: number;
}

const LOOP_CLOSURE_TOLERANCE_PX = 6;

// ---------------------------------------------------------------------------
// Core chain walk
// ---------------------------------------------------------------------------

/**
 * Execute the chain walk on combined polylines, producing a rich
 * intermediate result. This is the single source of truth for loop
 * discovery — both legacy fills and canonical frontier maps derive
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

    const ownerArcs = new Map<string, OwnerDirectedPolylineArc[]>();
    const ownerStartArcs = new Map<string, Map<number, OwnerDirectedPolylineArc[]>>();
    function registerOwnerArc(arc: OwnerDirectedPolylineArc) {
        const ownerBucket = ownerArcs.get(arc.ownerId);
        if (ownerBucket) {
            ownerBucket.push(arc);
        } else {
            ownerArcs.set(arc.ownerId, [arc]);
        }
        let byPolyline = ownerStartArcs.get(arc.ownerId);
        if (!byPolyline) {
            byPolyline = new Map<number, OwnerDirectedPolylineArc[]>();
            ownerStartArcs.set(arc.ownerId, byPolyline);
        }
        const startBucket = byPolyline.get(arc.polylineIdx);
        if (startBucket) {
            startBucket.push(arc);
        } else {
            byPolyline.set(arc.polylineIdx, [arc]);
        }
    }

    for (const info of polylineInfos) {
        if (info.points.length < 2) continue;
        const forwardAngle = normalizePlanarAngle(
            Math.atan2(
                info.points[info.points.length - 1]![1] - info.points[0]![1],
                info.points[info.points.length - 1]![0] - info.points[0]![0],
            ),
        );
        const reversePoints = [...info.points].reverse();
        const reverseAngle = normalizePlanarAngle(forwardAngle + Math.PI);
        for (const ownerId of [info.ownerA, info.ownerB]) {
            if (!ownerId || ownerId === 'world') continue;
            registerOwnerArc({
                ownerId,
                polylineIdx: info.globalIdx,
                physicalIdx: info.globalIdx,
                fromKey: info.startKey,
                toKey: info.endKey,
                angle: forwardAngle,
                direction: 'forward',
                ownerPairKey: info.ownerPairKey,
                points: info.points,
                startVertexKey: info.startKey,
                endVertexKey: info.endKey,
            });
            registerOwnerArc({
                ownerId,
                polylineIdx: info.globalIdx,
                physicalIdx: info.globalIdx,
                fromKey: info.endKey,
                toKey: info.startKey,
                angle: reverseAngle,
                direction: 'reverse',
                ownerPairKey: info.ownerPairKey,
                points: reversePoints,
                startVertexKey: info.endKey,
                endVertexKey: info.startKey,
            });
        }
    }

    function buildSegment(arc: OwnerDirectedPolylineArc): ChainWalkSegment {
        return {
            polylineIdx: arc.polylineIdx,
            direction: arc.direction,
            startVertexKey: arc.startVertexKey,
            endVertexKey: arc.endVertexKey,
            ownerPairKey: arc.ownerPairKey,
            points: arc.points,
        };
    }

    function isNearClosedLoop(loop: ChainWalkLoop): boolean {
        const chain = flattenLoopPoints(loop);
        if (chain.length < 3) return false;
        const first = chain[0]!;
        const last = chain[chain.length - 1]!;
        return (
            Math.abs(first[0] - last[0]) <= LOOP_CLOSURE_TOLERANCE_PX &&
            Math.abs(first[1] - last[1]) <= LOOP_CLOSURE_TOLERANCE_PX
        );
    }

    function polygonAreaMagnitude(loop: ChainWalkLoop): number {
        const chain = flattenLoopPoints(loop);
        if (chain.length < 3) return 0;
        let area = 0;
        for (let index = 0; index < chain.length; index++) {
            const [ax, ay] = chain[index]!;
            const [bx, by] = chain[(index + 1) % chain.length]!;
            area += ax * by - bx * ay;
        }
        return Math.abs(area * 0.5);
    }

    function walkFromStartArc(params: {
        ownerId: string;
        startArc: OwnerDirectedPolylineArc;
        adjacency: ReadonlyMap<string, readonly OwnerDirectedPolylineArc[]>;
        remaining: ReadonlySet<number>;
    }): WalkCandidate {
        const usedPolylineIds = new Set<number>([params.startArc.physicalIdx]);
        const segments: ChainWalkSegment[] = [buildSegment(params.startArc)];
        const junctionVertexKeys: string[] = [params.startArc.startVertexKey];
        const headKey = params.startArc.startVertexKey;
        let currentArc = params.startArc;
        let tailKey = params.startArc.endVertexKey;
        let closed = false;
        let safety = Math.max(4, params.remaining.size * 2);

        while (safety-- > 0 && !closed) {
            if (segments.length >= 2 && tailKey === headKey) {
                closed = true;
                break;
            }
            const nextArc = pickClockwiseAdjacentArc({
                adjacency: params.adjacency,
                current: currentArc,
                isAvailable: (arc) =>
                    params.remaining.has(arc.physicalIdx) &&
                    !usedPolylineIds.has(arc.physicalIdx),
            });
            if (!nextArc) break;
            usedPolylineIds.add(nextArc.physicalIdx);
            segments.push(buildSegment(nextArc));
            junctionVertexKeys.push(nextArc.startVertexKey);
            currentArc = nextArc;
            tailKey = nextArc.endVertexKey;
        }

        const loop: ChainWalkLoop = {
            ownerId: params.ownerId,
            segments,
            junctionVertexKeys,
            closed,
        };
        return {
            loop,
            usedPolylineIds,
            nearClosed: isNearClosedLoop(loop),
            areaMagnitude: polygonAreaMagnitude(loop),
        };
    }

    function chooseBetterCandidate(
        current: WalkCandidate | null,
        next: WalkCandidate,
        requireClosed: boolean,
    ): WalkCandidate | null {
        const nextClosed = next.loop.closed || next.nearClosed;
        if (requireClosed && !nextClosed) return current;
        if (!current) return next;

        const currentClosed = current.loop.closed || current.nearClosed;
        if (nextClosed !== currentClosed) {
            return nextClosed ? next : current;
        }
        if (next.loop.segments.length !== current.loop.segments.length) {
            return next.loop.segments.length > current.loop.segments.length
                ? next
                : current;
        }
        if (Math.abs(next.areaMagnitude - current.areaMagnitude) > 0.001) {
            return next.areaMagnitude > current.areaMagnitude ? next : current;
        }
        if (next.usedPolylineIds.size !== current.usedPolylineIds.size) {
            return next.usedPolylineIds.size > current.usedPolylineIds.size
                ? next
                : current;
        }
        return current;
    }

    // --- Chain walk per owner ---
    const loops: ChainWalkLoop[] = [];

    for (const [ownerId, plIdxSet] of ownerPolylines) {
        const remaining = new Set<number>(plIdxSet);
        const adjacency = buildSortedOutgoingArcMap(
            ownerArcs.get(ownerId) ?? [],
        );
        const startArcMap = ownerStartArcs.get(ownerId) ?? new Map();

        while (remaining.size > 0) {
            let bestClosedCandidate: WalkCandidate | null = null;
            for (const startPlIdx of remaining) {
                for (const startArc of startArcMap.get(startPlIdx) ?? []) {
                    const candidate = walkFromStartArc({
                        ownerId,
                        startArc,
                        adjacency,
                        remaining,
                    });
                    bestClosedCandidate = chooseBetterCandidate(
                        bestClosedCandidate,
                        candidate,
                        true,
                    );
                }
            }
            if (!bestClosedCandidate) break;
            for (const polylineIdx of bestClosedCandidate.usedPolylineIds) {
                remaining.delete(polylineIdx);
            }
            if (bestClosedCandidate.loop.segments.length >= 1) {
                loops.push(bestClosedCandidate.loop);
            }
        }

        while (remaining.size > 0) {
            const startPlIdx = remaining.values().next().value as
                | number
                | undefined;
            if (startPlIdx === undefined) break;
            let bestCandidate: WalkCandidate | null = null;
            for (const startArc of startArcMap.get(startPlIdx) ?? []) {
                const candidate = walkFromStartArc({
                    ownerId,
                    startArc,
                    adjacency,
                    remaining,
                });
                bestCandidate = chooseBetterCandidate(
                    bestCandidate,
                    candidate,
                    false,
                );
            }
            if (!bestCandidate) {
                remaining.delete(startPlIdx);
                continue;
            }
            for (const polylineIdx of bestCandidate.usedPolylineIds) {
                remaining.delete(polylineIdx);
            }
            if (bestCandidate.loop.segments.length >= 1) {
                loops.push(bestCandidate.loop);
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
