import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { TerritoryTunables } from '../contracts/TerritoryFrameInput';
import type {
    FrontierSection,
    FrontierTopology,
    FrontierVertex,
} from '../contracts/FrontierTopologyContracts';
import {
    planActiveFrontTransition,
    type ActiveFrontTransitionPlan,
} from '../layers/transition/ActiveFrontTransition';
import type {
    PowerVoronoiFrontlineRuntime,
    PowerVoronoiDiagnosticBundle,
    PowerVoronoiFrontChain,
    PowerVoronoiFrontSplitMode,
    PowerVoronoiTransitionAnchor,
    PowerVoronoiTransitionFront,
    PowerVoronoiTransitionPair,
    PowerVoronoiTransitionPlan,
    PowerVoronoiTransitionVertex,
    PowerVoronoiUnsupportedTransitionFront,
} from './contracts';

type Vec2 = [number, number];

interface ChainPath {
    anchorStartId: string;
    anchorEndId: string;
    ownerPairKey: string;
    sectionIds: string[];
    points: Vec2[];
}

const ANCHOR_EPSILON = 2;

function distance(a: Vec2, b: Vec2): number {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function isStableAnchorKind(kind: FrontierVertex['kind']): boolean {
    return (
        kind === 'junction_3way' ||
        kind === 'world_intersection' ||
        kind === 'world_corner'
    );
}

function findStableAnchors(prev: FrontierTopology, next: FrontierTopology): Set<string> {
    const anchors = new Set<string>();
    for (const [vertexId, prevVertex] of prev.vertices) {
        if (!isStableAnchorKind(prevVertex.kind)) continue;
        const nextVertex = next.vertices.get(vertexId);
        if (!nextVertex || !isStableAnchorKind(nextVertex.kind)) continue;
        if (distance(prevVertex.point, nextVertex.point) <= ANCHOR_EPSILON) {
            anchors.add(vertexId);
        }
    }
    return anchors;
}

function otherVertex(section: FrontierSection, vertexId: string): string {
    return section.startVertexId === vertexId ? section.endVertexId : section.startVertexId;
}

function getOrientedSectionPoints(section: FrontierSection, fromVertexId: string): Vec2[] {
    if (section.startVertexId === fromVertexId) {
        return section.points as Vec2[];
    }
    return [...section.points].reverse() as Vec2[];
}

function appendPolyline(out: Vec2[], segment: readonly Vec2[]): void {
    if (segment.length === 0) return;
    const shouldSkipFirst =
        out.length > 0 && distance(out[out.length - 1], segment[0]) <= 1e-3;
    for (let index = shouldSkipFirst ? 1 : 0; index < segment.length; index += 1) {
        out.push(segment[index]);
    }
}

function normalizeChainOrder(
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

function buildChainsBetweenAnchors(topo: FrontierTopology, anchors: Set<string>): ChainPath[] {
    const unusedSections = new Set<string>([...topo.sections.keys()]);
    const chains: ChainPath[] = [];

    for (const anchorId of [...anchors].sort()) {
        const incident = [...(topo.sectionsByVertex.get(anchorId) ?? [])].sort();
        for (const sectionId of incident) {
            if (!unusedSections.has(sectionId)) continue;

            const chainSectionIds: string[] = [];
            let currentVertex = anchorId;
            let previousSectionId: string | null = null;

            while (true) {
                const candidates = (topo.sectionsByVertex.get(currentVertex) ?? [])
                    .filter((candidate) => candidate !== previousSectionId && unusedSections.has(candidate))
                    .sort();
                if (candidates.length === 0) break;

                const nextSectionId = candidates[0];
                const section = topo.sections.get(nextSectionId);
                if (!section) break;

                unusedSections.delete(nextSectionId);
                chainSectionIds.push(nextSectionId);
                previousSectionId = nextSectionId;
                currentVertex = otherVertex(section, currentVertex);
                if (anchors.has(currentVertex)) break;
            }

            if (chainSectionIds.length === 0) continue;

            const ordered = normalizeChainOrder(
                chainSectionIds,
                anchorId,
                currentVertex,
            );
            const points: Vec2[] = [];
            let walkVertex = ordered.anchorStartId;
            for (const orderedSectionId of ordered.orderedSectionIds) {
                const section = topo.sections.get(orderedSectionId);
                if (!section) continue;
                appendPolyline(points, getOrientedSectionPoints(section, walkVertex));
                walkVertex = otherVertex(section, walkVertex);
            }

            const ownerPairKey =
                topo.sections.get(ordered.orderedSectionIds[0])?.ownerPairKey ?? 'unknown';
            chains.push({
                anchorStartId: ordered.anchorStartId,
                anchorEndId: ordered.anchorEndId,
                ownerPairKey,
                sectionIds: ordered.orderedSectionIds,
                points,
            });
        }
    }

    return chains;
}

function groupChainsByAnchorPair(chains: readonly ChainPath[]): Map<string, ChainPath[]> {
    const grouped = new Map<string, ChainPath[]>();
    for (const chain of chains) {
        const key = `${chain.anchorStartId}|${chain.anchorEndId}`;
        const bucket = grouped.get(key);
        if (bucket) bucket.push(chain);
        else grouped.set(key, [chain]);
    }
    return grouped;
}

function splitModeFromCounts(prevCount: number, nextCount: number): PowerVoronoiFrontSplitMode | null {
    if (prevCount === 1 && nextCount === 1) return '1to1';
    if (prevCount === 1 && nextCount === 2) return '1to2';
    if (prevCount === 2 && nextCount === 1) return '2to1';
    return null;
}

function isWorldOwnerPair(ownerPairKey: string): boolean {
    return ownerPairKey.includes('world') || ownerPairKey.includes('__world__');
}

function pointsEqual(a: readonly Vec2[], b: readonly Vec2[]): boolean {
    if (a.length !== b.length) return false;
    for (let index = 0; index < a.length; index += 1) {
        if (distance(a[index], b[index]) > 1e-6) {
            return false;
        }
    }
    return true;
}

function chainsChanged(
    prevChains: readonly ChainPath[],
    nextChains: readonly ChainPath[],
): boolean {
    if (prevChains.length !== nextChains.length) return true;
    for (let index = 0; index < prevChains.length; index += 1) {
        if (!pointsEqual(prevChains[index].points, nextChains[index].points)) {
            return true;
        }
    }
    return false;
}

function buildAnchor(vertex: FrontierVertex | undefined, vertexId: string): PowerVoronoiTransitionAnchor {
    return {
        vertexId,
        point: vertex?.point ?? [0, 0],
        kind: vertex?.kind ?? 'junction_3way',
    };
}

function samplePolylineAtNormalizedLength(points: readonly Vec2[], u: number): Vec2 {
    if (points.length <= 1) return (points[0] ?? [0, 0]) as Vec2;
    const clamped = Math.max(0, Math.min(1, u));
    const lengths: number[] = [0];
    let total = 0;
    for (let index = 1; index < points.length; index += 1) {
        total += distance(points[index - 1], points[index]);
        lengths[index] = total;
    }
    const target = total * clamped;
    for (let index = 1; index < lengths.length; index += 1) {
        if (lengths[index] < target) continue;
        const previousLength = lengths[index - 1];
        const span = lengths[index] - previousLength;
        if (span <= 0) return points[index];
        const localT = (target - previousLength) / span;
        const a = points[index - 1];
        const b = points[index];
        return [
            a[0] + (b[0] - a[0]) * localT,
            a[1] + (b[1] - a[1]) * localT,
        ];
    }
    return points[points.length - 1];
}

function buildTransitionVertices(
    prevChains: readonly ChainPath[],
    nextChains: readonly ChainPath[],
): PowerVoronoiTransitionVertex[] {
    const vertices: PowerVoronoiTransitionVertex[] = [];
    const prevReference = prevChains[0]?.points ?? [];
    const postReference = nextChains[0]?.points ?? [];
    const count = postReference.length;
    for (let index = 0; index < count; index += 1) {
        const u = count <= 1 ? 0 : index / (count - 1);
        vertices.push({
            vertexId: `transition-vertex:${index}`,
            progressIndex: index,
            prePoint: samplePolylineAtNormalizedLength(prevReference, u),
            postPoint: postReference[index],
        });
    }
    return vertices;
}

function toFrontChain(prefix: string, chain: ChainPath, index: number): PowerVoronoiFrontChain {
    return {
        chainId: `${prefix}:${index}`,
        anchorStartId: chain.anchorStartId,
        anchorEndId: chain.anchorEndId,
        sectionIds: [...chain.sectionIds],
        points: [...chain.points],
    };
}

interface TransitionFrontCollection {
    fronts: PowerVoronoiTransitionFront[];
    unsupportedFronts: PowerVoronoiUnsupportedTransitionFront[];
}

function collectTransitionFronts(
    prev: FrontierTopology,
    next: FrontierTopology,
): TransitionFrontCollection {
    const anchors = findStableAnchors(prev, next);
    const prevByPair = groupChainsByAnchorPair(buildChainsBetweenAnchors(prev, anchors));
    const nextByPair = groupChainsByAnchorPair(buildChainsBetweenAnchors(next, anchors));
    const fronts: PowerVoronoiTransitionFront[] = [];
    const unsupportedFronts: PowerVoronoiUnsupportedTransitionFront[] = [];

    for (const key of new Set<string>([...prevByPair.keys(), ...nextByPair.keys()])) {
        const prevChains = prevByPair.get(key) ?? [];
        const nextChains = nextByPair.get(key) ?? [];
        if (prevChains.length === 0 || nextChains.length === 0) continue;

        const [anchorStartId, anchorEndId] = key.split('|');
        const ownerPairKey = nextChains[0]?.ownerPairKey ?? prevChains[0]?.ownerPairKey ?? 'unknown';
        if (isWorldOwnerPair(ownerPairKey) || !chainsChanged(prevChains, nextChains)) {
            continue;
        }

        const splitMode = splitModeFromCounts(prevChains.length, nextChains.length);
        if (!splitMode) {
            const attemptedSplitMode = `${prevChains.length}to${nextChains.length}`;
            unsupportedFronts.push({
                frontId: `pv-front-unsupported:${ownerPairKey}:${anchorStartId}:${anchorEndId}:${attemptedSplitMode}`,
                ownerPairKey,
                anchorStartId,
                anchorEndId,
                preChainCount: prevChains.length,
                postChainCount: nextChains.length,
                attemptedSplitMode,
                reason: 'unsupported_branch_count',
                fallback: 'unsupported_front_skipped',
            });
            continue;
        }

        const preConquestFront = prevChains.map((chain, index) =>
            toFrontChain(`pre:${ownerPairKey}`, chain, index),
        );
        const postConquestFront = nextChains.map((chain, index) =>
            toFrontChain(`post:${ownerPairKey}`, chain, index),
        );
        const transitionPairs: PowerVoronoiTransitionPair[] =
            splitMode === '1to2'
                ? [
                      {
                          pairId: `${ownerPairKey}:pair:0`,
                          splitMode,
                          preChainId: preConquestFront[0]?.chainId ?? null,
                          postChainId: postConquestFront[0]?.chainId ?? null,
                      },
                      {
                          pairId: `${ownerPairKey}:pair:1`,
                          splitMode,
                          preChainId: preConquestFront[0]?.chainId ?? null,
                          postChainId: postConquestFront[1]?.chainId ?? null,
                      },
                  ]
                : splitMode === '2to1'
                  ? [
                        {
                            pairId: `${ownerPairKey}:pair:0`,
                            splitMode,
                            preChainId: preConquestFront[0]?.chainId ?? null,
                            postChainId: postConquestFront[0]?.chainId ?? null,
                        },
                        {
                            pairId: `${ownerPairKey}:pair:1`,
                            splitMode,
                            preChainId: preConquestFront[1]?.chainId ?? null,
                            postChainId: postConquestFront[0]?.chainId ?? null,
                        },
                    ]
                  : [
                        {
                            pairId: `${ownerPairKey}:pair:0`,
                            splitMode,
                            preChainId: preConquestFront[0]?.chainId ?? null,
                            postChainId: postConquestFront[0]?.chainId ?? null,
                        },
                    ];

        fronts.push({
            frontId: `pv-front:${ownerPairKey}:${anchorStartId}:${anchorEndId}`,
            ownerPairKey,
            splitMode,
            changeAnchorStart: buildAnchor(next.vertices.get(anchorStartId), anchorStartId),
            changeAnchorEnd: buildAnchor(next.vertices.get(anchorEndId), anchorEndId),
            preConquestFront,
            postConquestFront,
            transitionVertices: buildTransitionVertices(prevChains, nextChains),
            transitionPairs,
        });
    }

    return { fronts, unsupportedFronts };
}

function cloneTunables(tunables: TerritoryTunables): TerritoryTunables {
    return { ...tunables };
}

function buildOwnershipStageSummary(
    previousOwnership: OwnershipSnapshot,
    nextOwnership: OwnershipSnapshot,
) {
    return {
        previousOwnerCount: previousOwnership.starOwners.size,
        nextOwnerCount: nextOwnership.starOwners.size,
        conquestCount: nextOwnership.conquestEvents.length,
        conquestStarIds: nextOwnership.conquestEvents.map((event) => event.starId),
    };
}

function buildGeometryStageSummary(
    preGeometry: GeometrySnapshot,
    postGeometry: GeometrySnapshot,
) {
    return {
        preRegionCount: preGeometry.territoryRegions.length,
        postRegionCount: postGeometry.territoryRegions.length,
        preFrontierCount: preGeometry.frontierPolylines.length,
        postFrontierCount: postGeometry.frontierPolylines.length,
        preLoopCount: preGeometry.frontierTopology.loops.length,
        postLoopCount: postGeometry.frontierTopology.loops.length,
    };
}

function buildTransitionPlanningStageSummary(
    activeFrontPlan: ActiveFrontTransitionPlan,
    fronts: readonly PowerVoronoiTransitionFront[],
    unsupportedFronts: readonly PowerVoronoiUnsupportedTransitionFront[],
    unaffectedLoopIds: readonly string[],
) {
    return {
        transitionFrontCount: fronts.length,
        unsupportedFrontCount: unsupportedFronts.length,
        activeFrontPlanFrontCount: activeFrontPlan.fronts.length,
        transitionPairCount: fronts.reduce(
            (count, front) => count + front.transitionPairs.length,
            0,
        ),
        unaffectedLoopCount: unaffectedLoopIds.length,
        splitModes: [...new Set(fronts.map((front) => front.splitMode))].sort(),
        unsupportedSplitModes: [
            ...new Set(unsupportedFronts.map((front) => front.attemptedSplitMode)),
        ].sort(),
    };
}

export function buildPowerVoronoiFrontlineRuntime(args: {
    preGeometry: GeometrySnapshot;
    postGeometry: GeometrySnapshot;
    previousOwnership: OwnershipSnapshot;
    nextOwnership: OwnershipSnapshot;
    tunables: TerritoryTunables;
}): PowerVoronoiFrontlineRuntime {
    const activeFrontPlan = planActiveFrontTransition(
        args.preGeometry.frontierTopology,
        args.postGeometry.frontierTopology,
        args.nextOwnership,
    );
    const planId = `pv-frontline:${args.preGeometry.version}:${args.postGeometry.version}`;
    const transitionFrontCollection = collectTransitionFronts(
        args.preGeometry.frontierTopology,
        args.postGeometry.frontierTopology,
    );
    const { fronts, unsupportedFronts } = transitionFrontCollection;
    const unaffectedLoopIds = args.postGeometry.frontierTopology.loops
        .filter((loop) => !fronts.some((front) => front.ownerPairKey.includes(loop.ownerId)))
        .map((loop) => loop.id);
    const frozenTunables = cloneTunables(args.tunables);
    const ownershipSummary = buildOwnershipStageSummary(
        args.previousOwnership,
        args.nextOwnership,
    );
    const geometrySummary = buildGeometryStageSummary(
        args.preGeometry,
        args.postGeometry,
    );
    const transitionPlan: PowerVoronoiTransitionPlan = {
        kind: 'power_voronoi_runtime',
        planId,
        startGeometryVersion: args.preGeometry.version,
        endGeometryVersion: args.postGeometry.version,
        conquestEvents: args.nextOwnership.conquestEvents,
        fronts,
        frozenTunables,
        unaffectedLoopIds,
    };
    const transitionPlanningSummary = buildTransitionPlanningStageSummary(
        activeFrontPlan as ActiveFrontTransitionPlan,
        fronts,
        unsupportedFronts,
        unaffectedLoopIds,
    );
    const diagnostics: PowerVoronoiDiagnosticBundle = {
        kind: 'power_voronoi_runtime',
        bundleId: `pv-bundle:${args.nextOwnership.version}:${planId}`,
        modeId: 'power_voronoi_runtime',
        planId,
        tunables: frozenTunables,
        ownershipStage: {
            stage: 'ownership',
            stageId: `${planId}:ownership`,
            tunables: frozenTunables,
            previousOwnership: args.previousOwnership,
            nextOwnership: args.nextOwnership,
            conquestEvents: args.nextOwnership.conquestEvents,
            summary: ownershipSummary,
        },
        geometryStage: {
            stage: 'geometry',
            stageId: `${planId}:geometry`,
            tunables: frozenTunables,
            preGeometry: args.preGeometry,
            postGeometry: args.postGeometry,
            summary: geometrySummary,
        },
        transitionPlanningStage: {
            stage: 'transition_planning',
            stageId: `${planId}:transition_planning`,
            tunables: frozenTunables,
            preTopology: args.preGeometry.frontierTopology,
            postTopology: args.postGeometry.frontierTopology,
            transitionPlan,
            unsupportedFronts,
            summary: transitionPlanningSummary,
        },
        frameEvaluationStage: {
            stage: 'frame_evaluation',
            stageId: `${planId}:frame_evaluation`,
            tunables: frozenTunables,
            sampledFrames: [],
            currentFrame: null,
            summary: {
                sampledFrameCount: 0,
                lastProgress: null,
                lastFrontlineCount: 0,
            },
        },
    };

    return {
        kind: 'power_voronoi_frontline_runtime',
        preGeometry: args.preGeometry,
        postGeometry: args.postGeometry,
        activeFrontPlan: activeFrontPlan as ActiveFrontTransitionPlan,
        plan: transitionPlan,
        diagnostics,
    };
}
