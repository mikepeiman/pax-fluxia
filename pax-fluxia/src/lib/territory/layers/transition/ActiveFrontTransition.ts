import type { OwnershipSnapshot, TerritoryConquestEvent } from '../../contracts/OwnershipContracts';
import type { TerritoryTunables } from '../../contracts/TerritoryFrameInput';
import type {
    FrontierSection,
    FrontierTopology,
    FrontierVertexKind,
    RegionLoop,
} from '../../contracts/FrontierTopologyContracts';
import type { FillTransitionFrame } from '../../contracts/TransitionContracts';
import { rebuildLoopPoints } from '../../compiler/buildFrontierTopology';
import { log } from '$lib/utils/logger';

type Vec2 = [number, number];

export type ActiveFrontSplitMode = 'none' | '1to2' | '2to1';
type SplitMode = ActiveFrontSplitMode;
export type ActiveFrontPairOutcome =
    | 'planned'
    | 'skipped_topology_gap'
    | 'skipped_unsupported_split_mode'
    | 'skipped_no_change_span';
export type ActiveFrontPlanClassification =
    | 'animated_fronts'
    | 'loop_targets_only'
    | 'collapse_only'
    | 'snap_no_fronts';

interface ChainPath {
    anchorStartId: string;
    anchorEndId: string;
    sectionIds: string[];
    points: Vec2[];
    sectionSpans: Map<string, { startIndex: number; endIndex: number }>;
    sectionReversed: Map<string, boolean>;
}

interface ActiveFrontPlan {
    anchorStartId: string;
    anchorEndId: string;
    splitMode: SplitMode;
    prevPaths: ChainPath[];
    nextPaths: ChainPath[];
    changeSpan: { startIndex: number; endIndex: number; base: 'prev' | 'next' };
    sectionSpans: Map<string, { startIndex: number; endIndex: number; pathIndex: number }>;
    activeSectionIds: Set<string>;
    sectionReversed: Map<string, boolean>;
}

interface CollapseTarget {
    loopId: string;
    ownerId: string;
    center: Vec2;
    points: Vec2[];
}

interface ExpandTarget {
    loopId: string;
    ownerId: string;
    center: Vec2;
    points: Vec2[];
}

export interface ActiveFrontPairDiagnostic {
    anchorKey: string;
    anchorStartId: string;
    anchorEndId: string;
    prevPathCount: number;
    nextPathCount: number;
    prevPathPointCounts: number[];
    nextPathPointCounts: number[];
    prevPathSectionIds: string[][];
    nextPathSectionIds: string[][];
    splitMode: ActiveFrontSplitMode | null;
    outcome: ActiveFrontPairOutcome;
    rawChangeSpan: {
        base: 'prev' | 'next';
        startIndex: number;
        endIndex: number;
        basePointCount: number;
    } | null;
    paddedChangeSpan: {
        base: 'prev' | 'next';
        startIndex: number;
        endIndex: number;
    } | null;
    activeSectionIds: string[];
}

export interface ActiveFrontPlanDiagnosticsSummary {
    classification: ActiveFrontPlanClassification;
    stableAnchorCount: number;
    prevChainCount: number;
    nextChainCount: number;
    pairCount: number;
    plannedPairCount: number;
    skippedTopologyGapCount: number;
    skippedUnsupportedSplitCount: number;
    skippedNoChangeSpanCount: number;
    frontCount: number;
    activeSectionCount: number;
    collapseTargetCount: number;
    expandTargetCount: number;
}

export interface ActiveFrontPlanDiagnostics {
    tunables: {
        stableAnchorEps: number;
        changeSpanEps: number;
        changeSpanPadPoints: number;
    };
    stableAnchorIds: string[];
    pairDiagnostics: ActiveFrontPairDiagnostic[];
    summary: ActiveFrontPlanDiagnosticsSummary;
}

export interface ActiveFrontTransitionPlan {
    prevVersion: string;
    nextVersion: string;
    fronts: ActiveFrontPlan[];
    collapseTargets: CollapseTarget[];
    expandTargets: ExpandTarget[];
    diagnostics: ActiveFrontPlanDiagnostics;
}

const STABLE_ANCHOR_KINDS: Set<FrontierVertexKind> = new Set([
    'junction_3way',
    'world_intersection',
    'world_corner',
]);

const DEFAULT_STABLE_ANCHOR_EPS = 2;
const DEFAULT_CHANGE_SPAN_EPS = 2;
const DEFAULT_CHANGE_SPAN_PAD_POINTS = 0;

