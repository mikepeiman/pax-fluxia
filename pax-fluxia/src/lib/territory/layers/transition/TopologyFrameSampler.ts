// ---------------------------------------------------------------------------
// TopologyFrameSampler.ts — Unified frame sampler: fills derived from borders
// ---------------------------------------------------------------------------
// Phase 4 of the Frontier Topology Project.
//
// Given a FrontierTransitionPlan and progress t ∈ [0,1], produces BOTH
// FillTransitionFrame and BorderTransitionFrame from the SAME interpolated
// border sections. This structurally prevents fill/border divergence.
//
// Key invariant: fills are reconstructed from interpolated borders every
// frame. There is NO independent fill interpolation pipeline.
//
// Layer: Transition (sampler — no rendering, no PIXI)
// ---------------------------------------------------------------------------

import type {
    FrontierTopology,
    FrontierSection,
    RegionLoop,
} from '../../contracts/FrontierTopologyContracts';
import type {
    FillTransitionFrame,
    BorderTransitionFrame,
} from '../../contracts/TransitionContracts';
import type {
    FrontierTransitionPlan,
    SectionTransitionEntry,
    LoopTransitionEntry,
} from './planners/FrontierTopologyPlanner';
import { otInterpolatePolyline, polylineMidpoint } from './interpolatePolylines';
import { rebuildLoopPoints } from '../../compiler/buildFrontierTopology';

// ── Constants ───────────────────────────────────────────────────────────────

/** Default sample count for OT interpolation. Higher = smoother, slower. */
const DEFAULT_SAMPLE_COUNT = 32;

// ── Section interpolation ───────────────────────────────────────────────────

/**
 * Interpolate a single section's points at progress t.
 */
function interpolateSection(
    entry: SectionTransitionEntry,
    t: number,
): [number, number][] {
    switch (entry.kind) {
        case 'static':
            // Pass through unchanged — zero jitter
            return entry.nextPoints as [number, number][];

        case 'drifted': {
            // OT interpolation between prev and next points
            const prev = entry.prevPoints!;
            const next = entry.nextPoints!;
            const sampleCount = Math.max(
                DEFAULT_SAMPLE_COUNT,
                Math.max(prev.length, next.length),
            );
            return otInterpolatePolyline(
                prev as [number, number][],
                next as [number, number][],
                t,
                sampleCount,
            );
        }

        case 'born': {
            // Expand from midpoint toward full geometry
            const target = entry.nextPoints!;
            const mid = polylineMidpoint(target as [number, number][]);
            return (target as [number, number][]).map(([x, y]) => [
                mid[0] + t * (x - mid[0]),
                mid[1] + t * (y - mid[1]),
            ] as [number, number]);
        }

        case 'dying': {
            // Collapse from full geometry toward midpoint
            const source = entry.prevPoints!;
            const mid = polylineMidpoint(source as [number, number][]);
            return (source as [number, number][]).map(([x, y]) => [
                x + t * (mid[0] - x),
                y + t * (mid[1] - y),
            ] as [number, number]);
        }
    }
}

// ── Rebuild fills from interpolated sections ────────────────────────────────

/**
 * Rebuild fill polygon points by walking a loop's section refs
 * and concatenating the interpolated border points.
 *
 * This is THE key function — fills are derived from borders.
 */
function rebuildFillFromSections(
    sectionRefs: readonly { sectionId: string; direction: 'forward' | 'reverse' }[],
    interpolatedSections: ReadonlyMap<string, [number, number][]>,
): [number, number][] {
    const points: [number, number][] = [];

    for (const ref of sectionRefs) {
        const sectionPts = interpolatedSections.get(ref.sectionId);
        if (!sectionPts || sectionPts.length === 0) continue;

        const oriented = ref.direction === 'reverse'
            ? [...sectionPts].reverse()
            : sectionPts;

        // Append points, skipping first of subsequent sections (junction duplication)
        if (points.length === 0) {
            points.push(...oriented);
        } else {
            for (let i = 1; i < oriented.length; i++) {
                points.push(oriented[i]);
            }
        }
    }

    // Close the polygon if not already closed
    if (points.length > 2) {
        const first = points[0];
        const last = points[points.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
            points.push([first[0], first[1]]);
        }
    }

    return points;
}

// ── Main entry ──────────────────────────────────────────────────────────────

export interface TopologyFrameResult {
    fillFrame: FillTransitionFrame;
    borderFrame: BorderTransitionFrame;
}

