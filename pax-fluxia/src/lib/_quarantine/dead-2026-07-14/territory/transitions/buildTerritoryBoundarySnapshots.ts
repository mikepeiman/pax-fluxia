// ---------------------------------------------------------------------------
// Build transition-ready boundary snapshots from TerritoryGeometryData.
// ---------------------------------------------------------------------------
// Converts each MergedTerritory into a BoundaryRingSnapshot with span metadata
// derived from SharedPolyline + WorldBorderPolyline ownership info.
// ---------------------------------------------------------------------------

import type {
    TerritoryGeometryData,
    MergedTerritory,
    SharedPolyline,
} from '$lib/territory/compiler/powerVoronoiTerritoryGeometryGenerator';

import type {
    Vec2,
    BoundarySpan,
    BoundaryRingSnapshot,
    TerritoryBoundarySnapshot,
} from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ptKeySnap(x: number, y: number): string {
    return `${+x.toFixed(1)},${+y.toFixed(1)}`;
}

function toVec2(pt: [number, number]): Vec2 {
    return { x: pt[0], y: pt[1] };
}

/**
 * Normalize ring start: rotate points so the lowest-x (then lowest-y) vertex
 * is first. This ensures consistent starting position across geometry rebuilds
 * even when constructFillsFromFrontierChain picks different starting polylines.
 */
function normalizeRingStart(points: Vec2[]): Vec2[] {
    if (points.length < 3) return points;
    let minIdx = 0;
    for (let i = 1; i < points.length; i++) {
        if (points[i].x < points[minIdx].x ||
            (points[i].x === points[minIdx].x && points[i].y < points[minIdx].y)) {
            minIdx = i;
        }
    }
    if (minIdx === 0) return points;
    return [...points.slice(minIdx), ...points.slice(0, minIdx)];
}

/**
 * Generate a stable territory ID from sorted starIds.
 * Unlike array index, this is consistent across geometry rebuilds.
 */
function stableTerritoryId(ownerId: string, starIds: string[]): string {
    return `${ownerId}:${[...starIds].sort().join(',')}`;
}

