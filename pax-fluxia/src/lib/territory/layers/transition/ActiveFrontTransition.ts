import type { OwnershipSnapshot, TerritoryConquestEvent } from '../../contracts/OwnershipContracts';
import type { TerritoryTunables } from '../../contracts/TerritoryFrameInput';
import type { TerritoryRegionShape } from '../../contracts/GeometryContracts';
import type {
    FrontierSection,
    FrontierTopology,
    FrontierVertexKind,
    RegionLoop,
} from '../../contracts/FrontierTopologyContracts';
import type {
    BorderTransitionFrame,
    FillTransitionFrame,
} from '../../contracts/TransitionContracts';
import { rebuildLoopPoints } from '../../compiler/buildFrontierTopology';

type Vec2 = [number, number];

export type ActiveFrontSplitMode = 'none' | '1to2' | '2to1';
type SplitMode = ActiveFrontSplitMode;
export type ActiveFrontPairOutcome =
    | 'planned'
    | 'no_change_span'
    | 'defect_topology_gap'
    | 'defect_unsupported_split_mode'
export type ActiveFrontPlanClassification =
    | 'animated_fronts'
    | 'collapse_only'
    | 'classification_defect';

interface ChainPath {
    anchorStartId: string;
    anchorEndId: string;
    sectionIds: string[];
    points: Vec2[];
    sectionSpans: Map<string, {
        startIndex: number;
        endIndex: number;
        pathPointOffset: number;
    }>;
    sectionReversed: Map<string, boolean>;
}

interface ActiveFrontPlan {
    anchorStartId: string;
    anchorEndId: string;
    splitMode: SplitMode;
    prevPaths: ChainPath[];
    nextPaths: ChainPath[];
    changeSpan: { startIndex: number; endIndex: number; base: 'prev' | 'next' };
    localChangeWindow: LocalChangeWindow | null;
    sectionSpans: Map<string, {
        startIndex: number;
        endIndex: number;
        pathPointOffset: number;
        pathIndex: number;
        activeStartIndex: number;
        activeEndIndex: number;
    }>;
    activeSectionIds: Set<string>;
    defectSectionIds: Set<string>;
    sectionReversed: Map<string, boolean>;
}

interface CollapseTarget {
    regionId: string;
    ownerId: string;
    center: Vec2;
    points: Vec2[];
    anchorStarIds: string[];
}

interface LocalChangeWindow {
    nextAnchorStartIndex: number;
    nextAnchorEndIndex: number;
    prevStartParam: number;
    prevEndParam: number;
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
    changeAnchorWindow: {
        nextAnchorStartIndex: number;
        nextAnchorEndIndex: number;
        prevStartParam: number;
        prevEndParam: number;
    } | null;
    activeSectionIds: string[];
    defectSectionIds: string[];
}

export interface ActiveFrontPlanDiagnosticsSummary {
    classification: ActiveFrontPlanClassification;
    hasClassificationDefect: boolean;
    stableAnchorCount: number;
    prevChainCount: number;
    nextChainCount: number;
    pairCount: number;
    plannedPairCount: number;
    defectPairCount: number;
    noChangePairCount: number;
    defectTopologyGapCount: number;
    defectUnsupportedSplitCount: number;
    frontCount: number;
    activeSectionCount: number;
    defectSectionCount: number;
    collapseTargetCount: number;
}

