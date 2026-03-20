// ---------------------------------------------------------------------------
// Create territory transition plans using proximity-based detection.
// ---------------------------------------------------------------------------
// Instead of matching spans by identity (fragile), this uses the conquest
// origin to geometrically detect which points are stationary vs changed:
//   1. Align both rings at the conquest-nearest point
//   2. Resample to equal N points
//   3. Per-point displacement check → static mask
//   4. Static points copy from prev; changed points interpolate
// ---------------------------------------------------------------------------

import type {
    Vec2,
    TerritoryBoundarySnapshot,
    TerritoryDeltaContext,
    BoundaryRingSnapshot,
    AnimatedRingPlan,
    TerritoryBoundaryTransitionPlan,
    TerritoryTransitionPlanSet,
} from './types';

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

function nearestPointIndex(pts: Vec2[], target: Vec2): number {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
        const dx = pts[i].x - target.x;
        const dy = pts[i].y - target.y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    return bestIdx;
}

function rotateArray(pts: Vec2[], startIdx: number): Vec2[] {
    if (startIdx === 0 || pts.length === 0) return pts;
    const idx = ((startIdx % pts.length) + pts.length) % pts.length;
    return [...pts.slice(idx), ...pts.slice(0, idx)];
}

/**
 * Resample a closed ring to exactly N equidistant points along arc length.
 * Treats the ring as closed (last point connects back to first).
 */