/**
 * Sample a topology transition at progress t, producing both fill and
 * border frames from the SAME interpolated section points.
 *
 * This is the architectural fix for fill/border divergence.
 *
 * @param plan      The transition plan from FrontierTopologyPlanner
 * @param next      The target FrontierTopology (for loop sectionRefs)
 * @param t         Progress [0, 1]
 */
export function sampleTopologyFrame(
    plan: FrontierTransitionPlan,
    next: FrontierTopology,
    t: number,
): TopologyFrameResult {
    // ── Edge case: snap to endpoints ─────────────────────────────────────
    if (t <= 0) {
        return buildStaticFrame(plan, 'prev');
    }
    if (t >= 1) {
        return buildStaticFrame(plan, 'next');
    }

    // ── Step 1: Interpolate all sections ─────────────────────────────────
    const interpolatedSections = new Map<string, [number, number][]>();

    for (const [sectionId, entry] of plan.sections) {
        interpolatedSections.set(sectionId, interpolateSection(entry, t));
    }

    // ── Step 2: Build border frame from interpolated sections ────────────
    const borderFrontiers: { ownerPairKey: string; points: [number, number][] }[] = [];

    for (const [sectionId, entry] of plan.sections) {
        // Skip dying sections at high t (they collapse to nothing)
        if (entry.kind === 'dying' && t > 0.95) continue;
        // Skip world borders from border frame (but keep for fills)
        if (entry.ownerPairKey.includes('world')) continue;

        const pts = interpolatedSections.get(sectionId);
        if (pts && pts.length >= 2) {
            borderFrontiers.push({
                ownerPairKey: entry.ownerPairKey,
                points: pts,
            });
        }
    }

    // ── Step 3: Build fill frame from interpolated sections via loops ────
    const fillRegions: { ownerId: string; points: [number, number][] }[] = [];

    for (const loopEntry of plan.loops) {
        if (loopEntry.kind === 'dying') {
            // Dying loops: use prevSectionRefs with interpolated (collapsing) sections
            if (loopEntry.prevSectionRefs) {
                const pts = rebuildFillFromSections(
                    loopEntry.prevSectionRefs,
                    interpolatedSections,
                );
                if (pts.length >= 3) {
                    fillRegions.push({ ownerId: loopEntry.ownerId, points: pts });
                }
            }
        } else {
            // Static, modified, born: use nextSectionRefs
            if (loopEntry.nextSectionRefs) {
                const pts = rebuildFillFromSections(
                    loopEntry.nextSectionRefs,
                    interpolatedSections,
                );
                if (pts.length >= 3) {
                    fillRegions.push({ ownerId: loopEntry.ownerId, points: pts });
                }
            }
        }
    }

    return {
        fillFrame: { regions: fillRegions },
        borderFrame: { frontiers: borderFrontiers },
    };
}

// ── Static frame builder (t=0 or t=1) ───────────────────────────────────────

function buildStaticFrame(
    plan: FrontierTransitionPlan,
    which: 'prev' | 'next',
): TopologyFrameResult {
    const sections = new Map<string, [number, number][]>();

    for (const [sectionId, entry] of plan.sections) {
        const pts = which === 'prev' ? entry.prevPoints : entry.nextPoints;
        if (pts) {
            sections.set(sectionId, pts as [number, number][]);
        }
    }

    // Border frame
    const borderFrontiers: { ownerPairKey: string; points: [number, number][] }[] = [];
    for (const [sectionId, entry] of plan.sections) {
        const pts = sections.get(sectionId);
        if (pts && pts.length >= 2 && !entry.ownerPairKey.includes('world')) {
            // Skip dying sections for 'next', born for 'prev'
            if (which === 'next' && entry.kind === 'dying') continue;
            if (which === 'prev' && entry.kind === 'born') continue;
            borderFrontiers.push({ ownerPairKey: entry.ownerPairKey, points: pts });
        }
    }

    // Fill frame
    const fillRegions: { ownerId: string; points: [number, number][] }[] = [];
    for (const loopEntry of plan.loops) {
        const refs = which === 'prev' ? loopEntry.prevSectionRefs : loopEntry.nextSectionRefs;
        if (!refs) continue;
        if (which === 'next' && loopEntry.kind === 'dying') continue;
        if (which === 'prev' && loopEntry.kind === 'born') continue;

        const pts = rebuildFillFromSections(refs, sections);
        if (pts.length >= 3) {
            fillRegions.push({ ownerId: loopEntry.ownerId, points: pts });
        }
    }

    return {
        fillFrame: { regions: fillRegions },
        borderFrame: { frontiers: borderFrontiers },
    };
}
