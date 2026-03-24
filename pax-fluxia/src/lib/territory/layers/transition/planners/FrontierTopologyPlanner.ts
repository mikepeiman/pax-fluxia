// ---------------------------------------------------------------------------
// FrontierTopologyPlanner.ts — Section-aware transition planning
// ---------------------------------------------------------------------------
// Phase 3 of the Frontier Topology Project.
//
// Diffs two FrontierTopology snapshots (prev and next) and produces a
// FrontierTransitionPlan that drives Phase 4's unified frame sampler.
//
// The plan classifies each section as static, drifted, born, or dying,
// and matches region loops across frames.
//
// Layer: Transition (planner — no rendering, no PIXI)
// ---------------------------------------------------------------------------

import type {
    FrontierTopology,
    FrontierSection,
    FrontierVertex,
    RegionLoop,
} from '../../../contracts/FrontierTopologyContracts';
import type { TerritoryConquestEvent } from '../../../contracts/OwnershipContracts';
import { log } from '$lib/utils/logger';

// ── Plan types ──────────────────────────────────────────────────────────────

/** Classification of a section's transition behavior. */
export type SectionTransitionKind =
    | 'static'   // same section, same points — pass through bit-identical
    | 'drifted'  // same identity, different points — interpolate
    | 'born'     // new section — grow from midpoint anchor
    | 'dying';   // removed section — shrink to midpoint anchor

/** One section's transition entry in the plan. */
export interface SectionTransitionEntry {
    kind: SectionTransitionKind;
    /** Section ID in the canonical namespace. */
    sectionId: string;
    /** Points array from the previous topology (null for born). */
    prevPoints: readonly [number, number][] | null;
    /** Points array from the next topology (null for dying). */
    nextPoints: readonly [number, number][] | null;
    /** Owner pair key for this section. */
    ownerPairKey: string;
}

/** A matched pair of region loops across frames. */
export interface LoopTransitionEntry {
    kind: 'static' | 'modified' | 'born' | 'dying';
    /** Loop ID (from next topology for modified/born, prev for dying). */
    loopId: string;
    ownerId: string;
    /** Section refs from prev loop (null for born). */
    prevSectionRefs: readonly { sectionId: string; direction: 'forward' | 'reverse' }[] | null;
    /** Section refs from next loop (null for dying). */
    nextSectionRefs: readonly { sectionId: string; direction: 'forward' | 'reverse' }[] | null;
}

/** Complete transition plan for one conquest event. */
export interface FrontierTransitionPlan {
    prevVersion: string;
    nextVersion: string;
    sections: ReadonlyMap<string, SectionTransitionEntry>;
    loops: readonly LoopTransitionEntry[];
}

// ── Vertex matching ─────────────────────────────────────────────────────────

/**
 * Match vertices between prev and next topologies.
 *
 * Strategy:
 * 1. Exact ID match (ptKey is deterministic for same position)
 * 2. Spatial proximity for unmatched vertices (within threshold)
 */
function matchVertices(
    prev: ReadonlyMap<string, FrontierVertex>,
    next: ReadonlyMap<string, FrontierVertex>,
    proximityThreshold = 50,
): Map<string, string> { // prevVertexId → nextVertexId
    const matches = new Map<string, string>();
    const usedNext = new Set<string>();

    // Pass 1: exact ID match
    for (const [prevId] of prev) {
        if (next.has(prevId)) {
            matches.set(prevId, prevId);
            usedNext.add(prevId);
        }
    }

    // Pass 2: spatial proximity for unmatched
    const unmatchedPrev = [...prev.values()].filter(v => !matches.has(v.id));
    const unmatchedNext = [...next.values()].filter(v => !usedNext.has(v.id));

    for (const pv of unmatchedPrev) {
        let bestDist = proximityThreshold * proximityThreshold;
        let bestId: string | null = null;

        for (const nv of unmatchedNext) {
            if (usedNext.has(nv.id)) continue;
            const dx = pv.point[0] - nv.point[0];
            const dy = pv.point[1] - nv.point[1];
            const d2 = dx * dx + dy * dy;
            if (d2 < bestDist) {
                bestDist = d2;
                bestId = nv.id;
            }
        }

        if (bestId) {
            matches.set(pv.id, bestId);
            usedNext.add(bestId);
        }
    }

    return matches;
}

// ── Section matching ────────────────────────────────────────────────────────

/**
 * Match sections between prev and next topologies.
 *
 * Strategy: group sections by ownerPairKey, then match within each group
 * by endpoint vertex matches and midpoint proximity.
 */
