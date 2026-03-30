import type {
    FillTransitionFrame,
    FillTransitionMode,
    FillTransitionPlan,
    FillTransitionPlanInput,
    TransitionSampleContext,
} from '../../../contracts/TransitionContracts';
import type { FrontierTopology, RegionLoop } from '../../../contracts/FrontierTopologyContracts';

/**
 * Transition plan holding explicitly the full FrontierTopology rather than
 * rendered polygons, enabling true topological segment ID matching.
 */
interface FrontierMorphFillPlan extends FillTransitionPlan {
    previousTopology?: FrontierTopology;
    targetTopology?: FrontierTopology;
}

export class FrontierMorphFillMode implements FillTransitionMode {
    readonly id = 'frontier_morph' as const;
    readonly label = 'Frontier Topology Morph Fill';

    plan(input: FillTransitionPlanInput): FillTransitionPlan {
        return {
            planId: `fill:frontier_morph:${input.nowMs}`,
            sourceMode: this.id,
            startGeometryVersion: input.previousGeometry?.version ?? input.nextGeometry.version,
            endGeometryVersion: input.nextGeometry.version,
            conquestEvents: input.ownership.conquestEvents,
            previousTopology: input.previousGeometry?.frontierTopology,
            targetTopology: input.nextGeometry.frontierTopology,
        } as FrontierMorphFillPlan;
    }

