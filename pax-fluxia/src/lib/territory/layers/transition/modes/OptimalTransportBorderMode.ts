import type {
    BorderTransitionFrame,
    BorderTransitionMode,
    BorderTransitionPlan,
    BorderTransitionPlanInput,
    TransitionSampleContext,
} from '../BorderTransitionMode';
import { planFrontierCorrespondence } from '../planners/CorrespondencePlanner';

// ─── Plan data ──────────────────────────────────────────────────────────────

type TopologyKind = 'persist' | 'spawn' | 'vanish';

interface BorderPolylineCorrespondence {
    ownerPairKey: string;
    topology: TopologyKind;
    /** Source polyline (resampled to match target count) */
    sourcePoints: [number, number][];
    /** Target polyline (resampled to match source count) */
    targetPoints: [number, number][];
    /** Seed point for spawn/vanish — midpoint of the polyline that exists */
    seedPoint?: [number, number];
}

interface OptimalTransportBorderPlan extends BorderTransitionPlan {
    correspondences: BorderPolylineCorrespondence[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Compute cumulative arc-length array */
function cumulativeArcLengths(pts: [number, number][]): number[] {
    const cumLen: number[] = [0];
    for (let i = 1; i < pts.length; i++) {
        const dx = pts[i][0] - pts[i - 1][0];
        const dy = pts[i][1] - pts[i - 1][1];
        cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    return cumLen;
}

/** Resample a polyline to exactly n points, evenly spaced by arc-length */
function resamplePolyline(pts: [number, number][], n: number): [number, number][] {
    if (pts.length === 0 || n === 0) return [];
    if (pts.length === 1) return Array.from({ length: n }, () => [...pts[0]] as [number, number]);
    if (pts.length === n) return pts;

    const cumLen = cumulativeArcLengths(pts);
    const totalLen = cumLen[cumLen.length - 1];
    if (totalLen === 0) return Array.from({ length: n }, () => [...pts[0]] as [number, number]);

    const result: [number, number][] = [];
    for (let i = 0; i < n; i++) {
        const targetLen = (i / (n - 1)) * totalLen;
        let lo = 0, hi = cumLen.length - 1;
        while (lo < hi - 1) {
            const mid = (lo + hi) >> 1;
            if (cumLen[mid] <= targetLen) lo = mid; else hi = mid;
        }
        const segLen = cumLen[hi] - cumLen[lo];
        const t = segLen > 0 ? (targetLen - cumLen[lo]) / segLen : 0;
        result.push([
            pts[lo][0] + t * (pts[hi][0] - pts[lo][0]),
            pts[lo][1] + t * (pts[hi][1] - pts[lo][1]),
        ]);
    }
    return result;
}

function midpoint(pts: [number, number][]): [number, number] {
    if (pts.length === 0) return [0, 0];
    let mx = 0, my = 0;
    for (const [x, y] of pts) { mx += x; my += y; }
    return [mx / pts.length, my / pts.length];
}

function lerpPoints(
    a: [number, number][],
    b: [number, number][],
    p: number,
): [number, number][] {
    const result: [number, number][] = [];
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) {
        result.push([
            a[i][0] + p * (b[i][0] - a[i][0]),
            a[i][1] + p * (b[i][1] - a[i][1]),
        ]);
    }
    return result;
}

// ─── Mode ───────────────────────────────────────────────────────────────────

export class OptimalTransportBorderMode implements BorderTransitionMode {
    readonly id = 'optimal_transport' as const;
    readonly label = 'Optimal-Transport Correspondence Border';

    plan(input: BorderTransitionPlanInput): BorderTransitionPlan {
        const rawCorrespondences = input.previousGeometry
            ? planFrontierCorrespondence(input.previousGeometry, input.nextGeometry)
            : [];

        // Build per-frontier correspondences with arc-length resampling
        const correspondences: BorderPolylineCorrespondence[] = [];

        // Map previous frontiers by key to detect vanishing
        const prevByKey = new Map(
            (input.previousGeometry?.frontierPolylines ?? []).map(p => [p.ownerPairKey, p.points])
        );
        const nextByKey = new Map(
            input.nextGeometry.frontierPolylines.map(p => [p.ownerPairKey, p.points])
        );

        // Process correspondences (persist + spawn)
        for (const c of rawCorrespondences) {
            const hasPrev = prevByKey.has(c.ownerPairKey);
            const topology: TopologyKind = hasPrev ? 'persist' : 'spawn';
            const n = Math.max(c.previousPoints.length, c.nextPoints.length, 4);

            if (topology === 'persist') {
                correspondences.push({
                    ownerPairKey: c.ownerPairKey,
                    topology: 'persist',
                    sourcePoints: resamplePolyline(c.previousPoints, n),
                    targetPoints: resamplePolyline(c.nextPoints, n),
                });
            } else {
                // Spawn: grow border from seed point (midpoint of target)
                const seed = midpoint(c.nextPoints);
                correspondences.push({
                    ownerPairKey: c.ownerPairKey,
                    topology: 'spawn',
                    sourcePoints: Array.from({ length: n }, () => [...seed] as [number, number]),
                    targetPoints: resamplePolyline(c.nextPoints, n),
                    seedPoint: seed,
                });
            }
            prevByKey.delete(c.ownerPairKey);
        }

        // Vanishing frontiers: existed before but not in next geometry
        for (const [key, pts] of prevByKey) {
            if (!nextByKey.has(key)) {
                const seed = midpoint(pts);
                const n = Math.max(pts.length, 4);
                correspondences.push({
                    ownerPairKey: key,
                    topology: 'vanish',
                    sourcePoints: resamplePolyline(pts, n),
                    targetPoints: Array.from({ length: n }, () => [...seed] as [number, number]),
                    seedPoint: seed,
                });
            }
        }

        const plan: OptimalTransportBorderPlan = {
            planId: `border:optimal_transport:${input.nowMs}`,
            sourceMode: this.id,
            startGeometryVersion: input.previousGeometry?.version ?? input.nextGeometry.version,
            endGeometryVersion: input.nextGeometry.version,
            conquestEvents: input.ownership.conquestEvents,
            correspondences,
        };

        return plan;
    }

    sample(
        plan: BorderTransitionPlan,
        ctx: TransitionSampleContext,
    ): BorderTransitionFrame {
        const typedPlan = plan as OptimalTransportBorderPlan;
        const p = Math.max(0, Math.min(1, ctx.progress));

        return {
            frontiers: typedPlan.correspondences
                .filter(c => {
                    // Don't draw vanished borders after completion
                    if (c.topology === 'vanish' && p >= 1) return false;
                    return true;
                })
                .map(c => ({
                    ownerPairKey: c.ownerPairKey,
                    points: lerpPoints(c.sourcePoints, c.targetPoints, p),
                })),
        };
    }
}