function matchSections(
    prev: ReadonlyMap<string, FrontierSection>,
    next: ReadonlyMap<string, FrontierSection>,
    vertexMatches: Map<string, string>,
): {
    matched: Map<string, { prevSection: FrontierSection; nextSection: FrontierSection }>;
    born: FrontierSection[];
    dying: FrontierSection[];
} {
    const matched = new Map<string, { prevSection: FrontierSection; nextSection: FrontierSection }>();
    const usedPrev = new Set<string>();
    const usedNext = new Set<string>();

    // Group by ownerPairKey
    const prevByPair = new Map<string, FrontierSection[]>();
    const nextByPair = new Map<string, FrontierSection[]>();

    for (const s of prev.values()) {
        const arr = prevByPair.get(s.ownerPairKey) ?? [];
        arr.push(s);
        prevByPair.set(s.ownerPairKey, arr);
    }
    for (const s of next.values()) {
        const arr = nextByPair.get(s.ownerPairKey) ?? [];
        arr.push(s);
        nextByPair.set(s.ownerPairKey, arr);
    }

    // For each owner pair, match sections
    const allPairs = new Set([...prevByPair.keys(), ...nextByPair.keys()]);
    for (const pairKey of allPairs) {
        const prevSections = prevByPair.get(pairKey) ?? [];
        const nextSections = nextByPair.get(pairKey) ?? [];

        // Score all prev×next combinations
        type Candidate = { prevS: FrontierSection; nextS: FrontierSection; score: number };
        const candidates: Candidate[] = [];

        for (const ps of prevSections) {
            for (const ns of nextSections) {
                let score = 0;

                // Endpoint vertex match bonus (high weight)
                const prevStart = vertexMatches.get(ps.startVertexId);
                const prevEnd = vertexMatches.get(ps.endVertexId);
                if (prevStart === ns.startVertexId) score += 100;
                if (prevEnd === ns.endVertexId) score += 100;
                // Reversed orientation match
                if (prevStart === ns.endVertexId) score += 80;
                if (prevEnd === ns.startVertexId) score += 80;

                // Midpoint proximity bonus (medium weight)
                const prevMid = getMidpoint(ps.points);
                const nextMid = getMidpoint(ns.points);
                const dist = Math.sqrt(
                    (prevMid[0] - nextMid[0]) ** 2 +
                    (prevMid[1] - nextMid[1]) ** 2,
                );
                score += Math.max(0, 50 - dist); // up to 50 for nearby midpoints

                // Length similarity (low weight)
                const lenRatio = Math.min(ps.length, ns.length) / Math.max(ps.length, ns.length);
                score += lenRatio * 20;

                candidates.push({ prevS: ps, nextS: ns, score });
            }
        }

        // Greedy assignment: best score first
        candidates.sort((a, b) => b.score - a.score);
        for (const c of candidates) {
            if (usedPrev.has(c.prevS.id) || usedNext.has(c.nextS.id)) continue;
            matched.set(c.nextS.id, { prevSection: c.prevS, nextSection: c.nextS });
            usedPrev.add(c.prevS.id);
            usedNext.add(c.nextS.id);
        }
    }

    // Unmatched → born or dying
    const born = [...next.values()].filter(s => !usedNext.has(s.id));
    const dying = [...prev.values()].filter(s => !usedPrev.has(s.id));

    return { matched, born, dying };
}

function getMidpoint(points: readonly [number, number][]): [number, number] {
    if (points.length === 0) return [0, 0];
    const mid = Math.floor(points.length / 2);
    return points[mid];
}

// ── Loop matching ───────────────────────────────────────────────────────────