export interface ActiveFrontPlanDiagnostics {
    tunables: {
        transitionVertexCount: number;
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
    diagnostics: ActiveFrontPlanDiagnostics;
}

export interface ActiveFrontChangeAnchors {
    startPoint: [number, number];
    endPoint: [number, number];
}

export interface ActiveFrontMonotonicCorrespondence {
    prevFront: [number, number][];
    postFront: [number, number][];
    activeFront: [number, number][];
    changeAnchors: ActiveFrontChangeAnchors;
}

const STABLE_ANCHOR_KINDS: Set<FrontierVertexKind> = new Set([
    'junction_3way',
    'world_intersection',
    'world_corner',
]);

const DEFAULT_STABLE_ANCHOR_EPS = 2;
const DEFAULT_CHANGE_SPAN_EPS = 2;
const DEFAULT_CHANGE_SPAN_PAD_POINTS = 0;
const DEFAULT_TRANSITION_VERTEX_COUNT = 68;

interface ActiveFrontPlanningTunables {
    transitionVertexCount?: TerritoryTunables['pvv4TransitionVertexCount'];
    stableAnchorEps?: TerritoryTunables['pvv4StableAnchorEps'];
    changeSpanEps?: TerritoryTunables['pvv4ChangeSpanEps'];
    changeSpanPadPoints?: TerritoryTunables['pvv4ChangeSpanPadPoints'];
}

interface TransitionStarPoint {
    id: string;
    x: number;
    y: number;
}

// ---------------------------------------------------------------------------
// Planning
// ---------------------------------------------------------------------------

export function planActiveFrontTransition(
    prev: FrontierTopology,
    next: FrontierTopology,
    ownership: OwnershipSnapshot,
    tunables: ActiveFrontPlanningTunables = {},
    stars: readonly TransitionStarPoint[] = [],
    previousRegions: readonly TerritoryRegionShape[] = [],
    nextRegions: readonly TerritoryRegionShape[] = [],
): ActiveFrontTransitionPlan {
    const stableAnchorEps = tunables.stableAnchorEps ?? DEFAULT_STABLE_ANCHOR_EPS;
    const changeSpanEps = tunables.changeSpanEps ?? DEFAULT_CHANGE_SPAN_EPS;
    const changeSpanPadPoints =
        tunables.changeSpanPadPoints ?? DEFAULT_CHANGE_SPAN_PAD_POINTS;
    const transitionVertexCount = normalizeTransitionVertexCount(
        tunables.transitionVertexCount,
    );

    const anchors = findStableAnchors(prev, next, stableAnchorEps);
    const prevChains = dedupeChainsByGeometry(buildChainsBetweenAnchors(prev, anchors));
    const nextChains = dedupeChainsByGeometry(buildChainsBetweenAnchors(next, anchors));

    const prevByKey = groupChainsByAnchorPair(prevChains);
    const nextByKey = groupChainsByAnchorPair(nextChains);

    const fronts: ActiveFrontPlan[] = [];
    const pairDiagnostics: ActiveFrontPairDiagnostic[] = [];

    const allKeys = buildConquestRelevantAnchorPairKeys(
        prev,
        next,
        prevByKey,
        nextByKey,
        ownership.conquestEvents,
        previousRegions,
    );
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
            outcome: 'defect_topology_gap',
            rawChangeSpan: null,
            paddedChangeSpan: null,
            changeAnchorWindow: null,
            activeSectionIds: [],
            defectSectionIds: [],
        };

        if (prevPaths.length === 0 || nextPaths.length === 0) {
            pairDiagnostic.defectSectionIds = collectPathSectionIds(prevPaths, nextPaths);
            pairDiagnostics.push(pairDiagnostic);
            continue;
        }

        const splitMode = detectSplitMode(prevPaths.length, nextPaths.length);
        pairDiagnostic.splitMode = splitMode;
        if (!splitMode) {
            pairDiagnostic.outcome = 'defect_unsupported_split_mode';
            pairDiagnostic.defectSectionIds = collectPathSectionIds(prevPaths, nextPaths);
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
            pairDiagnostic.outcome = 'no_change_span';
            pairDiagnostic.defectSectionIds = [];
            pairDiagnostics.push(pairDiagnostic);
            continue;
        }
        const localChangeWindow = buildLocalChangeWindow(
            prevPaths,
            nextPaths,
            splitMode,
            base,
            { startIndex, endIndex },
        );
        pairDiagnostic.changeAnchorWindow = localChangeWindow;

        const {
            sectionSpans,
            activeSectionIds,
            defectSectionIds,
            sectionReversed,
        } = buildSectionSpans(
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
            localChangeWindow,
            sectionSpans,
            activeSectionIds,
            defectSectionIds,
            sectionReversed,
        });
        pairDiagnostic.outcome = 'planned';
        pairDiagnostic.activeSectionIds = [...activeSectionIds].sort();
        pairDiagnostic.defectSectionIds = [...defectSectionIds].sort();
        pairDiagnostics.push(pairDiagnostic);
    }

    const collapseTargets = planCollapseTargets(
        ownership.conquestEvents,
        stars,
        previousRegions,
        nextRegions,
    );
    const diagnostics = buildActiveFrontPlanDiagnostics({
        stableAnchorIds: [...anchors].sort(),
        prevChainCount: prevChains.length,
        nextChainCount: nextChains.length,
        pairDiagnostics,
        fronts,
        collapseTargets,
        transitionVertexCount,
        stableAnchorEps,
        changeSpanEps,
        changeSpanPadPoints,
    });

    return {
        prevVersion: prev.version,
        nextVersion: next.version,
        fronts,
        collapseTargets,
        diagnostics,
    };
}

function collectPathSectionIds(prevPaths: readonly ChainPath[], nextPaths: readonly ChainPath[]): string[] {
    return Array.from(
        new Set<string>([
            ...prevPaths.flatMap((path) => path.sectionIds),
            ...nextPaths.flatMap((path) => path.sectionIds),
        ]),
    ).sort();
}

