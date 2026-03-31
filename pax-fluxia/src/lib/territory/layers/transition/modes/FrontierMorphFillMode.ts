import type {
    FillTransitionFrame,
    FillTransitionMode,
    FillTransitionPlan,
    FillTransitionPlanInput,
    TransitionSampleContext,
} from '../../../contracts/TransitionContracts';
import type { FrontierSection, FrontierTopology, RegionLoop } from '../../../contracts/FrontierTopologyContracts';
import { rebuildLoopPoints } from '../../../compiler/buildFrontierTopology';
import { validateFillFrame } from '../../../devtools/PolygonValidator';
import { log } from '$lib/utils/logger';

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

        log.renderer('FrontierMorphFill',
            `sample() t=${t.toFixed(3)} | prevTopo=${typedPlan.previousTopology ? 'ok' : 'MISSING'} nextTopo=${typedPlan.targetTopology ? 'ok' : 'MISSING'}`,
        );

        const regions: { ownerId: string; points: [number, number][] }[] = [];

        if (!typedPlan.previousTopology || !typedPlan.targetTopology) {
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

            // Find a prevLoop for the same owner that shares at least one section
            for (const nextRef of nextLoop.sectionRefs) {
                const candidates = prevByOwner.get(nextLoop.ownerId) || [];
                for (const prevLoop of candidates) {
                    if (matchedPrevLoopIds.has(prevLoop.id)) continue;
                    if (prevLoop.sectionRefs.some(r => r.sectionId === nextRef.sectionId)) {
                        bestPrevLoop = prevLoop;
                        sharedSectionId = nextRef.sectionId;
                        break;
                    }
                }
                if (bestPrevLoop) break;
            }

            if (bestPrevLoop && sharedSectionId) {
                matchedPrevLoopIds.add(bestPrevLoop.id);

                // Use the canonical rebuildLoopPoints (correct junction dedup),
                // then rotate both to align at the shared section start.
                const prevPoints = rebuildAndAlign(bestPrevLoop, prevTopology.sections, sharedSectionId);
                const nextPoints = rebuildAndAlign(nextLoop, nextTopology.sections, sharedSectionId);

                regions.push({
                    ownerId: nextLoop.ownerId,
                    points: otInterpolateAlignedPolygon(prevPoints, nextPoints, t),
                });
            } else {
                // Pure spawn: no shared topological boundary — grow from centroid
                const nextPoints = rebuildLoopPoints(nextLoop, nextTopology.sections);
                const centroid = polygonCentroid(nextPoints);
                regions.push({
                    ownerId: nextLoop.ownerId,
                    points: nextPoints.map(([x, y]) => [
                        centroid[0] + t * (x - centroid[0]),
                        centroid[1] + t * (y - centroid[1]),
                    ] as [number, number]),
                });
            }
        }

        // 2) Process unmatched prev loops (vanishing) — shrink to centroid
        for (const prevLoop of prevTopology.loops) {
            if (matchedPrevLoopIds.has(prevLoop.id)) continue;
            const prevPoints = rebuildLoopPoints(prevLoop, prevTopology.sections);
            const centroid = polygonCentroid(prevPoints);
            regions.push({
                ownerId: prevLoop.ownerId,
                points: prevPoints.map(([x, y]) => [
                    x + t * (centroid[0] - x),
                    y + t * (centroid[1] - y),
                ] as [number, number]),
            });
        }

        log.renderer('FrontierMorphFill',
            `sample done: ${regions.length} regions (matched=${matchedPrevLoopIds.size} spawning=${regions.length - matchedPrevLoopIds.size})`,
        );

        // Dev validation — logs warnings for degenerate polygons
        if (import.meta.env.DEV) {
            const { invalidCount } = validateFillFrame(regions, `t=${t.toFixed(3)}`, true);
            if (invalidCount > 0) {
                log.renderer('FrontierMorphFill',
                    `WARNING: ${invalidCount}/${regions.length} regions are invalid at t=${t.toFixed(3)}`,
                );
            }
        }

        return { regions };
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Rebuild canonical loop points (via the canonical rebuildLoopPoints), then
 * rotate the array so that index 0 starts at the beginning of the specified
 * alignment section.
 *
 * rebuildLoopPoints: first section contributes ALL its points; subsequent
 * sections skip the first point (junction dedup). We mirror this accounting
 * to find the precise rotation offset.
 */
function rebuildAndAlign(
    loop: RegionLoop,
    sections: ReadonlyMap<string, FrontierSection>,
    alignSectionId: string,
): [number, number][] {
    const points = rebuildLoopPoints(loop, sections);
    if (points.length === 0) return points;

    // Walk the section refs, accumulating point counts to find the rotation offset.
    let offset = 0;
    let rotationOffset = 0;
    let found = false;

    for (let i = 0; i < loop.sectionRefs.length; i++) {
        const ref = loop.sectionRefs[i];
        if (ref.sectionId === alignSectionId) {
            rotationOffset = offset;
            found = true;
            break;
        }
        const section = sections.get(ref.sectionId);
        if (!section) continue;
        // First section: contribute section.points.length points.
        // Subsequent sections: skip first point → contribute length - 1.
        offset += i === 0 ? section.points.length : section.points.length - 1;
    }

    if (!found || rotationOffset === 0) return points;

    // Rotate so that `rotationOffset` becomes index 0
    return [...points.slice(rotationOffset), ...points.slice(0, rotationOffset)];
}

/**
 * OT-interpolate two open (non-closed) polygons at progress t.
 * Uses perimeter CDF sampling — vertex counts can differ between prev/next.
 *
 * IMPORTANT: Input arrays must NOT have a closing duplicate vertex.
 * rebuildLoopPoints returns open arrays (no closing duplicate).
 * Do NOT append a closing point here — the CDF sampler uses i % n modular
 * indexing and treats the array as closed implicitly.
 */
function otInterpolateAlignedPolygon(
    prev: [number, number][],
    next: [number, number][],
    t: number,
): [number, number][] {
    if (prev.length < 2 || next.length < 2) {
        return t < 0.5 ? prev : next;
    }

    const sampleCount = Math.max(prev.length, next.length, 4);
    const prevCDF = buildPerimeterCDF(prev);
    const nextCDF = buildPerimeterCDF(next);
    const s = 1 - t;

    const result: [number, number][] = new Array(sampleCount);
    for (let i = 0; i < sampleCount; i++) {
        const u = i / sampleCount; // [0, 1) uniform spacing on closed perimeter
        const [px, py] = evaluateClosedAtFraction(prev, prevCDF, u);
        const [nx, ny] = evaluateClosedAtFraction(next, nextCDF, u);
        result[i] = [s * px + t * nx, s * py + t * ny];
    }

    return result;
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
