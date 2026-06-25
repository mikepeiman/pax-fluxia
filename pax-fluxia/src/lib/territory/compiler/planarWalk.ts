// ---------------------------------------------------------------------------
// planarWalk.ts - Angle-sorted planar graph traversal helpers
// ---------------------------------------------------------------------------
// The power-voronoi geometry path builds boundary graphs where multiple
// candidate edges can meet at one vertex. Greedy "first unused edge" walks
// are order-dependent and can jump across a junction, producing bogus
// polylines or closure chords. These helpers instead walk the next edge
// adjacent to the reverse of the incoming edge in clockwise order.
// ---------------------------------------------------------------------------

export interface DirectedPlanarArc {
    physicalIdx: number;
    fromKey: string;
    toKey: string;
    angle: number;
}

const TAU = Math.PI * 2;

export function normalizePlanarAngle(angle: number): number {
    let normalized = angle % TAU;
    if (normalized < 0) normalized += TAU;
    return normalized;
}

export function buildSortedOutgoingArcMap<T extends DirectedPlanarArc>(
    arcs: readonly T[],
): Map<string, T[]> {
    const adjacency = new Map<string, T[]>();
    for (const arc of arcs) {
        const bucket = adjacency.get(arc.fromKey);
        if (bucket) {
            bucket.push(arc);
        } else {
            adjacency.set(arc.fromKey, [arc]);
        }
    }

    for (const bucket of adjacency.values()) {
        bucket.sort(
            (a, b) =>
                a.angle - b.angle ||
                a.physicalIdx - b.physicalIdx ||
                a.fromKey.localeCompare(b.fromKey) ||
                a.toKey.localeCompare(b.toKey),
        );
    }

    return adjacency;
}

function findReverseArcIndex<T extends DirectedPlanarArc>(
    outgoing: readonly T[],
    current: T,
): number {
    return outgoing.findIndex(
        (arc) =>
            arc.physicalIdx === current.physicalIdx &&
            arc.toKey === current.fromKey,
    );
}

function findClockwiseInsertionIndex<T extends DirectedPlanarArc>(
    outgoing: readonly T[],
    reverseAngle: number,
): number {
    let insertionIdx = outgoing.findIndex((arc) => arc.angle > reverseAngle);
    if (insertionIdx < 0) insertionIdx = 0;
    return insertionIdx;
}

export function pickClockwiseAdjacentArc<T extends DirectedPlanarArc>(params: {
    adjacency: ReadonlyMap<string, readonly T[]>;
    current: T;
    isAvailable: (arc: T) => boolean;
}): T | null {
    const outgoing = params.adjacency.get(params.current.toKey);
    if (!outgoing || outgoing.length === 0) return null;

    const reverseIdx = findReverseArcIndex(outgoing, params.current);
    if (reverseIdx >= 0) {
        for (let step = 1; step <= outgoing.length; step++) {
            const idx = (reverseIdx - step + outgoing.length) % outgoing.length;
            const candidate = outgoing[idx]!;
            if (params.isAvailable(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    // Fallback: if the exact reverse arc was filtered out before this stage,
    // approximate it from the incoming angle and keep walking clockwise.
    const reverseAngle = normalizePlanarAngle(params.current.angle + Math.PI);
    const insertionIdx = findClockwiseInsertionIndex(outgoing, reverseAngle);
    for (let step = 0; step < outgoing.length; step++) {
        const idx = (insertionIdx - 1 - step + outgoing.length) % outgoing.length;
        const candidate = outgoing[idx]!;
        if (params.isAvailable(candidate)) {
            return candidate;
        }
    }

    return null;
}