function buildActiveFrontPlanDiagnostics(input: {
    stableAnchorIds: string[];
    prevChainCount: number;
    nextChainCount: number;
    pairDiagnostics: ActiveFrontPairDiagnostic[];
    fronts: ActiveFrontPlan[];
    collapseTargets: CollapseTarget[];
    transitionVertexCount: number;
    stableAnchorEps: number;
    changeSpanEps: number;
    changeSpanPadPoints: number;
}): ActiveFrontPlanDiagnostics {
    const activeSectionCount = input.fronts.reduce(
        (total, front) => total + front.activeSectionIds.size,
        0,
    );
    const defectSectionCount = input.fronts.reduce(
        (total, front) => total + front.defectSectionIds.size,
        0,
    ) + input.pairDiagnostics.reduce((total, pair) => total + pair.defectSectionIds.length, 0);
    const plannedPairCount = input.pairDiagnostics.filter(
        (pair) => pair.outcome === 'planned',
    ).length;
    const defectTopologyGapCount = input.pairDiagnostics.filter(
        (pair) => pair.outcome === 'defect_topology_gap',
    ).length;
    const defectUnsupportedSplitCount = input.pairDiagnostics.filter(
        (pair) => pair.outcome === 'defect_unsupported_split_mode',
    ).length;
    const noChangePairCount = input.pairDiagnostics.filter(
        (pair) => pair.outcome === 'no_change_span',
    ).length;
    const defectPairCount = defectTopologyGapCount + defectUnsupportedSplitCount;
    const classification: ActiveFrontPlanClassification =
        defectPairCount > 0 || defectSectionCount > 0
            ? 'classification_defect'
            : input.fronts.length > 0
            ? 'animated_fronts'
            : input.collapseTargets.length > 0
              ? 'collapse_only'
              : 'classification_defect';

    return {
        tunables: {
            transitionVertexCount: input.transitionVertexCount,
            stableAnchorEps: input.stableAnchorEps,
            changeSpanEps: input.changeSpanEps,
            changeSpanPadPoints: input.changeSpanPadPoints,
        },
        stableAnchorIds: input.stableAnchorIds,
        pairDiagnostics: input.pairDiagnostics,
        summary: {
            classification,
            hasClassificationDefect: defectPairCount > 0 || defectSectionCount > 0,
            stableAnchorCount: input.stableAnchorIds.length,
            prevChainCount: input.prevChainCount,
            nextChainCount: input.nextChainCount,
            pairCount: input.pairDiagnostics.length,
            plannedPairCount,
            defectPairCount,
            noChangePairCount,
            defectTopologyGapCount,
            defectUnsupportedSplitCount,
            frontCount: input.fronts.length,
            activeSectionCount,
            defectSectionCount,
            collapseTargetCount: input.collapseTargets.length,
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
            changeAnchors: getActiveFrontChangeAnchors(front),
            anchorStartId: front.anchorStartId,
            anchorEndId: front.anchorEndId,
            splitMode: front.splitMode,
            changeSpan: front.changeSpan,
            changeAnchorWindow: front.localChangeWindow,
            activeSectionIds: [...front.activeSectionIds].sort(),
            defectSectionIds: [...front.defectSectionIds].sort(),
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
            regionId: target.regionId,
            ownerId: target.ownerId,
            center: target.center,
            anchorStarIds: [...target.anchorStarIds],
            pointCount: target.points.length,
        })),
    };
}

// ---------------------------------------------------------------------------
// Sampling
// ---------------------------------------------------------------------------

export function sampleActiveFrontSectionGeometry(
    plan: ActiveFrontTransitionPlan,
    prev: FrontierTopology,
    next: FrontierTopology,
    progress: number,
    transitionVertexCount?: number,
): ReadonlyMap<string, [number, number][]> {
    const t = Math.min(Math.max(progress, 0), 1);
    const sectionGeometry = new Map<string, Vec2[]>();

    // Start with static passthrough (next topology).
    for (const [sectionId, section] of next.sections) {
        sectionGeometry.set(
            sectionId,
            section.points.map((point) => [point[0], point[1]] as Vec2),
        );
    }

    // Replace only the local moving interval inside each active section.
    for (const front of plan.fronts) {
        const interpolatedPaths = buildInterpolatedPaths(
            front,
            prev,
            next,
            t,
            transitionVertexCount ?? plan.diagnostics.tunables.transitionVertexCount,
        );

        for (const [sectionId, span] of front.sectionSpans) {
            if (!front.activeSectionIds.has(sectionId)) continue;
            if (span.activeStartIndex < 0 || span.activeEndIndex < span.activeStartIndex) {
                continue;
            }
            const nextSection = next.sections.get(sectionId);
            if (!nextSection) continue;
            const pathPoints = interpolatedPaths[span.pathIndex];
            const reversed = front.sectionReversed.get(sectionId);
            const workingPoints = reversed
                ? [...nextSection.points].reverse().map((point) => [point[0], point[1]] as Vec2)
                : nextSection.points.map((point) => [point[0], point[1]] as Vec2);

            for (
                let pathIndex = span.activeStartIndex;
                pathIndex <= span.activeEndIndex;
                pathIndex += 1
            ) {
                const localSectionIndex =
                    span.pathPointOffset + (pathIndex - span.startIndex);
                if (
                    localSectionIndex < 0 ||
                    localSectionIndex >= workingPoints.length ||
                    pathIndex < 0 ||
                    pathIndex >= pathPoints.length
                ) {
                    continue;
                }
                const sample = pathPoints[pathIndex]!;
                workingPoints[localSectionIndex] = [sample[0], sample[1]];
            }

            sectionGeometry.set(
                sectionId,
                reversed ? [...workingPoints].reverse() : workingPoints,
            );
        }
    }

    return sectionGeometry;
}