interface ActiveFrontPlanningTunables {
    stableAnchorEps?: TerritoryTunables['pvv4StableAnchorEps'];
    changeSpanEps?: TerritoryTunables['pvv4ChangeSpanEps'];
    changeSpanPadPoints?: TerritoryTunables['pvv4ChangeSpanPadPoints'];
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

export function planActiveFrontTransition(
    prev: FrontierTopology,
    next: FrontierTopology,
    ownership: OwnershipSnapshot,
    tunables: ActiveFrontPlanningTunables = {},
): ActiveFrontTransitionPlan {
    const stableAnchorEps = tunables.stableAnchorEps ?? DEFAULT_STABLE_ANCHOR_EPS;
    const changeSpanEps = tunables.changeSpanEps ?? DEFAULT_CHANGE_SPAN_EPS;
    const changeSpanPadPoints =
        tunables.changeSpanPadPoints ?? DEFAULT_CHANGE_SPAN_PAD_POINTS;

    const anchors = findStableAnchors(prev, next, stableAnchorEps);
    const prevChains = buildChainsBetweenAnchors(prev, anchors);
    const nextChains = buildChainsBetweenAnchors(next, anchors);

    const prevByKey = groupChainsByAnchorPair(prevChains);
    const nextByKey = groupChainsByAnchorPair(nextChains);

    const fronts: ActiveFrontPlan[] = [];
    const pairDiagnostics: ActiveFrontPairDiagnostic[] = [];

    const allKeys = new Set<string>([...prevByKey.keys(), ...nextByKey.keys()]);
    for (const key of allKeys) {
        const prevPaths = prevByKey.get(key) ?? [];
        const nextPaths = nextByKey.get(key) ?? [];
        const [anchorStartId = '', anchorEndId = ''] = key.split('|');
        const pairDiagnostic: ActiveFrontPairDiagnostic = {
            anchorKey: key,
            anchorStartId,
            anchorEndId,
            prevPathCount: prevPaths.length,
            nextPathCount: nextPaths.length,
            prevPathPointCounts: prevPaths.map((path) => path.points.length),
            nextPathPointCounts: nextPaths.map((path) => path.points.length),
            prevPathSectionIds: prevPaths.map((path) => [...path.sectionIds]),
            nextPathSectionIds: nextPaths.map((path) => [...path.sectionIds]),
            splitMode: null,
            outcome: 'skipped_topology_gap',
            rawChangeSpan: null,
            paddedChangeSpan: null,
            activeSectionIds: [],
        };

        if (prevPaths.length === 0 || nextPaths.length === 0) {
            pairDiagnostics.push(pairDiagnostic);
            // Topology gap — skip until diagnostics/logging added
            continue;
        }

        const splitMode = detectSplitMode(prevPaths.length, nextPaths.length);
        pairDiagnostic.splitMode = splitMode;
        if (!splitMode) {
            pairDiagnostic.outcome = 'skipped_unsupported_split_mode';
            pairDiagnostics.push(pairDiagnostic);
            continue;
        }

        const rawChangeSpan = findChangeSpanForPaths(
            prevPaths,
            nextPaths,
            splitMode,
            changeSpanEps,
        );
        pairDiagnostic.rawChangeSpan = { ...rawChangeSpan };
        const { base, startIndex, endIndex } = applyChangeSpanPadding(
            rawChangeSpan,
            changeSpanPadPoints,
        );
        pairDiagnostic.paddedChangeSpan = { base, startIndex, endIndex };

        if (startIndex === -1 || endIndex === -1) {
            pairDiagnostic.outcome = 'skipped_no_change_span';
            pairDiagnostics.push(pairDiagnostic);
            continue;
        }

        const { sectionSpans, activeSectionIds, sectionReversed } = buildSectionSpans(
            nextPaths,
            splitMode,
            base,
            { startIndex, endIndex },
        );

        fronts.push({
            anchorStartId: prevPaths[0].anchorStartId,
            anchorEndId: prevPaths[0].anchorEndId,
            splitMode,
            prevPaths,
            nextPaths,
            changeSpan: { startIndex, endIndex, base },
            sectionSpans,
            activeSectionIds,
            sectionReversed,
        });
        pairDiagnostic.outcome = 'planned';
        pairDiagnostic.activeSectionIds = [...activeSectionIds].sort();
        pairDiagnostics.push(pairDiagnostic);
    }

    const collapseTargets = planCollapseTargets(
        prev,
        next,
        ownership,
        ownership.conquestEvents,
    );
    const expandTargets = planExpandTargets(
        prev,
        next,
        ownership,
        ownership.conquestEvents,
        collapseTargets,
    );
    const diagnostics = buildActiveFrontPlanDiagnostics({
        stableAnchorIds: [...anchors].sort(),
        prevChainCount: prevChains.length,
        nextChainCount: nextChains.length,
        pairDiagnostics,
        fronts,
        collapseTargets,
        expandTargets,
        stableAnchorEps,
        changeSpanEps,
        changeSpanPadPoints,
    });

    return {
        prevVersion: prev.version,
        nextVersion: next.version,
        fronts,
        collapseTargets,
        expandTargets,
        diagnostics,
    };
}

function buildActiveFrontPlanDiagnostics(input: {
    stableAnchorIds: string[];
    prevChainCount: number;
    nextChainCount: number;
    pairDiagnostics: ActiveFrontPairDiagnostic[];
    fronts: ActiveFrontPlan[];
    collapseTargets: CollapseTarget[];
    expandTargets: ExpandTarget[];
    stableAnchorEps: number;
    changeSpanEps: number;
    changeSpanPadPoints: number;
}): ActiveFrontPlanDiagnostics {
    const activeSectionCount = input.fronts.reduce(
        (total, front) => total + front.activeSectionIds.size,
        0,
    );
    const plannedPairCount = input.pairDiagnostics.filter(
        (pair) => pair.outcome === 'planned',
    ).length;
    const skippedTopologyGapCount = input.pairDiagnostics.filter(
        (pair) => pair.outcome === 'skipped_topology_gap',
    ).length;
    const skippedUnsupportedSplitCount = input.pairDiagnostics.filter(
        (pair) => pair.outcome === 'skipped_unsupported_split_mode',
    ).length;
    const skippedNoChangeSpanCount = input.pairDiagnostics.filter(
        (pair) => pair.outcome === 'skipped_no_change_span',
    ).length;
    const loopTargetCount =
        input.collapseTargets.length + input.expandTargets.length;
    const classification: ActiveFrontPlanClassification = input.fronts.length > 0
        ? 'animated_fronts'
        : loopTargetCount > 0
          ? input.collapseTargets.length > 0 && input.expandTargets.length === 0
            ? 'collapse_only'
            : 'loop_targets_only'
          : 'snap_no_fronts';

    return {
        tunables: {
            stableAnchorEps: input.stableAnchorEps,
            changeSpanEps: input.changeSpanEps,
            changeSpanPadPoints: input.changeSpanPadPoints,
        },
        stableAnchorIds: input.stableAnchorIds,
        pairDiagnostics: input.pairDiagnostics,
        summary: {
            classification,
            stableAnchorCount: input.stableAnchorIds.length,
            prevChainCount: input.prevChainCount,
            nextChainCount: input.nextChainCount,
            pairCount: input.pairDiagnostics.length,
            plannedPairCount,
            skippedTopologyGapCount,
            skippedUnsupportedSplitCount,
            skippedNoChangeSpanCount,
            frontCount: input.fronts.length,
            activeSectionCount,
            collapseTargetCount: input.collapseTargets.length,
            expandTargetCount: input.expandTargets.length,
        },
    };
}

export function compactActiveFrontTransitionPlan(
    plan: ActiveFrontTransitionPlan | null | undefined,
): Record<string, unknown> | null {
    if (!plan) return null;
    return {
        prevVersion: plan.prevVersion,
        nextVersion: plan.nextVersion,
        diagnostics: plan.diagnostics,
        fronts: plan.fronts.map((front) => ({
            anchorStartId: front.anchorStartId,
            anchorEndId: front.anchorEndId,
            splitMode: front.splitMode,
            changeSpan: front.changeSpan,
            activeSectionIds: [...front.activeSectionIds].sort(),
            prevPaths: front.prevPaths.map((path) => ({
                anchorStartId: path.anchorStartId,
                anchorEndId: path.anchorEndId,
                sectionIds: [...path.sectionIds],
                pointCount: path.points.length,
            })),
            nextPaths: front.nextPaths.map((path) => ({
                anchorStartId: path.anchorStartId,
                anchorEndId: path.anchorEndId,
                sectionIds: [...path.sectionIds],
                pointCount: path.points.length,
            })),
        })),
        collapseTargets: plan.collapseTargets.map((target) => ({
            loopId: target.loopId,
            ownerId: target.ownerId,
            center: target.center,
            pointCount: target.points.length,
        })),
        expandTargets: plan.expandTargets.map((target) => ({
            loopId: target.loopId,
            ownerId: target.ownerId,
            center: target.center,
            pointCount: target.points.length,
        })),
    };
}

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

export function sampleActiveFrontTransition(
    plan: ActiveFrontTransitionPlan,
    prev: FrontierTopology,
    next: FrontierTopology,
    progress: number,
): FillTransitionFrame {
    const t = Math.min(Math.max(progress, 0), 1);

    const sectionGeometry = new Map<string, Vec2[]>();

    // Start with static passthrough (next topology)
    for (const [sectionId, section] of next.sections) {
        sectionGeometry.set(sectionId, section.points as Vec2[]);
    }

    // Apply active fronts
    for (const front of plan.fronts) {
        const interpolatedPaths = buildInterpolatedPaths(front, prev, next, t);

        for (const [sectionId, span] of front.sectionSpans) {
            if (!front.activeSectionIds.has(sectionId)) continue;
            const pathPoints = interpolatedPaths[span.pathIndex];
            // Chain building deduplicates junction vertices between sections
            // (appendPolyline skips the first point if it matches the previous
            // section's last point). Sections after the first in a chain are
            // therefore missing their start vertex in the span. Restore it by
            // including the point at startIndex-1 (the shared junction).
            const realStart = span.startIndex > 0 ? span.startIndex - 1 : span.startIndex;
            const slice = pathPoints.slice(realStart, span.endIndex + 1);
            const reversed = front.sectionReversed.get(sectionId);
            sectionGeometry.set(sectionId, reversed ? slice.reverse() : slice);
        }
    }

    const regions: { ownerId: string; points: Vec2[] }[] = [];

    const expandTargetsByLoopId = new Map(
        plan.expandTargets.map((target) => [target.loopId, target] as const),
    );

    // Rebuild loops from NEXT topology
    for (const loop of next.loops) {
        const basePts = rebuildLoopPointsFromGeometry(loop, sectionGeometry);
        const expandTarget = expandTargetsByLoopId.get(loop.id);
        const pts =
            expandTarget && t < 1
                ? expandLoopFromPoint(expandTarget.points, expandTarget.center, t)
                : basePts;
        if (pts.length >= 3) {
            regions.push({ ownerId: loop.ownerId, points: pts });
        }
    }

    // Add collapsing loops from PREV topology (if any)
    for (const target of plan.collapseTargets) {
        if (t >= 1) continue;
        const collapsed = collapseLoopToPoint(target.points, target.center, t);
        if (collapsed.length >= 3) {
            regions.push({ ownerId: target.ownerId, points: collapsed });
        }
    }

    return { regions };
}

// ---------------------------------------------------------------------------
// Helper: stable anchors
// ---------------------------------------------------------------------------

function findStableAnchors(
    prev: FrontierTopology,
    next: FrontierTopology,
    eps: number,
): Set<string> {
    const anchors = new Set<string>();
    for (const [id, vPrev] of prev.vertices) {
        if (!STABLE_ANCHOR_KINDS.has(vPrev.kind)) continue;
        const vNext = next.vertices.get(id);
        if (!vNext) continue;
        if (!STABLE_ANCHOR_KINDS.has(vNext.kind)) continue;
        if (distance(vPrev.point, vNext.point) <= eps) {
            anchors.add(id);
        }
    }
    return anchors;
}

// ---------------------------------------------------------------------------
// Helper: chain building between anchors
// ---------------------------------------------------------------------------

function buildChainsBetweenAnchors(
    topo: FrontierTopology,
    anchors: Set<string>,
): ChainPath[] {
    const unusedSections = new Set<string>([...topo.sections.keys()]);
    const chains: ChainPath[] = [];

    // Sort anchors for deterministic iteration order across prev/next topologies
    const sortedAnchors = [...anchors].sort();

    for (const anchorId of sortedAnchors) {
        const incident = [...(topo.sectionsByVertex.get(anchorId) ?? [])].sort();
        for (const sectionId of incident) {
            if (!unusedSections.has(sectionId)) continue;

            const chainSectionIds: string[] = [];
            let currentVertex = anchorId;
            let previousSectionId: string | null = null;

            while (true) {
                const candidates = (topo.sectionsByVertex.get(currentVertex) ?? [])
                    .filter(id => id !== previousSectionId && unusedSections.has(id))
                    .sort();

                if (candidates.length === 0) break;

                const nextSectionId = candidates[0];
                const section = topo.sections.get(nextSectionId);
                if (!section) break;

                unusedSections.delete(nextSectionId);
                chainSectionIds.push(nextSectionId);

                const nextVertex = otherVertex(section, currentVertex);
                previousSectionId = nextSectionId;
                currentVertex = nextVertex;

                if (anchors.has(currentVertex)) break;
            }

            if (chainSectionIds.length === 0) continue;

            const endAnchorId = currentVertex;
            const { orderedSectionIds, anchorStartId, anchorEndId } =
                canonicalizeChainOrder(chainSectionIds, anchorId, endAnchorId);

            const { points, sectionSpans, sectionReversed } = buildChainPoints(
                topo,
                orderedSectionIds,
                anchorStartId,
            );

            chains.push({
                anchorStartId,
                anchorEndId,
                sectionIds: orderedSectionIds,
                points,
                sectionSpans,
                sectionReversed,
            });
        }
    }

    return chains;
}

function canonicalizeChainOrder(
    sectionIds: string[],
    anchorStartId: string,
    anchorEndId: string,
): {
    orderedSectionIds: string[];
    anchorStartId: string;
    anchorEndId: string;
} {
    if (anchorStartId <= anchorEndId) {
        return { orderedSectionIds: sectionIds, anchorStartId, anchorEndId };
    }
    return {
        orderedSectionIds: [...sectionIds].reverse(),
        anchorStartId: anchorEndId,
        anchorEndId: anchorStartId,
    };
}

function buildChainPoints(
    topo: FrontierTopology,
    sectionIds: string[],
    anchorStartId: string,
): {
    points: Vec2[];
    sectionSpans: Map<string, { startIndex: number; endIndex: number }>;
    sectionReversed: Map<string, boolean>;
} {
    const points: Vec2[] = [];
    const sectionSpans = new Map<string, { startIndex: number; endIndex: number }>();
    const sectionReversed = new Map<string, boolean>();

    let currentVertex = anchorStartId;
    for (const sectionId of sectionIds) {
        const section = topo.sections.get(sectionId);
        if (!section) continue;

        const reversed = section.startVertexId !== currentVertex;
        const orientedPoints = getOrientedSectionPoints(section, currentVertex);
        const startIndex = points.length;
        appendPolyline(points, orientedPoints);
        const endIndex = points.length - 1;
        sectionSpans.set(sectionId, { startIndex, endIndex });
        sectionReversed.set(sectionId, reversed);

        currentVertex = otherVertex(section, currentVertex);
    }

    return { points, sectionSpans, sectionReversed };
}

function getOrientedSectionPoints(section: FrontierSection, fromVertexId: string): Vec2[] {
    if (section.startVertexId === fromVertexId) {
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

function otherVertex(section: FrontierSection, vertexId: string): string {
    return section.startVertexId === vertexId ? section.endVertexId : section.startVertexId;
}

function appendPolyline(out: Vec2[], segment: readonly Vec2[]): void {
    if (segment.length === 0) return;
    let from = 0;
    if (out.length > 0) {
        const last = out[out.length - 1];
        const first = segment[0];
        if (distance(last, first) < 1e-3) from = 1;
    }
    for (let i = from; i < segment.length; i += 1) {
        out.push(segment[i]);
    }
}

// ---------------------------------------------------------------------------
// Helper: chain grouping
// ---------------------------------------------------------------------------

function groupChainsByAnchorPair(chains: ChainPath[]): Map<string, ChainPath[]> {
    const map = new Map<string, ChainPath[]>();
    for (const chain of chains) {
        const key = `${chain.anchorStartId}|${chain.anchorEndId}`;
        const arr = map.get(key) ?? [];
        arr.push(chain);
        map.set(key, arr);
    }
    return map;
}

function detectSplitMode(prevCount: number, nextCount: number): SplitMode | null {
    if (prevCount === 1 && nextCount === 1) return 'none';
    if (prevCount === 1 && nextCount === 2) return '1to2';
    if (prevCount === 2 && nextCount === 1) return '2to1';
    return null;
}

// ---------------------------------------------------------------------------
// Helper: change span detection
// ---------------------------------------------------------------------------

function findChangeSpanForPaths(
    prevPaths: ChainPath[],
    nextPaths: ChainPath[],
    splitMode: SplitMode,
    eps: number,
): {
    base: 'prev' | 'next';
    startIndex: number;
    endIndex: number;
    basePointCount: number;
} {
    if (splitMode === 'none') {
        const base = 'next' as const;
        const basePoints = nextPaths[0].points;
        const compare = [prevPaths[0].points];
        return {
            base,
            basePointCount: basePoints.length,
            ...findChangeSpan(basePoints, compare, eps),
        };
    }
    if (splitMode === '1to2') {
        const base = 'prev' as const;
        const basePoints = prevPaths[0].points;
        const compare = [nextPaths[0].points, nextPaths[1].points];
        return {
            base,
            basePointCount: basePoints.length,
            ...findChangeSpan(basePoints, compare, eps),
        };
    }
    // splitMode === '2to1'
    const base = 'next' as const;
    const basePoints = nextPaths[0].points;
    const compare = [prevPaths[0].points, prevPaths[1].points];
    return {
        base,
        basePointCount: basePoints.length,
        ...findChangeSpan(basePoints, compare, eps),
    };
}

function applyChangeSpanPadding(
    changeSpan: {
        base: 'prev' | 'next';
        startIndex: number;
        endIndex: number;
        basePointCount: number;
    },
    padPoints: number,
): { base: 'prev' | 'next'; startIndex: number; endIndex: number } {
    if (
        changeSpan.startIndex === -1 ||
        changeSpan.endIndex === -1 ||
        padPoints <= 0 ||
        changeSpan.basePointCount <= 0
    ) {
        return {
            base: changeSpan.base,
            startIndex: changeSpan.startIndex,
            endIndex: changeSpan.endIndex,
        };
    }
    return {
        base: changeSpan.base,
        startIndex: Math.max(0, changeSpan.startIndex - padPoints),
        endIndex: Math.min(
            changeSpan.basePointCount - 1,
            changeSpan.endIndex + padPoints,
        ),
    };
}

function findChangeSpan(
    basePoints: Vec2[],
    comparePolylines: Vec2[][],
    eps: number,
): { startIndex: number; endIndex: number } {
    const distances = basePoints.map(pt => minDistanceToPolylines(pt, comparePolylines));
    let startIndex = -1;
    let endIndex = -1;
    for (let i = 0; i < distances.length; i += 1) {
        if (distances[i] > eps) {
            startIndex = i;
            break;
        }
    }
    for (let i = distances.length - 1; i >= 0; i -= 1) {
        if (distances[i] > eps) {
            endIndex = i;
            break;
        }
    }
    return { startIndex, endIndex };
}

// ---------------------------------------------------------------------------
// Helper: build section spans for sampling
// ---------------------------------------------------------------------------

function buildSectionSpans(
    nextPaths: ChainPath[],
    splitMode: SplitMode,
    base: 'prev' | 'next',
    changeSpan: { startIndex: number; endIndex: number },
): {
    sectionSpans: Map<string, { startIndex: number; endIndex: number; pathIndex: number }>;
    activeSectionIds: Set<string>;
    sectionReversed: Map<string, boolean>;
} {
    const sectionSpans = new Map<string, { startIndex: number; endIndex: number; pathIndex: number }>();
    const activeSectionIds = new Set<string>();
    const sectionReversed = new Map<string, boolean>();

    for (let pathIndex = 0; pathIndex < nextPaths.length; pathIndex += 1) {
        const path = nextPaths[pathIndex];
        for (const [sectionId, span] of path.sectionSpans) {
            sectionSpans.set(sectionId, { ...span, pathIndex });
        }
        for (const [sectionId, reversed] of path.sectionReversed) {
            sectionReversed.set(sectionId, reversed);
        }
    }

    if (splitMode !== 'none') {
        for (const path of nextPaths) {
            for (const sectionId of path.sectionIds) {
                activeSectionIds.add(sectionId);
            }
        }
        return { sectionSpans, activeSectionIds, sectionReversed };
    }

    // splitMode === 'none' → use change span on NEXT
    if (base !== 'next') {
        for (const path of nextPaths) {
            for (const sectionId of path.sectionIds) {
                activeSectionIds.add(sectionId);
            }
        }
        return { sectionSpans, activeSectionIds, sectionReversed };
    }

    const [onlyPath] = nextPaths;
    for (const [sectionId, span] of onlyPath.sectionSpans) {
        const overlaps =
            span.endIndex >= changeSpan.startIndex && span.startIndex <= changeSpan.endIndex;
        if (overlaps) {
            activeSectionIds.add(sectionId);
        }
    }

    return { sectionSpans, activeSectionIds, sectionReversed };
}

// ---------------------------------------------------------------------------
// Helper: interpolation
// ---------------------------------------------------------------------------

function buildInterpolatedPaths(
    plan: ActiveFrontPlan,
    prev: FrontierTopology,
    next: FrontierTopology,
    t: number,
): Vec2[][] {
    if (plan.splitMode === 'none') {
        const prevChain = concatSections(prev, plan.prevPaths[0].sectionIds, plan.prevPaths[0].anchorStartId);
        const nextChain = concatSections(next, plan.nextPaths[0].sectionIds, plan.nextPaths[0].anchorStartId);
        if (prevChain.length === 0 || nextChain.length === 0) {
            log.renderer('ActiveFrontTransition',
                `Warning: empty chain in splitMode=none (prev=${prevChain.length}, next=${nextChain.length})`);
        }
        return [lerpArcAligned(prevChain, nextChain, t)];
    }
    if (plan.splitMode === '1to2') {
        const prevChain = concatSections(prev, plan.prevPaths[0].sectionIds, plan.prevPaths[0].anchorStartId);
        const nextA = concatSections(next, plan.nextPaths[0].sectionIds, plan.nextPaths[0].anchorStartId);
        const nextB = concatSections(next, plan.nextPaths[1].sectionIds, plan.nextPaths[1].anchorStartId);
        const { prevForNext0, prevForNext1 } = splitByNearest(prevChain, nextA, nextB);
        return [
            lerpArcAligned(prevForNext0, nextA, t),
            lerpArcAligned(prevForNext1, nextB, t),
        ];
    }
    // splitMode === '2to1'
    const prevA = concatSections(prev, plan.prevPaths[0].sectionIds, plan.prevPaths[0].anchorStartId);
    const prevB = concatSections(prev, plan.prevPaths[1].sectionIds, plan.prevPaths[1].anchorStartId);
    const nextChain = concatSections(next, plan.nextPaths[0].sectionIds, plan.nextPaths[0].anchorStartId);
    const mergedPrev = mergeByNearest(prevA, prevB, nextChain);
    return [lerpArcAligned(mergedPrev, nextChain, t)];
}

function concatSections(topo: FrontierTopology, sectionIds: string[], anchorStartId?: string): Vec2[] {
    const points: Vec2[] = [];
    let currentVertex: string | null = anchorStartId ?? null;
    for (const sectionId of sectionIds) {
        const section = topo.sections.get(sectionId);
        if (!section) continue;
        const fromVertex = currentVertex ?? section.startVertexId;
        const oriented = getOrientedSectionPoints(section, fromVertex);
        appendPolyline(points, oriented);
        currentVertex = otherVertex(section, fromVertex);
    }
    return points;
}

function lerpArcAligned(prev: Vec2[], next: Vec2[], t: number): Vec2[] {
    if (next.length === 0) return [];
    // If the prev chain failed to concatenate (missing sections / ID mismatch),
    // sampling an empty prev used to return [0,0] per sample → vertices pile at
    // world origin (top-left), then lerp toward real positions. Fall back to `next`
    // as both endpoints so we never inject a synthetic origin.
    const prevChain = prev.length > 0 ? prev : next;
    if (prev.length === 0 && next.length > 0) {
        log.renderer('ActiveFrontTransition',
            `Warning: empty prev chain in lerpArcAligned (nextLen=${next.length}, t=${t.toFixed(3)}) — using next as fallback`);
    }
    const prevTable = buildArcLengthTable(prevChain);
    const nextTable = buildArcLengthTable(next);
    const out: Vec2[] = new Array(next.length);
    for (let i = 0; i < next.length; i += 1) {
        const u = nextTable.total <= 0 ? 0 : nextTable.cumulative[i] / nextTable.total;
        const prevAt = samplePolylineAtParam(prevChain, prevTable, u);
        out[i] = lerpPoint(prevAt, next[i], t);
    }
    return out;
}

function splitByNearest(prev: Vec2[], nextA: Vec2[], nextB: Vec2[]): {
    prevForNext0: Vec2[];
    prevForNext1: Vec2[];
} {
    const mid = Math.floor(prev.length / 2);
    const firstHalf = prev.slice(0, Math.max(1, mid + 1));
    const secondHalf = prev.slice(Math.max(1, mid + 1));

    const firstToA = averageDistanceToPolyline(firstHalf, nextA);
    const firstToB = averageDistanceToPolyline(firstHalf, nextB);

    if (firstToA <= firstToB) {
        return { prevForNext0: firstHalf, prevForNext1: secondHalf };
    }
    return { prevForNext0: secondHalf, prevForNext1: firstHalf };
}

function mergeByNearest(prevA: Vec2[], prevB: Vec2[], next: Vec2[]): Vec2[] {
    const projA = prevA.map(p => projectPointToPolyline(p, next));
    const projB = prevB.map(p => projectPointToPolyline(p, next));
    const merged = [...projA, ...projB].sort((a, b) => a.param - b.param);
    return merged.map(m => m.point);
}

// ---------------------------------------------------------------------------
// Helper: distance and projection
// ---------------------------------------------------------------------------

function distance(a: Vec2, b: Vec2): number {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function minDistanceToPolylines(p: Vec2, polylines: Vec2[][]): number {
    let best = Infinity;
    for (const poly of polylines) {
        const d = distancePointToPolyline(p, poly);
        if (d < best) best = d;
    }
    return best;
}

function distancePointToPolyline(p: Vec2, poly: Vec2[]): number {
    if (poly.length === 0) return Infinity;
    if (poly.length === 1) return distance(p, poly[0]);
    let best = Infinity;
    for (let i = 1; i < poly.length; i += 1) {
        const d = distancePointToSegment(p, poly[i - 1], poly[i]);
        if (d < best) best = d;
    }
    return best;
}

function distancePointToSegment(p: Vec2, a: Vec2, b: Vec2): number {
    const abx = b[0] - a[0];
    const aby = b[1] - a[1];
    const apx = p[0] - a[0];
    const apy = p[1] - a[1];
    const abLen2 = abx * abx + aby * aby;
    if (abLen2 <= 1e-9) return distance(p, a);
    const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLen2));
    const proj: Vec2 = [a[0] + t * abx, a[1] + t * aby];
    return distance(p, proj);
}

function projectPointToPolyline(p: Vec2, poly: Vec2[]): { param: number; point: Vec2 } {
    if (poly.length === 0) return { param: 0, point: p };
    if (poly.length === 1) return { param: 0, point: poly[0] };

    const table = buildArcLengthTable(poly);
    let bestDist = Infinity;
    let bestParam = 0;
    let bestPoint: Vec2 = poly[0];

    for (let i = 1; i < poly.length; i += 1) {
        const a = poly[i - 1];
        const b = poly[i];
        const abx = b[0] - a[0];
        const aby = b[1] - a[1];
        const apx = p[0] - a[0];
        const apy = p[1] - a[1];
        const abLen2 = abx * abx + aby * aby;
        const t = abLen2 <= 1e-9 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLen2));
        const proj: Vec2 = [a[0] + t * abx, a[1] + t * aby];
        const d = distance(p, proj);
        if (d < bestDist) {
            bestDist = d;
            const segStart = table.cumulative[i - 1];
            const segLen = table.cumulative[i] - table.cumulative[i - 1];
            const absolute = segStart + t * segLen;
            bestParam = table.total <= 0 ? 0 : absolute / table.total;
            bestPoint = proj;
        }
    }

