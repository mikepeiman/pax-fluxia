import type {
    BorderTransitionFrame,
    BorderTransitionMode,
    BorderTransitionPlan,
    BorderTransitionPlanInput,
    TransitionSampleContext,
} from '../BorderTransitionMode';
import {
    computeGeometryTopologyDiff,
    type FrontierTopology,
} from '../planners/GeometryTopologyDiff';

// ─── Plan data ──────────────────────────────────────────────────────────────

interface BorderPolylineCorrespondence {
    ownerPairKey: string;
    topology: FrontierTopology;
    /** For static: the final points (no interpolation needed) */
    staticPoints?: [number, number][];
    /** For drifted/spawn/vanish: source points (matched vertex count) */
    sourcePoints?: [number, number][];
    /** For drifted/spawn/vanish: target points (matched vertex count) */
    targetPoints?: [number, number][];
}

interface OptimalTransportBorderPlan extends BorderTransitionPlan {
    correspondences: BorderPolylineCorrespondence[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Resample a polyline to exactly n points, evenly spaced by arc-length */
function resamplePolyline(pts: [number, number][], n: number): [number, number][] {
    if (pts.length === 0 || n === 0) return [];
    if (pts.length === 1) return Array.from({ length: n }, () => [...pts[0]] as [number, number]);
    if (pts.length === n) return pts;

    const cumLen: number[] = [0];
    for (let i = 1; i < pts.length; i++) {
        const dx = pts[i][0] - pts[i - 1][0];
        const dy = pts[i][1] - pts[i - 1][1];
        cumLen.push(cumLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
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
        const diff = computeGeometryTopologyDiff(
            input.previousGeometry,
            input.nextGeometry,
        );

        const correspondences: BorderPolylineCorrespondence[] = diff.frontiers.map(entry => {
            switch (entry.topology) {
                case 'static':
                    // No interpolation — pass through as-is
                    return {
                        ownerPairKey: entry.ownerPairKey,
                        topology: 'static' as const,
                        staticPoints: entry.nextPoints!,
                    };

                case 'drifted': {
                    const src = entry.previousPoints!;
                    const tgt = entry.nextPoints!;
                    const n = Math.max(src.length, tgt.length, 4);
                    return {
                        ownerPairKey: entry.ownerPairKey,
                        topology: 'drifted' as const,
                        sourcePoints: resamplePolyline(src, n),
                        targetPoints: resamplePolyline(tgt, n),
                    };
                }

                case 'spawned': {
                    const tgt = entry.nextPoints!;
                    const seed = midpoint(tgt);
                    const n = Math.max(tgt.length, 4);
                    return {
                        ownerPairKey: entry.ownerPairKey,
                        topology: 'spawned' as const,
                        sourcePoints: Array.from({ length: n }, () => [...seed] as [number, number]),
                        targetPoints: resamplePolyline(tgt, n),
                    };
                }

                case 'vanished': {
                    const src = entry.previousPoints!;
                    const seed = midpoint(src);
                    const n = Math.max(src.length, 4);
                    return {
                        ownerPairKey: entry.ownerPairKey,
                        topology: 'vanished' as const,
                        sourcePoints: resamplePolyline(src, n),
                        targetPoints: Array.from({ length: n }, () => [...seed] as [number, number]),
                    };
                }
            }
        });

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
                    if (c.topology === 'vanished' && p >= 1) return false;
                    return true;
                })
                .map(c => {
                    if (c.topology === 'static') {
                        // Static borders: no interpolation
                        return { ownerPairKey: c.ownerPairKey, points: c.staticPoints! };
                    }
                    // Drifted/spawned/vanished: interpolate
                    return {
                        ownerPairKey: c.ownerPairKey,
                        points: lerpPoints(c.sourcePoints!, c.targetPoints!, p),
                    };
                }),
        };
    }
}
