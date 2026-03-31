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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Minimum absolute area (in world-px²) for a region to be emitted.
 * Regions below this threshold are degenerate slivers or collapsed loops
 * and get silently dropped rather than submitted to PIXI for triangulation.
 */
const MIN_REGION_AREA = 10;

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

        if (!typedPlan.previousTopology || !typedPlan.targetTopology) {
            return { regions: [] };
        }

        const prevTopology = typedPlan.previousTopology;
        const nextTopology = typedPlan.targetTopology;

        // ─── Phase 1: Build prev-loop point arrays with centroids ────────
        // Pre-compute once so we can use them for both section-ID matching
        // and centroid-proximity fallback matching.
        const prevByOwner = new Map<string, { loop: RegionLoop; points: [number, number][]; centroid: [number, number] }[]>();
        for (const loop of prevTopology.loops) {
            const points = rebuildLoopPoints(loop, prevTopology.sections);
            const centroid = polygonCentroid(points);
            const entry = { loop, points, centroid };
            const arr = prevByOwner.get(loop.ownerId);
            if (arr) arr.push(entry); else prevByOwner.set(loop.ownerId, [entry]);
        }

        const matchedPrevLoopIds = new Set<string>();
        const regions: { ownerId: string; points: [number, number][] }[] = [];

        // ─── Phase 2: Match next loops to prev loops ─────────────────────
        // Strategy:
        //   A. First try section-ID matching (shared topological boundary)
        //   B. Fall back to centroid-proximity matching (nearest same-owner loop)
        // This prevents connected regions from vanishing/spawning just because
        // a conquest changed all their section IDs.
        for (const nextLoop of nextTopology.loops) {
            const nextPoints = rebuildLoopPoints(nextLoop, nextTopology.sections);
            const nextCentroid = polygonCentroid(nextPoints);

            // --- Strategy A: Section-ID match ---
            let bestPrevEntry: { loop: RegionLoop; points: [number, number][]; centroid: [number, number] } | undefined;
            let sharedSectionId: string | undefined;

            const candidates = prevByOwner.get(nextLoop.ownerId) || [];
            for (const nextRef of nextLoop.sectionRefs) {
                for (const entry of candidates) {
                    if (matchedPrevLoopIds.has(entry.loop.id)) continue;
                    if (entry.loop.sectionRefs.some(r => r.sectionId === nextRef.sectionId)) {
                        bestPrevEntry = entry;
                        sharedSectionId = nextRef.sectionId;
                        break;
                    }
                }
                if (bestPrevEntry) break;
            }

            // --- Strategy B: Centroid-proximity fallback ---
            // If no shared section found, find the nearest unmatched prev loop
            // for the same owner by Euclidean centroid distance.
            if (!bestPrevEntry) {
                let bestDist = Infinity;
                for (const entry of candidates) {
                    if (matchedPrevLoopIds.has(entry.loop.id)) continue;
                    const dx = entry.centroid[0] - nextCentroid[0];
                    const dy = entry.centroid[1] - nextCentroid[1];
                    const dist = dx * dx + dy * dy;
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestPrevEntry = entry;
                    }
                }
            }

            if (bestPrevEntry) {
                matchedPrevLoopIds.add(bestPrevEntry.loop.id);

                if (sharedSectionId) {
                    // Section-aligned OT interpolation:
                    // Rotate both polygons so they start at the shared section's
                    // start vertex, then CDF-sample between them.
                    const prevAligned = rebuildAndAlign(bestPrevEntry.loop, prevTopology.sections, sharedSectionId);
                    const nextAligned = rebuildAndAlign(nextLoop, nextTopology.sections, sharedSectionId);
                    regions.push({
                        ownerId: nextLoop.ownerId,
                        points: otInterpolateAlignedPolygon(prevAligned, nextAligned, t),
                    });
                } else {
                    // Centroid-proximity match (no shared section):
                    // Use raw OT interpolation without section alignment.
                    // The CDF sampler handles differing vertex counts and positions,
                    // though without alignment the morph may twist slightly.
                    regions.push({
                        ownerId: nextLoop.ownerId,
                        points: otInterpolateAlignedPolygon(bestPrevEntry.points, nextPoints, t),
                    });
                }
            } else {
                // Pure spawn: truly new region with no prior same-owner territory.
                // Grow from centroid → full shape over the transition.
                regions.push({
                    ownerId: nextLoop.ownerId,
                    points: nextPoints.map(([x, y]) => [
                        nextCentroid[0] + t * (x - nextCentroid[0]),
                        nextCentroid[1] + t * (y - nextCentroid[1]),
                    ] as [number, number]),
                });
            }
        }

        // ─── Phase 3: Vanishing prev loops (unmatched) ───────────────────
        // Only loops that truly have no successor should vanish.
        // After centroid fallback, this should be rare — only when an owner
        // lost ALL territory.
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

        // ─── Phase 4: Filter degenerate regions ──────────────────────────
        // Drop regions with near-zero area or too few points.
        // These are collapsed slivers from degenerate topology loops that
        // produce visual artifacts and crash earcut.
        const validRegions = regions.filter(r => {
            if (r.points.length < 3) return false;
            const area = Math.abs(shoelaceArea(r.points));
            return area >= MIN_REGION_AREA;
        });

        // ─── Phase 5: Dev validation ─────────────────────────────────────
        if (import.meta.env.DEV) {
            const { invalidCount } = validateFillFrame(validRegions, `t=${t.toFixed(3)}`, true);
            if (invalidCount > 0) {
                log.renderer('FrontierMorphFill',
                    `WARNING: ${invalidCount}/${validRegions.length} regions invalid at t=${t.toFixed(3)}`,
                );
            }
        }

        return { regions: validRegions };
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Rebuild canonical loop points via `rebuildLoopPoints`, then rotate the
 * resulting open polygon array so that index 0 begins at the start of the
 * specified alignment section.
 *
 * WHY ROTATION MATTERS FOR OT:
 * The OT perimeter-CDF sampler maps uniform fractions [0, 1) onto each
 * polygon's perimeter independently. If two polygons start at very different
 * positions around their shared boundary, the sampler's corresponding points
 * will land on geometrically disparate edges → crossing interpolation lines.
 * By rotating both prev and next to start at the same shared junction vertex
 * (the start of `alignSectionId`), we guarantee the perimeter maps are
 * co-anchored and the interpolation is locally coherent.
 *
 * HOW OFFSETS ARE COUNTED (as of the fixed rebuildLoopPoints):
 * Every section contributes exactly (section.points.length - 1) points.
 * This is because we skip the LAST point of each section — it's always
 * identical to the FIRST point of the next section (the shared junction vertex).
 * The final section's skipped last point equals the loop's starting vertex,
 * which prevents a closing duplicate.
 */