    return { param: bestParam, point: bestPoint };
}

function averageDistanceToPolyline(points: Vec2[], poly: Vec2[]): number {
    if (points.length === 0) return 0;
    let sum = 0;
    for (const p of points) sum += distancePointToPolyline(p, poly);
    return sum / points.length;
}

// ---------------------------------------------------------------------------
// Helper: arc length sampling
// ---------------------------------------------------------------------------

function buildArcLengthTable(points: readonly Vec2[]): { cumulative: number[]; total: number } {
    const cumulative: number[] = new Array(points.length);
    cumulative[0] = 0;
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
        total += distance(points[i - 1], points[i]);
        cumulative[i] = total;
    }
    return { cumulative, total };
}

function samplePolylineAtParam(
    points: readonly Vec2[],
    table: { cumulative: number[]; total: number },
    u: number,
): Vec2 {
    // Never return a synthetic [0,0] — callers may use this as t=0 vertex position
    // and map origin reads as top-left in screen space.
    if (points.length === 0) {
        throw new Error('[ActiveFrontTransition] samplePolylineAtParam: empty points');
    }
    if (points.length === 1) return points[0];
    const { cumulative, total } = table;
    const target = Math.min(Math.max(u, 0), 1) * total;
    let i = 1;
    while (i < cumulative.length && cumulative[i] < target) i += 1;
    if (i === cumulative.length) return points[points.length - 1];
    const prevLen = cumulative[i - 1];
    const segLen = cumulative[i] - prevLen;
    if (segLen <= 0) return points[i];
    const localT = (target - prevLen) / segLen;
    return lerpPoint(points[i - 1], points[i], localT);
}