function computeCumulativeLengths(points: Vec2[]): number[] {
    const cumLen: number[] = [0];
    for (let i = 1; i < points.length; i++) {
        const dx = points[i].x - points[i - 1].x;
        const dy = points[i].y - points[i - 1].y;
        cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    return cumLen;
}

/**
 * Parse ownerPairKey ("A|B" or "owner|world") into left/right owners.
 * Returns [leftOwnerId, rightOwnerId] where rightOwnerId is null for world borders.
 */
function parseOwnerPairKey(key: string): [string, string | null] {
    const [a, b] = key.split('|');
    return [a, b === 'world' ? null : b];
}

// ---------------------------------------------------------------------------
// Span mapping: match ring vertex runs to source polylines
// ---------------------------------------------------------------------------

interface PolylineEndpoint {
    polylineIdx: number;
    ownerPairKey: string;
    points: [number, number][];
}

/**
 * Build a lookup: ptKey → list of polylines starting/ending there.
 */
function buildPolylineEndpointIndex(
    sharedPolylines: SharedPolyline[],
    worldBorderPolylines: SharedPolyline[],
): Map<string, PolylineEndpoint[]> {
    const index = new Map<string, PolylineEndpoint[]>();
    const allPolylines = [...sharedPolylines, ...worldBorderPolylines];

    for (let i = 0; i < allPolylines.length; i++) {
        const pl = allPolylines[i];
        const pts = pl.points;
        if (pts.length < 2) continue;

        const entry: PolylineEndpoint = {
            polylineIdx: i,
            ownerPairKey: pl.ownerPairKey,
            points: pts,
        };

        // Index by both endpoints AND all interior points
        for (let j = 0; j < pts.length; j++) {
            const key = ptKeySnap(pts[j][0], pts[j][1]);
            let arr = index.get(key);
            if (!arr) { arr = []; index.set(key, arr); }
            arr.push(entry);
        }
    }
    return index;
}

/**
 * For a ring vertex, find which polyline it belongs to and return its ownerPairKey.
 * Returns null if no matching polyline found.
 */
function findPolylineForVertex(
    x: number, y: number,
    polylineIndex: Map<string, PolylineEndpoint[]>,
): string | null {
    const key = ptKeySnap(x, y);
    const entries = polylineIndex.get(key);
    if (!entries || entries.length === 0) return null;
    // Return the first match — vertices shared between polylines will resolve
    // to one of them, which is fine for span identity
    return entries[0].ownerPairKey;
}

/**
 * Build BoundarySpans for a ring by assigning each vertex to its source polyline.
 * Consecutive vertices with the same ownerPairKey form one span.
 */
function buildSpansForRing(
    points: Vec2[],
    polylineIndex: Map<string, PolylineEndpoint[]>,
    ringId: string,
): BoundarySpan[] {
    if (points.length < 3) return [];

    const spans: BoundarySpan[] = [];
    let currentKey: string | null = null;
    let spanStart = 0;
    let spanCounter = 0;

    for (let i = 0; i < points.length; i++) {
        const ownerKey = findPolylineForVertex(points[i].x, points[i].y, polylineIndex);
        const resolvedKey = ownerKey ?? '__unmatched__';

        if (resolvedKey !== currentKey) {
            // Close previous span if any
            if (currentKey !== null && i > spanStart) {
                const [left, right] = currentKey === '__unmatched__'
                    ? ['__unknown__', null as string | null]
                    : parseOwnerPairKey(currentKey);
                spans.push({
                    spanId: `${ringId}:span${spanCounter++}`,
                    startSample: spanStart,
                    endSample: i,
                    leftOwnerId: left,
                    rightOwnerId: right,
                    sharedKey: currentKey === '__unmatched__' ? undefined : currentKey,
                });
            }
            currentKey = resolvedKey;
            spanStart = i;
        }
    }

    // Close final span
    if (currentKey !== null && points.length > spanStart) {
        const [left, right] = currentKey === '__unmatched__'
            ? ['__unknown__', null as string | null]
            : parseOwnerPairKey(currentKey);
        spans.push({
            spanId: `${ringId}:span${spanCounter}`,
            startSample: spanStart,
            endSample: points.length,
            leftOwnerId: left,
            rightOwnerId: right,
            sharedKey: currentKey === '__unmatched__' ? undefined : currentKey,
        });
    }

    return spans;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Convert TerritoryGeometryData into transition-ready BoundarySnapshots.
 *
 * Each MergedTerritory becomes a TerritoryBoundarySnapshot with:
 * - Ring points converted to Vec2
 * - Cumulative arc lengths
 * - BoundarySpans derived from source polyline ownership
 */
export function buildTerritoryBoundarySnapshots(
    geom: TerritoryGeometryData,
): TerritoryBoundarySnapshot[] {
    const { mergedTerritories, sharedPolylines, worldBorderPolylines, enclaveMap, fingerprint } = geom;

    // Build polyline vertex index for span mapping
    const polylineIndex = buildPolylineEndpointIndex(sharedPolylines, worldBorderPolylines);

    const snapshots: TerritoryBoundarySnapshot[] = [];

    for (let tIdx = 0; tIdx < mergedTerritories.length; tIdx++) {
        const mt = mergedTerritories[tIdx];
        const rings: BoundaryRingSnapshot[] = [];

        // Outer ring — normalize start vertex for cross-frame consistency
        const stableId = stableTerritoryId(mt.ownerId, mt.starIds);
        const outerRingId = `${stableId}:outer`;
        const outerPoints = normalizeRingStart(mt.points.map(toVec2));
        const outerSpans = buildSpansForRing(outerPoints, polylineIndex, outerRingId);

        rings.push({
            ringId: outerRingId,
            kind: 'outer',
            points: outerPoints,
            cumulativeLengths: computeCumulativeLengths(outerPoints),
            spans: outerSpans,
        });

        // Hole rings (from enclaveMap)
        const holes = enclaveMap.get(tIdx);
        if (holes) {
            for (let hIdx = 0; hIdx < holes.length; hIdx++) {
                const holeRingId = `${stableId}:hole${hIdx}`;
                const holePoints = holes[hIdx].map(toVec2);
                const holeSpans = buildSpansForRing(holePoints, polylineIndex, holeRingId);

                rings.push({
                    ringId: holeRingId,
                    kind: 'hole',
                    points: holePoints,
                    cumulativeLengths: computeCumulativeLengths(holePoints),
                    spans: holeSpans,
                });
            }
        }

        snapshots.push({
            territoryId: stableId,
            ownerId: mt.ownerId,
            starIds: mt.starIds,
            rings,
            fingerprint,
        });
    }

    return snapshots;
}
