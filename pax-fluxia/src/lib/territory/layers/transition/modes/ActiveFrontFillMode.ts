// layers/transition/modes/ActiveFrontFillMode.ts
//
// Gap‑free territory transitions by interpolating only the *changed frontiers*
// in the shared frontier graph, then rebuilding region polygons from the
// next FrontierTopology on every frame.
//
// This replaces the broken OT polygon morph (`FrontierMorphFillMode`).[file:316]
//
// High‑level idea:
//
// 1. PLAN PHASE (once per transition)
//    - Look at previous + next FrontierTopology (if previous exists).[file:316]
//    - For each ownerPairKey (e.g. "ai-2|ai-3"), build one or more ordered
//      "front chains" from the next topology's sections for that pair.[file:316][file:314]
//    - For each next front chain, find a matching previous front chain
//      for the same ownerPairKey (if any) and sample it along the *same*
//      arclength parameter as the next chain.
//
//      Result: for every vertex along the next frontier, we know
//      - its final position (nextPoints[i])
//      - its starting position (prevAtNextParam[i])
//
//    - Measure how different the front is; if it barely moved, treat it as
//      static and skip interpolation.
//
//    - While building the next chains, record for each sectionId the
//      index range [startIndex, endIndex] it occupies inside its front.
//      This lets us slice interpolated front geometry back into per‑section
//      polylines later.
//
//    - Store:
//        * the next topology (loop structure and sections) for reconstruction
//        * a compact list of "active fronts" that actually move
//        * a map sectionId → { frontIndex, startIndex, endIndex }.
//
// 2. SAMPLE PHASE (every frame)
//    - For each active front:
//        * For each vertex index i, linearly interpolate between
//          prevAtNextParam[i] and nextPoints[i] by `t = ctx.progress`.
//        * This gives us an interpolated frontier polyline for that owner pair
//          with vertices *aligned* between the two owners, so no gaps/overlaps.
//    - For each section that belongs to an active front, slice out its piece
//      of the interpolated frontier using the recorded index range.
//    - For sections that are not part of a moving front, use their final
//      geometry directly from the next topology.
//    - Rebuild each RegionLoop from the next topology by stitching section
//      polylines in loop order (respecting forward/reverse direction). [file:316]
//    - Emit one FillTransitionFrame.region per loop (outer + holes if any).
//
// This guarantees a planar partition at all times because:
//   - Every region loop is always rebuilt from the *same* section network
//     as the next topology; we only move the points that lie on changed
//     frontiers, and we move them consistently for both owners of the frontier.

import type {
    FrontierTopology,
    FrontierSection,
    RegionLoop,
    SectionRef,
} from '../../../contracts/FrontierTopologyContracts';
import type {
    FillTransitionMode,
    FillTransitionPlan,
    FillTransitionPlanInput,
    FillTransitionFrame,
    TransitionSampleContext,
} from '../../../contracts/TransitionContracts';

// ---------------------------------------------------------------------------
// Small geometry helpers
// ---------------------------------------------------------------------------

type Vec2 = [number, number];

function sqr(x: number): number {
    return x * x;
}