function resampleClosedRing(pts: Vec2[], n: number): Vec2[] {
    if (pts.length < 3 || n < 3) return [...pts];

    // Close the ring for arc-length computation
    const closed = [...pts, pts[0]];

    // Compute cumulative arc lengths
    const cumLen: number[] = [0];
    for (let i = 1; i < closed.length; i++) {
        const dx = closed[i].x - closed[i - 1].x;
        const dy = closed[i].y - closed[i - 1].y;
        cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const totalLen = cumLen[cumLen.length - 1];
    if (totalLen < 1e-6) return [...pts];

    // Sample N equidistant points (ring is periodic: j/N, not j/(N-1))
    const result: Vec2[] = [];
    for (let j = 0; j < n; j++) {
        const targetLen = (j / n) * totalLen;

        let segIdx = 0;
        while (segIdx < cumLen.length - 2 && cumLen[segIdx + 1] < targetLen) {
            segIdx++;
        }

        const segStart = cumLen[segIdx];
        const segEnd = cumLen[segIdx + 1];
        const segFrac = (segEnd - segStart) > 1e-6
            ? (targetLen - segStart) / (segEnd - segStart)
            : 0;

        result.push({
            x: closed[segIdx].x + (closed[segIdx + 1].x - closed[segIdx].x) * segFrac,
            y: closed[segIdx].y + (closed[segIdx + 1].y - closed[segIdx].y) * segFrac,
        });
    }
    return result;
}

// ---------------------------------------------------------------------------
// Proximity-based ring plan builder
// ---------------------------------------------------------------------------

/** Displacement threshold in pixels. Points within this distance are "static". */
const STATIC_EPSILON = 5.0;

/**
 * Build an animated ring plan using proximity-based detection.
 *
 * Both rings are rotated so the conquest-nearest point is at index 0,
 * resampled to equal N points, then each point is classified as static
 * (displacement < epsilon) or dynamic (displacement >= epsilon).
 *
 * The "quiet zone" (farthest from conquest) is at index N/2.
 * We grow the static region from N/2 outward until points diverge.
 */
function buildProximityRingPlan(
    prevRing: BoundaryRingSnapshot,
    nextRing: BoundaryRingSnapshot,
    conquestOrigin: Vec2,
    sampleCount: number,
): AnimatedRingPlan {
    const prevPts = prevRing.points;
    const nextPts = nextRing.points;

    // 1. Find nearest point to conquest on each ring
    const prevNearIdx = nearestPointIndex(prevPts, conquestOrigin);
    const nextNearIdx = nearestPointIndex(nextPts, conquestOrigin);

    // 2. Rotate both so conquest-nearest is at index 0
    const prevRotated = rotateArray(prevPts, prevNearIdx);
    const nextRotated = rotateArray(nextPts, nextNearIdx);

    // 3. Resample both to equal N
    const N = Math.max(sampleCount, Math.max(prevRotated.length, nextRotated.length), 64);
    const prevSampled = resampleClosedRing(prevRotated, N);
    const targetSampled = resampleClosedRing(nextRotated, N);

    // 4. Build static mask — grow from the quiet zone (N/2) outward
    const halfN = Math.floor(N / 2);
    const isStaticMask: boolean[] = new Array(N).fill(false);
    const eps2 = STATIC_EPSILON * STATIC_EPSILON;

    // Check if the quiet zone itself is static
    {
        const dx = prevSampled[halfN].x - targetSampled[halfN].x;
        const dy = prevSampled[halfN].y - targetSampled[halfN].y;
        if (dx * dx + dy * dy <= eps2) {
            isStaticMask[halfN] = true;
        }
    }

    if (isStaticMask[halfN]) {
        // Expand backward from N/2 toward 0 (toward conquest)
        for (let i = halfN - 1; i >= 0; i--) {
            const dx = prevSampled[i].x - targetSampled[i].x;
            const dy = prevSampled[i].y - targetSampled[i].y;
            if (dx * dx + dy * dy > eps2) break;
            isStaticMask[i] = true;
        }

        // Expand forward from N/2 toward N-1 (toward conquest from other side)
        for (let i = halfN + 1; i < N; i++) {
            const dx = prevSampled[i].x - targetSampled[i].x;
            const dy = prevSampled[i].y - targetSampled[i].y;
            if (dx * dx + dy * dy > eps2) break;
            isStaticMask[i] = true;
        }
    }

    const staticCount = isStaticMask.filter(Boolean).length;
    console.log(
        `[PROXIMITY PLAN] ring=${prevRing.ringId} N=${N} static=${staticCount} ` +
        `(${((staticCount / N) * 100).toFixed(0)}% stationary)`
    );

    return {
        ringId: prevRing.ringId,
        prevSampled,
        targetSampled,
        isStaticMask,
        targetRing: { ...nextRing, points: nextRotated },
    };
}

/**
 * Fallback ring plan when no conquest origin is available.
 * Does whole-ring interpolation (no static points).
 */
function buildWholeRingPlan(
    prevRing: BoundaryRingSnapshot,
    nextRing: BoundaryRingSnapshot,
    sampleCount: number,
): AnimatedRingPlan {
    const N = Math.max(sampleCount, Math.max(prevRing.points.length, nextRing.points.length), 64);
    const prevSampled = resampleClosedRing(prevRing.points, N);
    const targetSampled = resampleClosedRing(nextRing.points, N);

    console.log(
        `[WHOLE RING PLAN] ring=${prevRing.ringId} N=${N} (no conquest origin — full interpolation)`
    );

    return {
        ringId: prevRing.ringId,
        prevSampled,
        targetSampled,
        isStaticMask: new Array(N).fill(false),  // all points interpolate
        targetRing: nextRing,
    };
}

// ---------------------------------------------------------------------------
// Snapshot matching
// ---------------------------------------------------------------------------

function matchSnapshotsByOwner(
    prev: TerritoryBoundarySnapshot[],
    next: TerritoryBoundarySnapshot[],
): Map<string, { prev: TerritoryBoundarySnapshot; next: TerritoryBoundarySnapshot }> {
    const matches = new Map<string, { prev: TerritoryBoundarySnapshot; next: TerritoryBoundarySnapshot }>();

    const nextByOwner = new Map<string, TerritoryBoundarySnapshot[]>();
    for (const s of next) {
        let arr = nextByOwner.get(s.ownerId);
        if (!arr) { arr = []; nextByOwner.set(s.ownerId, arr); }
        arr.push(s);
    }

    for (const prevT of prev) {
        const candidates = nextByOwner.get(prevT.ownerId);
        if (!candidates || candidates.length === 0) continue;

        let bestMatch: TerritoryBoundarySnapshot | null = null;
        let bestOverlap = 0;
        for (const nextT of candidates) {
            let overlap = 0;
            for (const sid of prevT.starIds) {
                if (nextT.starIds.includes(sid)) overlap++;
            }
            if (overlap > bestOverlap) {
                bestOverlap = overlap;
                bestMatch = nextT;
            }
        }
        if (bestMatch) {
            matches.set(prevT.territoryId, { prev: prevT, next: bestMatch });
        }
    }

    return matches;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Create territory transition plans using proximity-based detection.
 *
 * For each affected territory:
 *   1. Match prev → next rings
 *   2. Align both rings at conquest origin
 *   3. Resample to equal point count
 *   4. Per-point static/dynamic classification by displacement
 */
export function createTerritoryTransitionPlan(
    prevSnapshots: TerritoryBoundarySnapshot[],
    nextSnapshots: TerritoryBoundarySnapshot[],
    delta: TerritoryDeltaContext,
    durationMs: number,
    conquestOrigin?: Vec2,
    sampleCount: number = 32,
): TerritoryTransitionPlanSet {
    const plans = new Map<string, TerritoryBoundaryTransitionPlan>();

    const matched = matchSnapshotsByOwner(prevSnapshots, nextSnapshots);

    for (const [territoryId, { prev: prevT, next: nextT }] of matched) {
        if (!delta.affectedTerritoryIds.has(territoryId) &&
            !delta.affectedTerritoryIds.has(nextT.territoryId)) {
            continue;
        }

        const animatedRings: AnimatedRingPlan[] = [];

        const ringCount = Math.min(prevT.rings.length, nextT.rings.length);
        for (let ri = 0; ri < ringCount; ri++) {
            const prevRing = prevT.rings[ri];
            const nextRing = nextT.rings[ri];

            if (conquestOrigin) {
                animatedRings.push(
                    buildProximityRingPlan(prevRing, nextRing, conquestOrigin, sampleCount)
                );
            } else {
                animatedRings.push(
                    buildWholeRingPlan(prevRing, nextRing, sampleCount)
                );
            }
        }

        plans.set(territoryId, {
            territoryId,
            ownerId: nextT.ownerId,
            durationMs,
            rings: animatedRings,
        });
    }

    return { plansByTerritoryId: plans };
}
