/**
 * territory/transitions/OptimalTransportBorderTransition.ts
 *
 * DY4 Optimal Transport — canonical BorderTransition implementation.
 *
 * Takes two CanonicalTerritoryData snapshots (before/after conquest)
 * and a progress value 0..1. Returns a new CanonicalTerritoryData with
 * animatedShells populated by interpolating shell polygons between the
 * two states using centroid-matched resampled lerp.
 *
 * Rules (architecture):
 * - No PIXI imports
 * - No module-level mutable state
 * - No rendering — pure data transform
 * - Implements BorderTransition from renderMode.ts
 */

import type {
    BorderTransition,
    CanonicalAnimatedShell,
    CanonicalTerritoryData,
} from '$lib/territory-engine/renderMode';

// ── Geometry helpers (no PIXI, no module state) ──────────────────────────────

function polygonArea(pts: [number, number][]): number {
    let area = 0;
    const n = pts.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        area += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]);
    }
    return area / 2;
}

function polygonCentroid(pts: [number, number][]): [number, number] {
    let cx = 0;
    let cy = 0;
    const n = pts.length;
    if (n === 0) return [0, 0];
    for (const [x, y] of pts) {
        cx += x;
        cy += y;
    }
    return [cx / n, cy / n];
}

function perimeter(pts: [number, number][]): number {
    let len = 0;
    const n = pts.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const dx = pts[i][0] - pts[j][0];
        const dy = pts[i][1] - pts[j][1];
        len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
}

/**
 * Resample a closed polygon to exactly n equally-spaced points.
 * Uses arc-length parameterization for a consistent result regardless of
 * source polygon vertex count.
 */
function resamplePolygon(pts: [number, number][], n: number): [number, number][] {
    if (pts.length === 0 || n < 1) return [];
    const total = perimeter(pts);
    if (total < 1e-9) return Array(n).fill(pts[0]) as [number, number][];

    const step = total / n;
    const result: [number, number][] = [];
    let dist = 0;
    let segIdx = 0;
    const m = pts.length;

    for (let i = 0; i < n; i++) {
        const target = i * step;
        // Walk segments until we pass the target distance
        while (dist + segLen(pts, segIdx, m) < target - 1e-9 && segIdx < m - 1) {
            dist += segLen(pts, segIdx, m);
            segIdx++;
        }
        const remaining = target - dist;
        const sl = segLen(pts, segIdx, m);
        const t = sl > 1e-9 ? Math.min(1, remaining / sl) : 0;
        const a = pts[segIdx];
        const b = pts[(segIdx + 1) % m];
        result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    return result;
}

function segLen(pts: [number, number][], i: number, m: number): number {
    const a = pts[i];
    const b = pts[(i + 1) % m];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    return Math.sqrt(dx * dx + dy * dy);
}

/** Lerp two equal-length resampled polygon point arrays. */
function lerpPolygon(
    from: [number, number][],
    to: [number, number][],
    t: number,
): [number, number][] {
    const n = Math.min(from.length, to.length);
    const result: [number, number][] = new Array(n);
    for (let i = 0; i < n; i++) {
        result[i] = [
            from[i][0] + (to[i][0] - from[i][0]) * t,
            from[i][1] + (to[i][1] - from[i][1]) * t,
        ];
    }
    return result;
}

/** Eased cubic in-out. */
function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── The BorderTransition implementation ──────────────────────────────────────

/**
 * Optimal Transport border transition (DY4).
 *
 * Interpolates territory shell polygons between two ownership states using
 * centroid-matched resampled lerp — the same algorithm PVV2 used in its
 * legacy smooth-morph mode, now as a pure data transformer.
 *
 * Label includes "(DY4)" for short-term user recognition per D-81.
 */
export class OptimalTransportBorderTransition implements BorderTransition {
    readonly id = 'optimal_transport' as const;
    readonly label = 'Smooth Border Morph (DY4 Optimal Transport)';

    /** Number of points each polygon is resampled to before lerp. */
    private readonly resampleCount: number;

    constructor(resampleCount = 64) {
        this.resampleCount = resampleCount;
    }

    interpolate(
        oldData: CanonicalTerritoryData,
        newData: CanonicalTerritoryData,
        progress: number,
    ): CanonicalTerritoryData {
        const t = easeInOutCubic(Math.max(0, Math.min(1, progress)));

        // Build centroid lookup for old shells by ownerId
        const oldByOwner = new Map<string, [number, number][][]>();
        for (const shell of oldData.shells) {
            if (shell.points.length < 3) continue;
            const list = oldByOwner.get(shell.ownerId) ?? [];
            list.push(shell.points);
            oldByOwner.set(shell.ownerId, list);
        }

        const animatedShells: CanonicalAnimatedShell[] = newData.shells
            .filter((shell) => shell.points.length >= 3)
            .map((newShell) => {
                const oldCandidates = oldByOwner.get(newShell.ownerId);

                if (!oldCandidates || oldCandidates.length === 0) {
                    // Newly owned — appear at target position (no morph)
                    return {
                        shellId: newShell.shellId,
                        ownerId: newShell.ownerId,
                        points: newShell.points,
                        area: newShell.area,
                        absArea: newShell.absArea,
                        confidence: newShell.confidence,
                        holeLoops: [],
                    };
                }

                // Match old shell by nearest centroid
                const newCentroid = polygonCentroid(newShell.points);
                let bestOld = oldCandidates[0];
                let bestDist = Infinity;
                for (const candidate of oldCandidates) {
                    const c = polygonCentroid(candidate);
                    const dx = c[0] - newCentroid[0];
                    const dy = c[1] - newCentroid[1];
                    const d = dx * dx + dy * dy;
                    if (d < bestDist) {
                        bestDist = d;
                        bestOld = candidate;
                    }
                }

                // Resample both to same vertex count, then lerp
                const n = this.resampleCount;
                const fromPts = resamplePolygon(bestOld, n);
                const toPts = resamplePolygon(newShell.points, n);
                const interpolated = lerpPolygon(fromPts, toPts, t);

                return {
                    shellId: newShell.shellId,
                    ownerId: newShell.ownerId,
                    points: interpolated,
                    area: newShell.area + (newShell.area - (polygonArea(bestOld) || newShell.area)) * t,
                    absArea: Math.abs(newShell.area),
                    confidence: newShell.confidence,
                    holeLoops: [],
                };
            });

        return {
            shells: newData.shells,
            shellLoops: newData.shellLoops,
            animatedShells,
            transitionActive: progress < 1.0,
        };
    }
}

/** Singleton for use without instantiation. resampleCount=64 is a good default. */
export const optimalTransportBorderTransition = new OptimalTransportBorderTransition(64);