function lerpPoint(a: Vec2, b: Vec2, t: number): Vec2 {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

// ---------------------------------------------------------------------------
// Collapse targets
// ---------------------------------------------------------------------------

function planCollapseTargets(
    prev: FrontierTopology,
    next: FrontierTopology,
    ownership: OwnershipSnapshot,
    conquestEvents: readonly TerritoryConquestEvent[],
): CollapseTarget[] {
    const nextLoopIds = new Set(next.loops.map(l => l.id));
    const disappearing = prev.loops.filter(l => !nextLoopIds.has(l.id));
    if (disappearing.length === 0) return [];

    const targets: CollapseTarget[] = [];
    const remaining = new Set(disappearing.map(l => l.id));

    for (const evt of conquestEvents) {
        const center = resolveConquestCenter(
            ownership,
            evt,
            evt.previousOwner,
        );
        if (!center) continue;

        let bestLoop: RegionLoop | null = null;
        let bestDist = Infinity;
        for (const loop of disappearing) {
            if (!remaining.has(loop.id)) continue;
            if (loop.ownerId !== evt.previousOwner) continue;
            const pts = rebuildLoopPoints(loop, prev.sections);
            const centroid = polygonCentroid(pts);
            const d = distance(centroid, center);
            if (d < bestDist) {
                bestDist = d;
                bestLoop = loop;
            }
        }

        if (bestLoop) {
            remaining.delete(bestLoop.id);
            const pts = rebuildLoopPoints(bestLoop, prev.sections);
            targets.push({
                loopId: bestLoop.id,
                ownerId: bestLoop.ownerId,
                center,
                points: pts,
            });
        }
    }

    for (const loop of disappearing) {
        if (!remaining.has(loop.id)) continue;
        const points = rebuildLoopPoints(loop, prev.sections);
        targets.push({
            loopId: loop.id,
            ownerId: loop.ownerId,
            center: polygonCentroid(points),
            points,
        });
    }

    return targets;
}

function planExpandTargets(
    prev: FrontierTopology,
    next: FrontierTopology,
    ownership: OwnershipSnapshot,
    conquestEvents: readonly TerritoryConquestEvent[],
    collapseTargets: readonly CollapseTarget[],
): ExpandTarget[] {
    const prevLoopIds = new Set(prev.loops.map((loop) => loop.id));
    const appearing = next.loops.filter((loop) => !prevLoopIds.has(loop.id));
    if (appearing.length === 0) return [];

    const targets: ExpandTarget[] = [];
    const remaining = new Set(appearing.map((loop) => loop.id));
    const collapseCenterByOwner = new Map<string, Vec2[]>();
    for (const target of collapseTargets) {
        const centers = collapseCenterByOwner.get(target.ownerId) ?? [];
        centers.push(target.center);
        collapseCenterByOwner.set(target.ownerId, centers);
    }

    for (const evt of conquestEvents) {
        const center =
            resolveConquestCenter(ownership, evt, evt.newOwner) ??
            resolveConquestCenter(ownership, evt, evt.previousOwner);
        if (!center) continue;

        let bestLoop: RegionLoop | null = null;
        let bestDist = Infinity;
        for (const loop of appearing) {
            if (!remaining.has(loop.id)) continue;
            if (loop.ownerId !== evt.newOwner) continue;
            const points = rebuildLoopPoints(loop, next.sections);
            const centroid = polygonCentroid(points);
            const d = distance(centroid, center);
            if (d < bestDist) {
                bestDist = d;
                bestLoop = loop;
            }
        }

        if (bestLoop) {
            remaining.delete(bestLoop.id);
            const points = rebuildLoopPoints(bestLoop, next.sections);
            targets.push({
                loopId: bestLoop.id,
                ownerId: bestLoop.ownerId,
                center,
                points,
            });
        }
    }

    for (const loop of appearing) {
        if (!remaining.has(loop.id)) continue;
        const points = rebuildLoopPoints(loop, next.sections);
        const centroid = polygonCentroid(points);
        const fallbackCenters = collapseCenterByOwner.get(loop.ownerId) ?? [];
        const center =
            nearestCenterToPoint(fallbackCenters, centroid) ?? centroid;
        targets.push({
            loopId: loop.id,
            ownerId: loop.ownerId,
            center,
            points,
        });
    }

    return targets;
}

function resolveConquestCenter(
    ownership: OwnershipSnapshot,
    event: TerritoryConquestEvent,
    ownerId: string,
): Vec2 | null {
    const star = ownership.virtualStars.find(
        (virtualStar) =>
            virtualStar.starId === event.starId &&
            virtualStar.ownerId === ownerId,
    );
    return star ? [star.pos.x, star.pos.y] : null;
}

function nearestCenterToPoint(
    centers: readonly Vec2[],
    point: Vec2,
): Vec2 | null {
    let best: Vec2 | null = null;
    let bestDist = Infinity;
    for (const center of centers) {
        const d = distance(center, point);
        if (d < bestDist) {
            best = center;
            bestDist = d;
        }
    }
    return best;
}

function polygonCentroid(points: Vec2[]): Vec2 {
    if (points.length === 0) return [0, 0];
    let sumX = 0;
    let sumY = 0;
    for (const [x, y] of points) {
        sumX += x;
        sumY += y;
    }
    return [sumX / points.length, sumY / points.length];
}

function collapseLoopToPoint(points: Vec2[], center: Vec2, t: number): Vec2[] {
    const out: Vec2[] = new Array(points.length);
    for (let i = 0; i < points.length; i += 1) {
        const p = points[i];
        out[i] = [
            center[0] + (1 - t) * (p[0] - center[0]),
            center[1] + (1 - t) * (p[1] - center[1]),
        ];
    }
    return out;
}

function expandLoopFromPoint(points: Vec2[], center: Vec2, t: number): Vec2[] {
    const out: Vec2[] = new Array(points.length);
    for (let i = 0; i < points.length; i += 1) {
        const p = points[i];
        out[i] = [
            center[0] + t * (p[0] - center[0]),
            center[1] + t * (p[1] - center[1]),
        ];
    }
    return out;
}

function rebuildLoopPointsFromGeometry(
    loop: RegionLoop,
    sections: ReadonlyMap<string, Vec2[]>,
): Vec2[] {
    const points: Vec2[] = [];
    for (const ref of loop.sectionRefs) {
        const sectionPts = sections.get(ref.sectionId);
        if (!sectionPts || sectionPts.length === 0) continue;
        for (let i = 0; i < sectionPts.length - 1; i += 1) {
            points.push(sectionPts[i]);
        }
    }
    return points;
}