function matchLoops(
    prevLoops: readonly RegionLoop[],
    nextLoops: readonly RegionLoop[],
    sectionMatches: Map<string, { prevSection: FrontierSection; nextSection: FrontierSection }>,
): LoopTransitionEntry[] {
    const result: LoopTransitionEntry[] = [];
    const usedPrev = new Set<string>();
    const usedNext = new Set<string>();

    // Map prev section IDs to next section IDs for overlap calculation
    const prevToNextSection = new Map<string, string>();
    for (const [nextId, match] of sectionMatches) {
        prevToNextSection.set(match.prevSection.id, nextId);
    }

    // Match by ownerId + maximum section overlap
    for (const nextLoop of nextLoops) {
        let bestPrevLoop: RegionLoop | null = null;
        let bestOverlap = 0;

        for (const prevLoop of prevLoops) {
            if (usedPrev.has(prevLoop.id)) continue;
            if (prevLoop.ownerId !== nextLoop.ownerId) continue;

            // Count how many of prevLoop's sections map to sections in nextLoop
            const nextSectionIds = new Set(nextLoop.sectionRefs.map(r => r.sectionId));
            let overlap = 0;
            for (const ref of prevLoop.sectionRefs) {
                const mappedNextId = prevToNextSection.get(ref.sectionId);
                if (mappedNextId && nextSectionIds.has(mappedNextId)) {
                    overlap++;
                }
            }

            if (overlap > bestOverlap) {
                bestOverlap = overlap;
                bestPrevLoop = prevLoop;
            }
        }

        if (bestPrevLoop) {
            usedPrev.add(bestPrevLoop.id);
            usedNext.add(nextLoop.id);

            // Determine if static or modified
            const allSectionsSame = nextLoop.sectionRefs.every(ref => {
                const match = sectionMatches.get(ref.sectionId);
                if (!match) return false;
                return pointsEqual(match.prevSection.points, match.nextSection.points);
            });

            result.push({
                kind: allSectionsSame ? 'static' : 'modified',
                loopId: nextLoop.id,
                ownerId: nextLoop.ownerId,
                prevSectionRefs: bestPrevLoop.sectionRefs,
                nextSectionRefs: nextLoop.sectionRefs,
            });
        } else {
            // No prev match → born loop
            result.push({
                kind: 'born',
                loopId: nextLoop.id,
                ownerId: nextLoop.ownerId,
                prevSectionRefs: null,
                nextSectionRefs: nextLoop.sectionRefs,
            });
            usedNext.add(nextLoop.id);
        }
    }

    // Unmatched prev loops → dying
    for (const prevLoop of prevLoops) {
        if (!usedPrev.has(prevLoop.id)) {
            result.push({
                kind: 'dying',
                loopId: prevLoop.id,
                ownerId: prevLoop.ownerId,
                prevSectionRefs: prevLoop.sectionRefs,
                nextSectionRefs: null,
            });
        }
    }

    return result;
}

function pointsEqual(
    a: readonly [number, number][],
    b: readonly [number, number][],
): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
    }
    return true;
}

// ── Main entry ──────────────────────────────────────────────────────────────

/**
 * Build a FrontierTransitionPlan by diffing two FrontierTopology snapshots.
 *
 * Classifies each section as static, drifted, born, or dying.
 * Matches region loops by owner + section overlap.
 */
export function buildFrontierTransitionPlan(
    prev: FrontierTopology,
    next: FrontierTopology,
): FrontierTransitionPlan {
    // Step 1-2: match vertices
    const vertexMatches = matchVertices(prev.vertices, next.vertices);

    // Step 3-5: match sections
    const { matched, born, dying } = matchSections(
        prev.sections,
        next.sections,
        vertexMatches,
    );

    // Build section transition entries
    const sections = new Map<string, SectionTransitionEntry>();

    for (const [nextId, match] of matched) {
        const isStatic = pointsEqual(match.prevSection.points, match.nextSection.points);
        sections.set(nextId, {
            kind: isStatic ? 'static' : 'drifted',
            sectionId: nextId,
            prevPoints: match.prevSection.points,
            nextPoints: match.nextSection.points,
            ownerPairKey: match.nextSection.ownerPairKey,
        });
    }

    for (const section of born) {
        sections.set(section.id, {
            kind: 'born',
            sectionId: section.id,
            prevPoints: null,
            nextPoints: section.points,
            ownerPairKey: section.ownerPairKey,
        });
    }

    for (const section of dying) {
        sections.set(section.id, {
            kind: 'dying',
            sectionId: section.id,
            prevPoints: section.points,
            nextPoints: null,
            ownerPairKey: section.ownerPairKey,
        });
    }

    // Step 9: match loops
    const loops = matchLoops(prev.loops, next.loops, matched);

    // Diagnostic
    const staticCount = [...sections.values()].filter(s => s.kind === 'static').length;
    const driftedCount = [...sections.values()].filter(s => s.kind === 'drifted').length;
    log.renderer('TopologyPlanner',
        `Plan: ${sections.size} sections ` +
        `(${staticCount} static, ${driftedCount} drifted, ` +
        `${born.length} born, ${dying.length} dying) | ` +
        `${loops.length} loops ` +
        `(${loops.filter(l => l.kind === 'static').length} static, ` +
        `${loops.filter(l => l.kind === 'modified').length} modified, ` +
        `${loops.filter(l => l.kind === 'born').length} born, ` +
        `${loops.filter(l => l.kind === 'dying').length} dying)`,
    );

    return {
        prevVersion: prev.version,
        nextVersion: next.version,
        sections,
        loops,
    };
}