export function sampleActiveFrontTransition(
    plan: ActiveFrontTransitionPlan,
    _prev: FrontierTopology,
    next: FrontierTopology,
    progress: number,
    transitionVertexCount?: number,
): FillTransitionFrame {
    const t = Math.min(Math.max(progress, 0), 1);
    const sectionGeometry = sampleActiveFrontSectionGeometry(
        plan,
        _prev,
        next,
        t,
        transitionVertexCount,
    );

    const regions: { ownerId: string; points: Vec2[] }[] = [];

    // Rebuild loops from NEXT topology
    for (const loop of next.loops) {
        const pts = rebuildLoopPointsFromGeometry(loop, sectionGeometry);
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

export function sampleActiveFrontBorderFrame(
    plan: ActiveFrontTransitionPlan,
    prev: FrontierTopology,
    next: FrontierTopology,
    progress: number,
    transitionVertexCount?: number,
): BorderTransitionFrame {
    const sectionGeometry = sampleActiveFrontSectionGeometry(
        plan,
        prev,
        next,
        progress,
        transitionVertexCount,
    );
    return {
        frontiers: [...next.sections.values()].map((section) => ({
            ownerPairKey: section.ownerPairKey,
            points: sectionGeometry.get(section.id) ?? section.points,
        })),
    };
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
    sectionSpans: Map<string, {
        startIndex: number;
        endIndex: number;
        pathPointOffset: number;
    }>;
    sectionReversed: Map<string, boolean>;
} {
    const points: Vec2[] = [];
    const sectionSpans = new Map<string, {
        startIndex: number;
        endIndex: number;
        pathPointOffset: number;
    }>();
    const sectionReversed = new Map<string, boolean>();

    let currentVertex = anchorStartId;
    for (const sectionId of sectionIds) {
        const section = topo.sections.get(sectionId);
        if (!section) continue;

        const reversed = section.startVertexId !== currentVertex;
        const orientedPoints = getOrientedSectionPoints(section, currentVertex);
        const startIndex = points.length;
        const pathPointOffset = appendPolyline(points, orientedPoints);
        const endIndex = points.length - 1;
        sectionSpans.set(sectionId, { startIndex, endIndex, pathPointOffset });
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

function appendPolyline(out: Vec2[], segment: readonly Vec2[]): number {
    if (segment.length === 0) return 0;
    let from = 0;
    if (out.length > 0) {
        const last = out[out.length - 1];
        const first = segment[0];
        if (distance(last, first) < 1e-3) from = 1;
    }
    for (let i = from; i < segment.length; i += 1) {
        out.push(segment[i]);
    }
    return from;
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

function dedupeChainsByGeometry(chains: ChainPath[]): ChainPath[] {
    const unique = new Map<string, ChainPath>();
    for (const chain of chains) {
        const key = `${chain.anchorStartId}|${chain.anchorEndId}|${serializePathPoints(chain.points)}`;
        if (!unique.has(key)) {
            unique.set(key, chain);
        }
    }
    return [...unique.values()];
}

function serializePathPoints(points: readonly Vec2[]): string {
    return points
        .map((point) => `${point[0].toFixed(3)},${point[1].toFixed(3)}`)
        .join(';');
}

function buildConquestRelevantAnchorPairKeys(
    prev: FrontierTopology,
    next: FrontierTopology,
    prevByKey: ReadonlyMap<string, ChainPath[]>,
    nextByKey: ReadonlyMap<string, ChainPath[]>,
    conquestEvents: readonly TerritoryConquestEvent[],
    previousRegions: readonly TerritoryRegionShape[],
): Set<string> {
    const allKeys = new Set<string>([...prevByKey.keys(), ...nextByKey.keys()]);
    if (conquestEvents.length === 0) {
        return allKeys;
    }

    const relevantKeys = new Set<string>();
    for (const key of allKeys) {
        const prevPaths = prevByKey.get(key) ?? [];
        const nextPaths = nextByKey.get(key) ?? [];
        if (
            anchorPairTouchesConquest(
                prev,
                next,
                prevPaths,
                nextPaths,
                conquestEvents,
                previousRegions,
            )
        ) {
            relevantKeys.add(key);
        }
    }

    return relevantKeys;
}

function anchorPairTouchesConquest(
    prev: FrontierTopology,
    next: FrontierTopology,
    prevPaths: readonly ChainPath[],
    nextPaths: readonly ChainPath[],
    conquestEvents: readonly TerritoryConquestEvent[],
    previousRegions: readonly TerritoryRegionShape[],
): boolean {
    for (const event of conquestEvents) {
        if (
            pathsTouchConquest(prev, prevPaths, event, previousRegions)
            || pathsTouchConquest(next, nextPaths, event, previousRegions)
        ) {
            return true;
        }
    }
    return false;
}

function pathsTouchConquest(
    topo: FrontierTopology,
    paths: readonly ChainPath[],
    event: TerritoryConquestEvent,
    previousRegions: readonly TerritoryRegionShape[],
): boolean {
    const relevantStarIds = listConquestStarIds(event, previousRegions);
    if (relevantStarIds.length === 0) {
        return false;
    }
    for (const path of paths) {
        for (const sectionId of path.sectionIds) {
            const section = topo.sections.get(sectionId);
            if (!section) continue;
            if (sectionTouchesConquest(section, event, relevantStarIds)) {
                return true;
            }
        }
    }
    return false;
}

function sectionTouchesConquest(
    section: FrontierSection,
    event: TerritoryConquestEvent,
    relevantStarIds: readonly string[],
): boolean {
    const ownerTouchesConquest =
        section.leftOwnerId === event.previousOwner ||
        section.leftOwnerId === event.newOwner ||
        section.rightOwnerId === event.previousOwner ||
        section.rightOwnerId === event.newOwner;
    if (!ownerTouchesConquest) {
        return false;
    }

    return influenceTouchesConquest(section.leftInfluence, relevantStarIds)
        || influenceTouchesConquest(section.rightInfluence, relevantStarIds);
}

function influenceTouchesConquest(
    influence: FrontierSection['leftInfluence'],
    relevantStarIds: readonly string[],
): boolean {
    return (
        relevantStarIds.includes(influence.primaryStarId)
        || (typeof influence.secondaryStarId === 'string'
            && relevantStarIds.includes(influence.secondaryStarId))
    );
}

function listConquestStarIds(
    event: TerritoryConquestEvent,
    previousRegions: readonly TerritoryRegionShape[],
): string[] {
    const ids = new Set<string>();
    ids.add(event.starId);
    if (typeof event.attackerStarId === 'string' && event.attackerStarId.length > 0) {
        ids.add(event.attackerStarId);
    }
    for (const attackerStarId of event.attackerStarIds ?? []) {
        if (attackerStarId.length > 0) {
            ids.add(attackerStarId);
        }
    }
    const previousRegion = previousRegions.find((region) => {
        if (region.ownerId !== event.previousOwner) return false;
        const anchorStarIds = region.anchorStarIds ?? [];
        return anchorStarIds.length === 2 && anchorStarIds.includes(event.starId);
    });
    for (const anchorStarId of previousRegion?.anchorStarIds ?? []) {
        ids.add(anchorStarId);
    }
    return [...ids];
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

function buildLocalChangeWindow(
    prevPaths: readonly ChainPath[],
    nextPaths: readonly ChainPath[],
    splitMode: SplitMode,
    base: 'prev' | 'next',
    changeSpan: { startIndex: number; endIndex: number },
): LocalChangeWindow | null {
    if (splitMode !== 'none' || base !== 'next') {
        return null;
    }

    const prevPoints = prevPaths[0]?.points ?? [];
    const nextPoints = nextPaths[0]?.points ?? [];
    if (prevPoints.length === 0 || nextPoints.length === 0) {
        return null;
    }

    const nextAnchorStartIndex = clampIndex(changeSpan.startIndex, nextPoints.length);
    const nextAnchorEndIndex = clampIndex(changeSpan.endIndex, nextPoints.length);
    if (nextAnchorStartIndex === -1 || nextAnchorEndIndex === -1) {
        return null;
    }

    const startPoint = nextPoints[nextAnchorStartIndex];
    const endPoint = nextPoints[nextAnchorEndIndex];
    if (!startPoint || !endPoint) {
        return null;
    }
    const nextTable = buildArcLengthTable(nextPoints);
    const prevStartParam = normalizedParamAtIndex(nextTable, nextAnchorStartIndex);
    const prevEndParam = normalizedParamAtIndex(nextTable, nextAnchorEndIndex);

    return {
        nextAnchorStartIndex,
        nextAnchorEndIndex,
        prevStartParam,
        prevEndParam,
    };
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
    sectionSpans: Map<string, {
        startIndex: number;
        endIndex: number;
        pathPointOffset: number;
        pathIndex: number;
        activeStartIndex: number;
        activeEndIndex: number;
    }>;
    activeSectionIds: Set<string>;
    defectSectionIds: Set<string>;
    sectionReversed: Map<string, boolean>;
} {
    const sectionSpans = new Map<string, {
        startIndex: number;
        endIndex: number;
        pathPointOffset: number;
        pathIndex: number;
        activeStartIndex: number;
        activeEndIndex: number;
    }>();
    const activeSectionIds = new Set<string>();
    const defectSectionIds = new Set<string>();
    const sectionReversed = new Map<string, boolean>();
    const markWholeNextPathActive = (): void => {
        for (const path of nextPaths) {
            for (const [sectionId, span] of path.sectionSpans) {
                activeSectionIds.add(sectionId);
                const existing = sectionSpans.get(sectionId);
                if (existing) {
                    sectionSpans.set(sectionId, {
                        ...existing,
                        activeStartIndex: span.startIndex,
                        activeEndIndex: span.endIndex,
                    });
                }
            }
        }
    };

    for (let pathIndex = 0; pathIndex < nextPaths.length; pathIndex += 1) {
        const path = nextPaths[pathIndex];
        for (const [sectionId, span] of path.sectionSpans) {
            sectionSpans.set(sectionId, {
                ...span,
                pathIndex,
                activeStartIndex: -1,
                activeEndIndex: -1,
            });
        }
        for (const [sectionId, reversed] of path.sectionReversed) {
            sectionReversed.set(sectionId, reversed);
        }
    }

    if (splitMode === '1to2' || splitMode === '2to1') {
        markWholeNextPathActive();
        return { sectionSpans, activeSectionIds, defectSectionIds, sectionReversed };
    }

    if (base !== 'next') {
        for (const path of nextPaths) {
            for (const sectionId of path.sectionIds) {
                defectSectionIds.add(sectionId);
            }
        }
        return { sectionSpans, activeSectionIds, defectSectionIds, sectionReversed };
    }

    const [onlyPath] = nextPaths;
    for (const [sectionId, span] of onlyPath.sectionSpans) {
        const activeStartIndex = Math.max(span.startIndex, changeSpan.startIndex);
        const activeEndIndex = Math.min(span.endIndex, changeSpan.endIndex);
        const overlaps = activeStartIndex <= activeEndIndex;
        if (overlaps) {
            activeSectionIds.add(sectionId);
            const existing = sectionSpans.get(sectionId);
            if (existing) {
                sectionSpans.set(sectionId, {
                    ...existing,
                    activeStartIndex,
                    activeEndIndex,
                });
            }
        }
    }

    return { sectionSpans, activeSectionIds, defectSectionIds, sectionReversed };
}

// ---------------------------------------------------------------------------
// Helper: interpolation
// ---------------------------------------------------------------------------

function buildInterpolatedPaths(
    plan: ActiveFrontPlan,
    _prev: FrontierTopology,
    _next: FrontierTopology,
    t: number,
    transitionVertexCount: number,
): Vec2[][] {
    if (plan.splitMode === 'none') {
        return [buildInterpolatedActiveFrontPath(plan, t, transitionVertexCount)];
    }
    if (plan.splitMode === '1to2') {
        const prevChain = plan.prevPaths[0]?.points ?? [];
        const nextA = plan.nextPaths[0]?.points ?? [];
        const nextB = plan.nextPaths[1]?.points ?? [];
        const { prevForNext0, prevForNext1 } = splitByNearest(prevChain, nextA, nextB);
        return [
            lerpMonotonicWholeFront(prevForNext0, nextA, t),
            lerpMonotonicWholeFront(prevForNext1, nextB, t),
        ];
    }
    const prevA = plan.prevPaths[0]?.points ?? [];
    const prevB = plan.prevPaths[1]?.points ?? [];
    const nextChain = plan.nextPaths[0]?.points ?? [];
    const mergedPrev = mergeByNearest(prevA, prevB, nextChain);
    return [lerpMonotonicWholeFront(mergedPrev, nextChain, t)];
}

function buildInterpolatedActiveFrontPath(
    plan: ActiveFrontPlan,
    t: number,
    transitionVertexCount: number,
): Vec2[] {
    const nextPath = plan.nextPaths[0]?.points.map((point) => [point[0], point[1]] as Vec2) ?? [];
    const correspondence = getActiveFrontMonotonicCorrespondence(
        plan,
        t,
        transitionVertexCount,
    );
    if (!correspondence) {
        return lerpMonotonicWholeFront(plan.prevPaths[0]?.points ?? [], nextPath, t);
    }

    const startIndex = plan.localChangeWindow?.nextAnchorStartIndex ?? -1;
    if (startIndex < 0) {
        return lerpMonotonicWholeFront(plan.prevPaths[0]?.points ?? [], nextPath, t);
    }

    const endIndex = plan.localChangeWindow?.nextAnchorEndIndex ?? startIndex;
    const activePointCount = Math.max(1, endIndex - startIndex + 1);
    const resampledActiveFront = samplePolylineBetweenParams(
        correspondence.activeFront,
        0,
        1,
        activePointCount,
    );

    for (let i = 0; i < resampledActiveFront.length; i += 1) {
        const index = startIndex + i;
        if (index < 0 || index >= nextPath.length) continue;
        nextPath[index] = resampledActiveFront[i]!;
    }
    return nextPath;
}

function lerpMonotonicWholeFront(prev: Vec2[], next: Vec2[], t: number): Vec2[] {
    if (next.length === 0) return [];
    const prevSamples = samplePolylineBetweenParams(
        prev.length > 0 ? prev : next,
        0,
        1,
        next.length,
    );
    return prevSamples.map((prevPoint, index) =>
        lerpPoint(prevPoint, next[index]!, t),
    );
}

export function getActiveFrontMonotonicCorrespondence(
    front: ActiveFrontTransitionPlan['fronts'][number],
    progress = 1,
    transitionVertexCount?: number,
): ActiveFrontMonotonicCorrespondence | null {
    if (front.splitMode !== 'none') {
        return null;
    }

    const localChangeWindow = front.localChangeWindow;
    const prevPath = front.prevPaths[0]?.points ?? [];
    const postPath = front.nextPaths[0]?.points ?? [];
    if (!localChangeWindow || prevPath.length === 0 || postPath.length === 0) {
        return null;
    }

    const startIndex = clampIndex(localChangeWindow.nextAnchorStartIndex, postPath.length);
    const endIndex = clampIndex(localChangeWindow.nextAnchorEndIndex, postPath.length);
    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        return null;
    }

    const postFront = postPath
        .slice(startIndex, endIndex + 1)
        .map((point) => [point[0], point[1]] as Vec2);
    if (postFront.length === 0) {
        return null;
    }

    const sampledVertexCount =
        startIndex === endIndex
            ? 1
            : normalizeTransitionVertexCount(
                transitionVertexCount,
                postFront.length,
            );
    const sampledPostFront = samplePolylineBetweenParams(
        postFront,
        0,
        1,
        sampledVertexCount,
    );

    const prevFront = samplePolylineBetweenParams(
        prevPath,
        localChangeWindow.prevStartParam,
        localChangeWindow.prevEndParam,
        sampledVertexCount,
    );
    const t = Math.min(Math.max(progress, 0), 1);
    const activeFront = prevFront.map((prevPoint, index) =>
        lerpPoint(prevPoint, sampledPostFront[index]!, t),
    );

    return {
        prevFront,
        postFront: sampledPostFront,
        activeFront,
        changeAnchors: {
            startPoint: [postFront[0][0], postFront[0][1]],
            endPoint: [
                postFront[postFront.length - 1][0],
                postFront[postFront.length - 1][1],
            ],
        },
    };
}

function clampIndex(index: number, pointCount: number): number {
    if (pointCount <= 0 || index < 0) return -1;
    return Math.min(index, pointCount - 1);
}

function normalizeTransitionVertexCount(
    value: number | null | undefined,
    fallback = DEFAULT_TRANSITION_VERTEX_COUNT,
): number {
    const raw =
        typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    return Math.max(1, Math.min(300, Math.round(raw)));
}

function concatSections(
    topo: FrontierTopology,
    sectionIds: string[],
    anchorStartId?: string,
): Vec2[] {
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
    const prevChain = prev.length > 0 ? prev : next;
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
    const projA = prevA.map((point) => projectPointToPolyline(point, next));
    const projB = prevB.map((point) => projectPointToPolyline(point, next));
    const merged = [...projA, ...projB].sort((a, b) => a.param - b.param);
    return merged.map((match) => match.point);
}

export function getActiveFrontChangeAnchors(
    front: ActiveFrontTransitionPlan['fronts'][number],
): ActiveFrontChangeAnchors | null {
    return getActiveFrontMonotonicCorrespondence(front)?.changeAnchors ?? null;
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
    for (const point of points) {
        sum += distancePointToPolyline(point, poly);
    }
    return sum / points.length;
}

function projectPointToPolylineWithParamFloor(
    p: Vec2,
    poly: Vec2[],
    minParam: number,
): { param: number; point: Vec2 } {
    if (poly.length === 0) return { param: minParam, point: p };
    if (poly.length === 1) return { param: minParam, point: poly[0] };

    const clampedMinParam = Math.min(Math.max(minParam, 0), 1);
    const table = buildArcLengthTable(poly);
    const minAbsolute = clampedMinParam * table.total;
    let bestDist = Infinity;
    let bestParam = clampedMinParam;
    let bestPoint: Vec2 = samplePolylineAtParam(poly, table, clampedMinParam);

    for (let i = 1; i < poly.length; i += 1) {
        const a = poly[i - 1];
        const b = poly[i];
        const segStart = table.cumulative[i - 1];
        const segEnd = table.cumulative[i];
        if (segEnd < minAbsolute) continue;

        const abx = b[0] - a[0];
        const aby = b[1] - a[1];
        const apx = p[0] - a[0];
        const apy = p[1] - a[1];
        const abLen2 = abx * abx + aby * aby;
        const minT =
            segEnd <= segStart || minAbsolute <= segStart
                ? 0
                : Math.min(1, Math.max(0, (minAbsolute - segStart) / (segEnd - segStart)));
        const projectedT =
            abLen2 <= 1e-9 ? minT : Math.max(minT, Math.min(1, (apx * abx + apy * aby) / abLen2));
        const proj: Vec2 = [a[0] + projectedT * abx, a[1] + projectedT * aby];
        const d = distance(p, proj);
        if (d < bestDist) {
            bestDist = d;
            const absolute = segStart + projectedT * (segEnd - segStart);
            bestParam = table.total <= 0 ? clampedMinParam : absolute / table.total;
            bestPoint = proj;
        }
    }

    return { param: bestParam, point: bestPoint };
}

function samplePolylineBetweenParams(
    points: Vec2[],
    startParam: number,
    endParam: number,
    sampleCount: number,
): Vec2[] {
    if (sampleCount <= 0) return [];
    if (sampleCount === 1) {
        const table = buildArcLengthTable(points);
        return [samplePolylineAtParam(points, table, startParam)];
    }

    const clampedStart = Math.min(Math.max(startParam, 0), 1);
    const clampedEnd = Math.min(Math.max(endParam, clampedStart), 1);
    const table = buildArcLengthTable(points);
    const out: Vec2[] = new Array(sampleCount);
    for (let i = 0; i < sampleCount; i += 1) {
        const u = clampedStart + ((clampedEnd - clampedStart) * i) / (sampleCount - 1);
        out[i] = samplePolylineAtParam(points, table, u);
    }
    return out;
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

function normalizedParamAtIndex(
    table: { cumulative: number[]; total: number },
    index: number,
): number {
    if (index <= 0 || table.cumulative.length === 0 || table.total <= 0) {
        return 0;
    }
    const clampedIndex = Math.min(index, table.cumulative.length - 1);
    return table.cumulative[clampedIndex]! / table.total;
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
    conquestEvents: readonly TerritoryConquestEvent[],
    stars: readonly TransitionStarPoint[],
    previousRegions: readonly TerritoryRegionShape[],
    _nextRegions: readonly TerritoryRegionShape[],
): CollapseTarget[] {
    const conqueredStarIdsByOwner = buildConqueredStarIdsByOwner(conquestEvents);
    const starPositions = new Map(
        stars.map((star) => [star.id, [star.x, star.y] as Vec2]),
    );
    const targets: CollapseTarget[] = [];

    for (const evt of conquestEvents) {
        const matchingRegion = previousRegions.find((region) => {
            if (region.ownerId !== evt.previousOwner) return false;
            const anchorStarIds = region.anchorStarIds ?? [];
            return anchorStarIds.length === 1 && anchorStarIds[0] === evt.starId;
        });
        if (!matchingRegion) continue;
        if (!isRegionEligibleForCollapse(matchingRegion, conqueredStarIdsByOwner)) {
            continue;
        }
        targets.push({
            regionId: matchingRegion.regionId,
            ownerId: matchingRegion.ownerId,
            center:
                starPositions.get(evt.starId)
                ?? polygonCentroid(matchingRegion.points as Vec2[]),
            points: matchingRegion.points.map((point) => [point[0], point[1]] as Vec2),
            anchorStarIds: [...(matchingRegion.anchorStarIds ?? [])],
        });
    }

    return targets;
}

function buildConqueredStarIdsByOwner(
    conquestEvents: readonly TerritoryConquestEvent[],
): ReadonlyMap<string, Set<string>> {
    const result = new Map<string, Set<string>>();
    for (const event of conquestEvents) {
        const captured = result.get(event.previousOwner) ?? new Set<string>();
        captured.add(event.starId);
        result.set(event.previousOwner, captured);
    }
    return result;
}

function isRegionEligibleForCollapse(
    region: TerritoryRegionShape,
    conqueredStarIdsByOwner: ReadonlyMap<string, Set<string>>,
): boolean {
    const anchorStarIds = region.anchorStarIds ?? [];
    if (anchorStarIds.length === 0) return false;
    const conqueredStarIds = conqueredStarIdsByOwner.get(region.ownerId);
    if (!conqueredStarIds || conqueredStarIds.size === 0) return false;
    return anchorStarIds.every((starId) => conqueredStarIds.has(starId));
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