function distance(a: Vec2, b: Vec2): number {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function lerpPoint(a: Vec2, b: Vec2, t: number): Vec2 {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

// Build cumulative segment lengths and total length for a polyline.
function buildArcLengthTable(points: readonly Vec2[]): {
    cumulative: number[];
    total: number;
} {
    const cumulative: number[] = new Array(points.length);
    let total = 0;
    cumulative[0] = 0;
    for (let i = 1; i < points.length; i += 1) {
        total += distance(points[i - 1], points[i]);
        cumulative[i] = total;
    }
    return { cumulative, total };
}

// Sample a polyline at a normalized arclength parameter u ∈ [0, 1].
// Returns the exact endpoint if u is 0 or 1.
// Assumes points.length >= 2; callsite must enforce this.
function samplePolylineAtParam(
    points: readonly Vec2[],
    table: { cumulative: number[]; total: number },
    u: number,
): Vec2 {
    const { cumulative, total } = table;

    if (total <= 0 || points.length === 1) {
        // Degenerate: all points coincide; just return the first one.
        return points[0];
    }

    const target = Math.min(Math.max(u, 0), 1) * total;

    // Find the first index where cumulative[i] >= target.
    // Linear scan is fine given typical frontier vertex counts (dozens).
    let i = 1;
    while (i < cumulative.length && cumulative[i] < target) {
        i += 1;
    }

    if (i === cumulative.length) {
        // Numerical edge case: return final vertex.
        return points[points.length - 1];
    }

    const prevLen = cumulative[i - 1];
    const segLen = cumulative[i] - prevLen;

    if (segLen <= 0) {
        return points[i];
    }

    const localT = (target - prevLen) / segLen;
    const p0 = points[i - 1];
    const p1 = points[i];
    return lerpPoint(p0, p1, localT);
}

// Signed polygon area (screen coordinates, no closing duplicate).
// Positive ↔ clockwise outer loops in your contracts.[file:316]
function signedArea(points: readonly Vec2[]): number {
    let sum = 0;
    const n = points.length;
    if (n < 3) return 0;
    for (let i = 0; i < n; i += 1) {
        const [x0, y0] = points[i];
        const [x1, y1] = points[(i + 1) % n];
        sum += x0 * y1 - x1 * y0;
    }
    return sum * 0.5;
}

// Simple helper to avoid duplicating vertices when concatenating polylines.
// If the last point of `out` equals the first point of `segment` (within eps),
// skip the first point of `segment`.
const VERTEX_MERGE_EPS = 1e-3;

function appendPolyline(
    out: Vec2[],
    segment: readonly Vec2[],
): { startIndex: number; endIndex: number } {
    const startIndex = out.length;
    if (segment.length === 0) {
        return { startIndex, endIndex: startIndex };
    }

    let from = 0;
    if (out.length > 0) {
        const last = out[out.length - 1];
        const first = segment[0];
        if (distance(last, first) < VERTEX_MERGE_EPS) {
            from = 1;
        }
    }

    for (let i = from; i < segment.length; i += 1) {
        out.push(segment[i]);
    }

    return { startIndex, endIndex: out.length - 1 };
}

// ---------------------------------------------------------------------------
// Front chain + active‑front planning structures
// ---------------------------------------------------------------------------

// Per‑frontier interpolation data, computed once in plan().
interface ActiveFrontPlan {
    // Index into the containing plan's `fronts[]` array.
    readonly index: number;

    // Which owner pair this frontier separates, e.g. "ai-2|ai-3".[file:316]
    readonly ownerPairKey: string;

    // Ordered vertices along the frontier in NEXT topology space.
    // This is exactly the concatenation of the `points` arrays for the
    // participating sections, with shared junction points deduplicated.
    readonly nextPoints: readonly Vec2[];

    // For each vertex in `nextPoints`, the corresponding starting position
    // on the previous topology's frontier, sampled at the same arclength
    // parameter. Same length as nextPoints.
    readonly prevAtNextParam: readonly Vec2[];

    // Precomputed arclength for `nextPoints`, used for diagnostics only.
    readonly totalLength: number;
}

// Location of one section inside a front chain.
interface SectionSpan {
    readonly frontIndex: number; // index into ActiveFrontFillPlan.fronts[]
    readonly startIndex: number; // inclusive index into fronts[frontIndex].nextPoints
    readonly endIndex: number;   // inclusive index into fronts[frontIndex].nextPoints
}

interface ActiveFrontFillPlan extends FillTransitionPlan {
    readonly prevTopology: FrontierTopology | null;
    readonly nextTopology: FrontierTopology;

    // Only frontiers that actually move (mean displacement above a tiny epsilon).
    readonly fronts: readonly ActiveFrontPlan[];

    // For every section in the NEXT topology that lies on an active front,
    // a span mapping back into `fronts[frontIndex].nextPoints`.
    readonly sectionSpans: ReadonlyMap<string, SectionSpan>;
}

// ---------------------------------------------------------------------------
// Utility: build ordered "front chains" for a given ownerPairKey
// ---------------------------------------------------------------------------

interface SectionWithOrientation {
    section: FrontierSection;
    reversed: boolean; // true if we traverse this section from end→start
}

// Build one or more ordered chains of sections for an ownerPairKey from
// a topology. Each chain is a contiguous walk: end vertex of one section
// matches the start vertex of the next (possibly after reversing).[file:316]
//
// If the topology does not contain this ownerPairKey, returns [].
function buildFrontChainsForPair(
    topo: FrontierTopology | null,
    ownerPairKey: string,
): SectionWithOrientation[][] {
    if (!topo) return [];

    const sectionIds = topo.sectionsByOwnerPair.get(ownerPairKey);
    if (!sectionIds || sectionIds.length === 0) return [];

    const unused = new Set(sectionIds);
    const byId = topo.sections;

    const chains: SectionWithOrientation[][] = [];

    // Helper: get section and assert existence (bugs should surface loudly).
    const getSection = (id: string): FrontierSection => {
        const section = byId.get(id);
        if (!section) {
            throw new Error(`Front chain build: missing section "${id}" for ownerPair ${ownerPairKey}`);
        }
        return section;
    };

    while (unused.size > 0) {
        // Start a new chain from an arbitrary unused section.
        const [seedId] = unused;
        unused.delete(seedId);
        const seed = getSection(seedId);

        const chain: SectionWithOrientation[] = [
            { section: seed, reversed: false },
        ];

        // We'll grow the chain in both directions from this seed.
        let headVertex = seed.startVertexId;
        let tailVertex = seed.endVertexId;

        // Precompute vertex→sections adjacency for this owner pair.
        const sectionsByVertex = new Map<string, string[]>();
        for (const id of sectionIds) {
            const s = getSection(id);
            const listA = sectionsByVertex.get(s.startVertexId) ?? [];
            const listB = sectionsByVertex.get(s.endVertexId) ?? [];
            listA.push(id);
            listB.push(id);
            sectionsByVertex.set(s.startVertexId, listA);
            sectionsByVertex.set(s.endVertexId, listB);
        }

        const attachAt = (
            atHead: boolean,
        ) => {
            const vertexId = atHead ? headVertex : tailVertex;
            const neighbors = sectionsByVertex.get(vertexId);
            if (!neighbors) return false;

            for (const candidateId of neighbors) {
                if (!unused.has(candidateId)) continue;
                const s = getSection(candidateId);

                // Decide orientation based on which endpoint touches this vertex.
                if (s.startVertexId === vertexId) {
                    // We want vertexId to be the *end* of the previous section and the
                    // *start* of this one. When attaching at the head, we traverse
                    // new section backward; when at the tail, forward.
                    const reversed = atHead ? true : false;
                    unused.delete(candidateId);
                    if (atHead) {
                        chain.unshift({ section: s, reversed });
                        headVertex = reversed ? s.endVertexId : s.startVertexId;
                    } else {
                        chain.push({ section: s, reversed });
                        tailVertex = reversed ? s.startVertexId : s.endVertexId;
                    }
                    return true;
                }
                if (s.endVertexId === vertexId) {
                    const reversed = atHead ? false : true;
                    unused.delete(candidateId);
                    if (atHead) {
                        chain.unshift({ section: s, reversed });
                        headVertex = reversed ? s.endVertexId : s.startVertexId;
                    } else {
                        chain.push({ section: s, reversed });
                        tailVertex = reversed ? s.startVertexId : s.endVertexId;
                    }
                    return true;
                }
            }

            return false;
        };

        // Grow until no more neighbors on either side.
        // In practice these chains are short, so simple looping is fine.
        let extended = true;
        while (extended) {
            extended = false;
            if (attachAt(true)) extended = true;
            if (attachAt(false)) extended = true;
        }

        chains.push(chain);
    }

    return chains;
}

// Get oriented points for a section. If `reversed` is true, returns a
// new array in reverse order.
function sectionPointsWithOrientation(
    section: FrontierSection,
    reversed: boolean,
): Vec2[] {
    if (!reversed) {
        return section.points as Vec2[];
    }
    const pts = section.points;
    const out: Vec2[] = new Array(pts.length);
    for (let i = 0; i < pts.length; i += 1) {
        const src = pts[pts.length - 1 - i];
        out[i] = [src[0], src[1]];
    }
    return out;
}

// ---------------------------------------------------------------------------
// PLAN: build ActiveFrontFillPlan
// ---------------------------------------------------------------------------

// Mode ID must match the FillTransitionModeId union string in TerritoryModeSelection.ts
const ACTIVE_FRONT_MODE_ID = 'active_front' as const;

// Tuning constants.
// Fronts with mean per‑vertex movement below this threshold will be
// treated as static and not interpolated.
const MIN_MEAN_FRONT_DISPLACEMENT = 0.25; // world pixels, deliberately small

export const ActiveFrontFillMode: FillTransitionMode = {
    id: ACTIVE_FRONT_MODE_ID,
    label: 'Active Front Interpolation',

    plan(input: FillTransitionPlanInput): ActiveFrontFillPlan {
        const prevTopology = input.previousGeometry?.frontierTopology ?? null;
        const nextTopology = input.nextGeometry.frontierTopology as FrontierTopology; // per contracts[file:316]

        // Base fields required by FillTransitionPlan.[file:316]
        const basePlan: FillTransitionPlan = {
            planId: `active-front:${input.nextGeometry.version}`, // you can pick any stable ID scheme
            sourceMode: ACTIVE_FRONT_MODE_ID,
            startGeometryVersion: prevTopology ? prevTopology.version : nextTopology.version,
            endGeometryVersion: nextTopology.version,
            conquestEvents: input.ownership.conquestEvents ?? [],
        };

        const fronts: ActiveFrontPlan[] = [];
        const sectionSpans = new Map<string, SectionSpan>();

        // Collect all ownerPairKeys that exist in either topology.[file:316][file:314]
        const ownerPairKeys = new Set<string>();

        if (prevTopology) {
            for (const key of prevTopology.sectionsByOwnerPair.keys()) {
                ownerPairKeys.add(key);
            }
        }
        for (const key of nextTopology.sectionsByOwnerPair.keys()) {
            ownerPairKeys.add(key);
        }

        // For each owner pair, compare previous + next front chains and decide
        // which ones are "active" (worth interpolating).
        for (const ownerPairKey of ownerPairKeys) {
            // 1. Build chains for this pair in prev + next topologies.
            const prevChains = buildFrontChainsForPair(prevTopology, ownerPairKey);
            const nextChains = buildFrontChainsForPair(nextTopology, ownerPairKey);

            if (nextChains.length === 0) {
                // No frontier for this pair in the final topology -> nothing to
                // reconstruct; deleted borders vanish by virtue of the next loops.
                continue;
            }

            // 2. For each NEXT chain, find the best matching PREV chain (if any)
            //    based on centroid distance. This is robust to occasional
            //    section‑ID reshuffles.[file:316]
            const usedPrev = new Set<number>();

            const computeCentroid = (sections: SectionWithOrientation[]): Vec2 => {
                let sumX = 0;
                let sumY = 0;
                let count = 0;
                for (const { section, reversed } of sections) {
                    const pts = sectionPointsWithOrientation(section, reversed);
                    for (const [x, y] of pts) {
                        sumX += x;
                        sumY += y;
                        count += 1;
                    }
                }
                if (count === 0) return [0, 0];
                return [sumX / count, sumY / count];
            };

            const prevCentroids = prevChains.map(computeCentroid);

            for (const nextChain of nextChains) {
                const nextCentroid = computeCentroid(nextChain);

                let bestPrevIndex: number | null = null;
                let bestPrevDist = Infinity;

                for (let i = 0; i < prevChains.length; i += 1) {
                    if (usedPrev.has(i)) continue;
                    const d = distance(nextCentroid, prevCentroids[i]);
                    if (d < bestPrevDist) {
                        bestPrevDist = d;
                        bestPrevIndex = i;
                    }
                }

                const matchedPrevChain =
                    bestPrevIndex !== null ? prevChains[bestPrevIndex] : null;
                if (bestPrevIndex !== null) {
                    usedPrev.add(bestPrevIndex);
                }

                // ── ActiveFront correspondence trace ─────────────────
                console.log('[ActiveFront:MATCH]', JSON.stringify({
                    ownerPairKey,
                    nextChainLen: nextChain.length,
                    prevChainLen: prevChains.length,
                    matchedPrevIdx: bestPrevIndex,
                    matchedDist: bestPrevDist === Infinity ? 'none' : bestPrevDist.toFixed(1),
                }));

                // 3. Concatenate the NEXT chain's sections into one frontier polyline,
                //    while remembering the index span for each section.
                const nextPoints: Vec2[] = [];
                const localSectionSpans: { sectionId: string; span: SectionSpan }[] = [];

                const frontIndex = fronts.length; // index into `fronts` array for this chain

                for (const { section, reversed } of nextChain) {
                    const oriented = sectionPointsWithOrientation(section, reversed);
                    const { startIndex, endIndex } = appendPolyline(nextPoints, oriented);

                    localSectionSpans.push({
                        sectionId: section.id,
                        span: { frontIndex, startIndex, endIndex },
                    });
                }

                if (nextPoints.length < 2) {
                    // Degenerate: nothing to interpolate; still record spans so that
                    // reconstruction uses NEXT geometry directly.
                    for (const { sectionId, span } of localSectionSpans) {
                        sectionSpans.set(sectionId, span);
                    }
                    continue;
                }

                // 4. Build the PREV counterpart polyline, if a match exists.
                //    If there is no previous chain (pure insertion), we will treat
                //    the entire frontier as "growing" out of a collapsed segment.
                let prevPolyline: Vec2[];
                if (matchedPrevChain && matchedPrevChain.length > 0) {
                    prevPolyline = [];
                    for (const { section, reversed } of matchedPrevChain) {
                        const oriented = sectionPointsWithOrientation(section, reversed);
                        appendPolyline(prevPolyline, oriented);
                    }
                } else {
                    // Collapsed frontier: we use all NEXT vertices but sampled from
                    // a single point (the centroid). This makes the front appear to
                    // expand from that point instead of popping in.
                    const cx =
                        nextPoints.reduce((s, p) => s + p[0], 0) / nextPoints.length;
                    const cy =
                        nextPoints.reduce((s, p) => s + p[1], 0) / nextPoints.length;
                    prevPolyline = new Array(nextPoints.length).fill(null).map(() => [
                        cx,
                        cy,
                    ]) as Vec2[];
                }

                // Build arclength tables and sample PREV at the NEXT vertices'
                // normalized arclengths. This aligns corresponding points along
                // the frontier so that both owners share the same animated curve.
                const nextTable = buildArcLengthTable(nextPoints);
                const prevTable = buildArcLengthTable(prevPolyline);

                const prevAtNextParam: Vec2[] = [];
                const n = nextPoints.length;
                for (let i = 0; i < n; i += 1) {
                    const u =
                        nextTable.total <= 0
                            ? 0
                            : nextTable.cumulative[i] / nextTable.total;
                    prevAtNextParam.push(
                        samplePolylineAtParam(prevPolyline, prevTable, u),
                    );
                }

                // 5. Decide whether this frontier actually "moves" enough to warrant
                //    interpolation. Many owner pairs will be nearly unchanged.[file:315]
                let meanDisp = 0;
                for (let i = 0; i < n; i += 1) {
                    meanDisp += distance(prevAtNextParam[i], nextPoints[i]);
                }
                meanDisp /= n;

                if (meanDisp < MIN_MEAN_FRONT_DISPLACEMENT) {
                    // Essentially static; we skip active‑front interpolation for this
                    // chain but still record spans so reconstruction can use NEXT
                    // geometry directly.
                    for (const { sectionId, span } of localSectionSpans) {
                        sectionSpans.set(sectionId, span);
                    }
                    continue;
                }

                // 6. Record this active front.
                const frontPlan: ActiveFrontPlan = {
                    index: frontIndex,
                    ownerPairKey,
                    nextPoints,
                    prevAtNextParam,
                    totalLength: nextTable.total,
                };
                fronts.push(frontPlan);

                for (const { sectionId, span } of localSectionSpans) {
                    sectionSpans.set(sectionId, span);
                }
            }
        }

        const plan: ActiveFrontFillPlan = {
            ...(basePlan as FillTransitionPlan),
            prevTopology,
            nextTopology,
            fronts,
            sectionSpans,
        };

        // ── ActiveFront plan summary trace ────────────────────────
        console.log('[ActiveFront:PLAN]', JSON.stringify({
            totalOwnerPairs: ownerPairKeys.size,
            activeFronts: fronts.length,
            sectionSpans: sectionSpans.size,
            prevTopologyExists: !!prevTopology,
        }));

        return plan;
    },

    // -------------------------------------------------------------------------
    // SAMPLE: build one FillTransitionFrame at time t
    // -------------------------------------------------------------------------

    sample(basePlan: FillTransitionPlan, ctx: TransitionSampleContext): FillTransitionFrame {
        const plan = basePlan as ActiveFrontFillPlan;
        const { nextTopology, fronts, sectionSpans } = plan;
        const t = Math.min(Math.max(ctx.progress, 0), 1);

        // 1. If there is no previous topology or t >= 1, just emit the final
        //    territory shapes reconstructed from NEXT geometry. This makes the
        //    mode safe even if callers sample beyond [0,1].
        if (!plan.prevTopology || t >= 1) {
            return buildFrameFromTopology(nextTopology);
        }
        if (t <= 0) {
            // At t=0 we want to show the exact previous geometry. Because we only
            // have the previous topology (not the previous region polygons) here,
            // we reconstruct from the previous topology instead.[file:316][file:313]
            return buildFrameFromTopology(plan.prevTopology);
        }

        // 2. For each active front, compute the interpolated frontier vertices.
        //    We store them in a parallel array for easy slicing later.
        const interpolatedFrontPoints: Vec2[][] = fronts.map((front) => {
            const pts: Vec2[] = new Array(front.nextPoints.length);
            for (let i = 0; i < front.nextPoints.length; i += 1) {
                pts[i] = lerpPoint(front.prevAtNextParam[i], front.nextPoints[i], t);
            }
            return pts;
        });

        // 3. For each section on an active front, slice its segment out of the
        //    interpolated frontier and cache the resulting polyline.
        const sectionGeometry = new Map<string, Vec2[]>();

        for (const [sectionId, span] of sectionSpans.entries()) {
            const frontPoints = interpolatedFrontPoints[span.frontIndex];
            const slice = frontPoints.slice(span.startIndex, span.endIndex + 1);
            sectionGeometry.set(sectionId, slice);
        }

        // 4. Rebuild region loops from the NEXT topology using either
        //    interpolated section geometry (for active fronts) or the
        //    canonical NEXT section geometry (for static fronts).
        const regions: { ownerId: string; points: Vec2[] }[] = [];

        for (const loop of nextTopology.loops) {
            const loopPoints: Vec2[] = [];

            for (const ref of loop.sectionRefs) {
                const section = nextTopology.sections.get(ref.sectionId);
                if (!section) {
                    // Invariant violation; safest is to skip this ref.
                    // Dev builds can throw instead to catch data issues.
                    // eslint-disable-next-line no-continue
                    continue;
                }

                const basePolyline =
                    sectionGeometry.get(section.id) ??
                    (section.points as Vec2[]); // static fallback

                // Respect RegionLoop's direction flag. Forward means we follow the
                // section's canonical orientation; reverse flips it.[file:316]
                const oriented: Vec2[] =
                    ref.direction === 'forward'
                        ? basePolyline
                        : [...basePolyline].reverse();

                const { startIndex } = appendPolyline(loopPoints, oriented);
                if (startIndex === loopPoints.length - 1) {
                    // Section contributed no new vertices (completely collapsed);
                    // safe to continue.
                    // eslint-disable-next-line no-continue
                    continue;
                }
            }

            if (loopPoints.length < 3) {
                // Probably a degenerate sliver; skip to avoid triangulation issues.
                // You can tune this threshold based on your renderer.[file:316]
                continue;
            }

            // Optional: drop microscopic regions to avoid flicker near collapse.
            const area = Math.abs(signedArea(loopPoints));
            const MIN_REGION_AREA = 10; // px², mirrored from your old mode.[file:316]
            if (area < MIN_REGION_AREA) {
                continue;
            }

            regions.push({
                ownerId: loop.ownerId,
                points: loopPoints,
            });
        }

        // ── ActiveFront per-frame trace + winding diagnostics ────
        let windingFlips = 0;
        for (const loop of nextTopology.loops) {
            const region = regions.find(r => r.ownerId === loop.ownerId);
            if (!region) continue;
            const actualArea = signedArea(region.points);
            const expectedSign = loop.sectionRefs.length > 0 ? 1 : -1; // CW expected for outer
            if ((actualArea > 0) !== (expectedSign > 0)) {
                windingFlips++;
                console.warn('[ActiveFront:WINDING]', JSON.stringify({
                    loopId: loop.id,
                    ownerId: loop.ownerId,
                    actualArea: actualArea.toFixed(1),
                    sectionCount: loop.sectionRefs.length,
                    t: t.toFixed(3),
                }));
            }
        }
        console.log('[ActiveFront:FRAME]', JSON.stringify({
            t: t.toFixed(3),
            activeFronts: fronts.length,
            interpolatedSections: sectionGeometry.size,
            totalSections: nextTopology.sections.size,
            emittedRegions: regions.length,
            expectedLoops: nextTopology.loops.length,
            droppedLoops: nextTopology.loops.length - regions.length,
            windingFlips,
        }));

        return { regions };
    },
};

// ---------------------------------------------------------------------------
// Helper: reconstruct a static FillTransitionFrame from a FrontierTopology
// ---------------------------------------------------------------------------

// This is used for the t=0 / t=1 fallback paths, where we want a frame
// that exactly matches either the previous or next topology without any
// interpolation. It rebuilds polygons from loops + sections using the
// same stitching logic as in the animated path, but with no active fronts.
function buildFrameFromTopology(topo: FrontierTopology): FillTransitionFrame {
    const regions: { ownerId: string; points: Vec2[] }[] = [];

    for (const loop of topo.loops) {
        const loopPoints: Vec2[] = [];

        for (const ref of loop.sectionRefs as readonly SectionRef[]) {
            const section = topo.sections.get(ref.sectionId);
            if (!section) continue;

            const basePolyline = section.points as Vec2[];
            const oriented =
                ref.direction === 'forward'
                    ? basePolyline
                    : [...basePolyline].reverse();

            appendPolyline(loopPoints, oriented);
        }

        if (loopPoints.length < 3) continue;

        const area = Math.abs(signedArea(loopPoints));
        const MIN_REGION_AREA = 10;
        if (area < MIN_REGION_AREA) continue;

        regions.push({
            ownerId: loop.ownerId,
            points: loopPoints,
        });
    }

    return { regions };
}