    sample(
        plan: FillTransitionPlan,
        ctx: TransitionSampleContext,
    ): FillTransitionFrame {
        const typedPlan = plan as FrontierMorphFillPlan;
        const t = ctx.progress;
        
        const regions: { ownerId: string; points: [number, number][] }[] = [];

        if (!typedPlan.previousTopology || !typedPlan.targetTopology) {
            // Unlikely fallback if geometries are missing topology
            return { regions: [] };
        }

        const prevTopology = typedPlan.previousTopology;
        const nextTopology = typedPlan.targetTopology;

        // Group prev loops by owner for matching
        const prevByOwner = new Map<string, RegionLoop[]>();
        for (const loop of prevTopology.loops) {
            const arr = prevByOwner.get(loop.ownerId);
            if (arr) arr.push(loop); else prevByOwner.set(loop.ownerId, [loop]);
        }

        const matchedPrevLoopIds = new Set<string>();

        // 1) Process all target loops
        for (const nextLoop of nextTopology.loops) {
            let sharedSectionId: string | undefined;
            let bestPrevLoop: RegionLoop | undefined;

            // Find a prevLoop that shares at least one structural segment
            for (const nextRef of nextLoop.sectionRefs) {
                const candidates = prevByOwner.get(nextLoop.ownerId) || [];
                for (const prevLoop of candidates) {
                    if (matchedPrevLoopIds.has(prevLoop.id)) continue;
                    if (prevLoop.sectionRefs.some(r => r.sectionId === nextRef.sectionId)) {
                        bestPrevLoop = prevLoop;
                        sharedSectionId = nextRef.sectionId;
                        break; // found match!
                    }
                }
                if (bestPrevLoop) break;
            }

            if (bestPrevLoop && sharedSectionId) {
                matchedPrevLoopIds.add(bestPrevLoop.id);
                // Align both Point arrays structurally to start at the shared section's start node
                const prevPoints = buildLoopPoints(bestPrevLoop, prevTopology, sharedSectionId);
                const nextPoints = buildLoopPoints(nextLoop, nextTopology, sharedSectionId);
                
                regions.push({
                    ownerId: nextLoop.ownerId,
                    points: otInterpolateAlignedPolygon(prevPoints, nextPoints, t),
                });
            } else {
                // Pure spawn: no shared topological boundary
                const nextPoints = buildLoopPoints(nextLoop, nextTopology);
                const centroid = polygonCentroid(nextPoints);
                const morphed = nextPoints.map(([x, y]) => [
                    centroid[0] + t * (x - centroid[0]),
                    centroid[1] + t * (y - centroid[1]),
                ] as [number, number]);
                regions.push({
                    ownerId: nextLoop.ownerId,
                    points: closePolygon(morphed),
                });
            }
        }

        // 2) Process unmatched prev loops (Vanishing)
        for (const prevLoop of prevTopology.loops) {
            if (matchedPrevLoopIds.has(prevLoop.id)) continue;
            const prevPoints = buildLoopPoints(prevLoop, prevTopology);
            const centroid = polygonCentroid(prevPoints);
            const morphed = prevPoints.map(([x, y]) => [
                x + t * (centroid[0] - x),
                y + t * (centroid[1] - y),
            ] as [number, number]);
            regions.push({
                ownerId: prevLoop.ownerId,
                points: closePolygon(morphed),
            });
        }

        return { regions };
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function closePolygon(points: [number, number][]): [number, number][] {
    if (points.length === 0) return points;
    return [...points, [points[0][0], points[0][1]]];
}

/**
 * Reconstruct a full ordered coordinate sequence for a RegionLoop.
 * Does NOT append a closing duplicated vertex (leaves array open for OT CDF).
 * If alignSectionId is provided, rotates the array such that index 0 is 
 * the exact starting coordinate of the specified section.
 */
function buildLoopPoints(loop: RegionLoop, topology: FrontierTopology, alignSectionId?: string): [number, number][] {
    const points: [number, number][] = [];
    let startIdx = 0;

    for (let i = 0; i < loop.sectionRefs.length; i++) {
        const ref = loop.sectionRefs[i];
        if (ref.sectionId === alignSectionId) {
            startIdx = points.length;
        }
        const section = topology.sections.get(ref.sectionId);
        if (!section) continue;

        const pts = section.points;
        if (ref.direction === 'forward') {
            for (let j = 0; j < pts.length - 1; j++) {
                points.push(pts[j]);
            }
        } else {
            for (let j = pts.length - 1; j > 0; j--) {
                points.push(pts[j]);
            }
        }
    }

    if (startIdx > 0) {
        return [...points.slice(startIdx), ...points.slice(0, startIdx)];
    }
    return points;
}

/**
 * OT-interpolate two closed polygons at progress t.
 * Input arrays MUST be topologically pre-aligned (index 0 corresponds 
 * exactly between prev and next).
 */
function otInterpolateAlignedPolygon(
    prev: [number, number][],
    next: [number, number][],
    t: number,
): [number, number][] {
    if (prev.length < 2 || next.length < 2) {
        return closePolygon(t < 0.5 ? prev : next);
    }

    const sampleCount = Math.max(prev.length, next.length, 4);
    const prevCDF = buildPerimeterCDF(prev);
    const nextCDF = buildPerimeterCDF(next);
    const s = 1 - t;

    const result: [number, number][] = new Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
        const u = i / sampleCount; // [0, 1) for open-sequence polygon
        const [px, py] = evaluateClosedAtFraction(prev, prevCDF, u);
        const [nx, ny] = evaluateClosedAtFraction(next, nextCDF, u);
        result[i] = [s * px + t * nx, s * py + t * ny];
    }

    return closePolygon(result);
}

function buildPerimeterCDF(points: [number, number][]): Float64Array {
    const n = points.length;
    const cdf = new Float64Array(n + 1);
    if (n < 2) return cdf;

    cdf[0] = 0;
    for (let i = 1; i <= n; i++) {
        const p0 = points[(i - 1) % n];
        const p1 = points[i % n];
        const dx = p1[0] - p0[0];
        const dy = p1[1] - p0[1];
        cdf[i] = cdf[i - 1] + Math.sqrt(dx * dx + dy * dy);
    }

    const total = cdf[n];
    if (total > 1e-9) {
        for (let i = 1; i <= n; i++) {
            cdf[i] /= total;
        }
    }
    cdf[n] = 1.0;

    return cdf;
}

function evaluateClosedAtFraction(
    points: [number, number][],
    cdf: Float64Array,
    u: number,
): [number, number] {
    const n = points.length;
    if (n === 0) return [0, 0];
    if (n === 1) return [points[0][0], points[0][1]];

    const uu = ((u % 1) + 1) % 1;

    let lo = 0, hi = n;
    while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (cdf[mid] <= uu) lo = mid; else hi = mid;
    }

    const segFrac = cdf[lo + 1] - cdf[lo];
    const tt = segFrac > 1e-12 ? (uu - cdf[lo]) / segFrac : 0;

    const p0 = points[lo % n];
    const p1 = points[(lo + 1) % n];
    return [
        p0[0] + tt * (p1[0] - p0[0]),
        p0[1] + tt * (p1[1] - p0[1]),
    ];
}

function polygonCentroid(points: [number, number][]): [number, number] {
    if (points.length === 0) return [0, 0];
    let sx = 0, sy = 0;
    for (const [x, y] of points) { sx += x; sy += y; }
    return [sx / points.length, sy / points.length];
}
