import type {
    FillTransitionFrame,
    FillTransitionMode,
    FillTransitionPlan,
    FillTransitionPlanInput,
    TransitionSampleContext,
} from '../FillTransitionMode';

// ─── Plan data ──────────────────────────────────────────────────────────────

interface RegionCorrespondence {
    ownerId: string;
    sourcePoints: [number, number][];
    targetPoints: [number, number][];
}

interface FrontierMorphFillPlan extends FillTransitionPlan {
    correspondences: RegionCorrespondence[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function centroid(pts: [number, number][]): [number, number] {
    if (pts.length === 0) return [0, 0];
    let cx = 0, cy = 0;
    for (const [x, y] of pts) { cx += x; cy += y; }
    return [cx / pts.length, cy / pts.length];
}

/** Resample a polygon to exactly `n` points via linear arc-length interpolation */
function resamplePolygon(pts: [number, number][], n: number): [number, number][] {
    if (pts.length === 0 || n === 0) return [];
    if (pts.length === n) return pts;

    // Compute cumulative arc lengths
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
        const targetLen = (i / n) * totalLen;
        // Binary search for the segment
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

/** Lerp two same-length point arrays by progress p */
function lerpPoints(
    a: [number, number][],
    b: [number, number][],
    p: number,
): [number, number][] {
    const result: [number, number][] = [];
    for (let i = 0; i < a.length; i++) {
        result.push([
            a[i][0] + p * (b[i][0] - a[i][0]),
            a[i][1] + p * (b[i][1] - a[i][1]),
        ]);
    }
    return result;
}

// ─── Mode ───────────────────────────────────────────────────────────────────

export class FrontierMorphFillMode implements FillTransitionMode {
    readonly id = 'frontier_morph' as const;
    readonly label = 'Frontier Topology Morph Fill';

    plan(input: FillTransitionPlanInput): FillTransitionPlan {
        const sourceRegions = input.previousGeometry?.territoryRegions
            ?? input.nextGeometry.territoryRegions;
        const targetRegions = input.nextGeometry.territoryRegions;

        // Build correspondences by ownerId
        const sourceByOwner = new Map(sourceRegions.map(r => [r.ownerId, r.points]));
        const targetByOwner = new Map(targetRegions.map(r => [r.ownerId, r.points]));
        const allOwnerIds = new Set([...sourceByOwner.keys(), ...targetByOwner.keys()]);

        const correspondences: RegionCorrespondence[] = [];
        for (const ownerId of allOwnerIds) {
            const src = sourceByOwner.get(ownerId);
            const tgt = targetByOwner.get(ownerId);

            if (src && tgt) {
                // Persist: both exist → resample to same vertex count
                const n = Math.max(src.length, tgt.length);
                correspondences.push({
                    ownerId,
                    sourcePoints: resamplePolygon(src, n),
                    targetPoints: resamplePolygon(tgt, n),
                });
            } else if (tgt && !src) {
                // Spawn: target exists, source doesn't → grow from centroid
                const c = centroid(tgt);
                correspondences.push({
                    ownerId,
                    sourcePoints: Array.from({ length: tgt.length }, () => [...c] as [number, number]),
                    targetPoints: tgt,
                });
            } else if (src && !tgt) {
                // Vanish: source exists, target doesn't → collapse to centroid
                const c = centroid(src);
                correspondences.push({
                    ownerId,
                    sourcePoints: src,
                    targetPoints: Array.from({ length: src.length }, () => [...c] as [number, number]),
                });
            }
        }

        const plan: FrontierMorphFillPlan = {
            planId: `fill:frontier_morph:${input.nowMs}`,
            sourceMode: this.id,
            startGeometryVersion: input.previousGeometry?.version ?? input.nextGeometry.version,
            endGeometryVersion: input.nextGeometry.version,
            conquestEvents: input.ownership.conquestEvents,
            correspondences,
        };

        return plan;
    }

    sample(
        plan: FillTransitionPlan,
        ctx: TransitionSampleContext,
    ): FillTransitionFrame {
        const typedPlan = plan as FrontierMorphFillPlan;
        const p = Math.max(0, Math.min(1, ctx.progress));

        return {
            regions: typedPlan.correspondences.map(c => ({
                ownerId: c.ownerId,
                points: lerpPoints(c.sourcePoints, c.targetPoints, p),
            })),
        };
    }
}