function rebuildAndAlign(
    loop: RegionLoop,
    sections: ReadonlyMap<string, FrontierSection>,
    alignSectionId: string,
): [number, number][] {
    // Build the canonical open polygon (no closing duplicate, no re-reversal)
    const points = rebuildLoopPoints(loop, sections);
    if (points.length === 0) return points;

    // Walk sectionRefs to find how many points precede the alignment section.
    // Each section contributes exactly (section.points.length - 1) output points.
    let offset = 0;
    let rotationOffset = 0;
    let found = false;

    for (const ref of loop.sectionRefs) {
        if (ref.sectionId === alignSectionId) {
            rotationOffset = offset;
            found = true;
            break;
        }
        const section = sections.get(ref.sectionId);
        if (!section) continue;
        // Every section: contributes points.length - 1 (last point skipped)
        offset += section.points.length - 1;
    }

    // If the alignment section is the first one (offset=0) or not found,
    // no rotation is needed
    if (!found || rotationOffset === 0) return points;

    // Rotate so the alignment section's start vertex lands at index 0
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

/**
 * Shoelace area for an open polygon (no closing duplicate expected).
 * Positive = clockwise (standard screen coords), negative = counterclockwise.
 */
function shoelaceArea(points: readonly [number, number][]): number {
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += points[i][0] * points[j][1];
        area -= points[j][0] * points[i][1];
    }
    return area / 2;
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
