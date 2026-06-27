import type { TerritoryTunables } from '../../contracts/TerritoryFrameInput';
import type { TerritoryModeSelection } from '../../contracts/TerritoryModeSelection';
import type { GeometrySnapshot } from '../../contracts/GeometryContracts';
import type { OwnershipSnapshot } from '../../contracts/OwnershipContracts';
import type {
    BorderTransitionFrame,
    FillTransitionFrame,
    FillTransitionPlan,
    TransitionFallbackReason,
    TransitionSnapshot,
} from '../../contracts/TransitionContracts';
import type { PowerVoronoiFrontlineRuntime } from '../../pvFrontline/contracts';
import { buildPowerVoronoiFrontlineRuntime } from '../../pvFrontline/planner';
import { samplePowerVoronoiFrontlineTransition } from '../../pvFrontline/sampler';
import { SharedTransitionClock } from './SharedTransitionClock';
import { FILL_TRANSITION_MODE_BY_ID } from './registry';
import { planFillTransition } from './planners/TerritoryTransitionPlanner';
import {
    planActiveFrontTransition,
    sampleActiveFrontTransition,
    type ActiveFrontTransitionPlan,
} from './ActiveFrontTransition';
import { log } from '../../../utils/logger';

type FrontierTopology =
    import('../../contracts/FrontierTopologyContracts').FrontierTopology;

export interface TransitionCoordinatorInput {
    nowMs: number;
    tunables: TerritoryTunables;
    selection: TerritoryModeSelection;
    ownership: OwnershipSnapshot;
    previousOwnership?: OwnershipSnapshot | null;
    geometry: GeometrySnapshot;
    previousGeometry?: GeometrySnapshot | null;
    previousTransition?: TransitionSnapshot | null;
    activeFillPlan: FillTransitionPlan | null;
    activeFrontPlan?: ActiveFrontTransitionPlan | null;
    activePvFrontlineTransition?: PowerVoronoiFrontlineRuntime | null;
    resolvedPowerVoronoiPair?: {
        preGeometry: GeometrySnapshot;
        postGeometry: GeometrySnapshot;
        previousOwnership: OwnershipSnapshot;
        nextOwnership: OwnershipSnapshot;
    } | null;
    transitionPrevTopology?: FrontierTopology | null;
}

export interface TransitionCoordinatorResult {
    snapshot: TransitionSnapshot;
    activeFillPlan: FillTransitionPlan | null;
    activeFrontPlan?: ActiveFrontTransitionPlan | null;
    activePvFrontlineTransition?: PowerVoronoiFrontlineRuntime | null;
    transitionPrevTopology?: FrontierTopology | null;
    fallbackReason?: TransitionFallbackReason | null;
}

function buildFillFrameFromGeometry(geometry: GeometrySnapshot): FillTransitionFrame {
    return {
        regions: geometry.territoryRegions.map((region) => ({
            ownerId: region.ownerId,
            points: region.points,
        })),
    };
}

function buildEmptyBorderFrame(): BorderTransitionFrame {
    return { frontiers: [] };
}

function isTransitionGeometryReliable(
    geometry: GeometrySnapshot | null | undefined,
): boolean {
    if (!geometry) return false;
    const diagnostics = geometry.diagnostics;
    return (
        diagnostics.topologyReliable &&
        diagnostics.identityReliable &&
        diagnostics.closureReliable &&
        diagnostics.resolvedGeometryOracle?.ok !== false
    );
}

export class TransitionLayerCoordinator {
    private readonly clock = new SharedTransitionClock();

    compute(input: TransitionCoordinatorInput): TransitionCoordinatorResult {
        let activeFillPlan = input.activeFillPlan;
        let activeFrontPlan = input.activeFrontPlan ?? null;
        let activePvFrontlineTransition =
            input.activePvFrontlineTransition ?? null;
        let fallbackReason: TransitionFallbackReason | null = null;

        const hasNewConquests = input.ownership.conquestEvents.length > 0;
        const hasGeometryDelta =
            input.previousGeometry?.version !== input.geometry.version;
        let envelope = input.previousTransition?.envelope ?? null;

        const topologyPathEnabled =
            input.selection.fillTransitionMode === 'unified_topology';
        const pvFrontlinePathEnabled =
            input.selection.fillTransitionMode === 'pv_frontline';
        const nextTopo = input.geometry.frontierTopology;
        const planPrevTopo = input.previousGeometry?.frontierTopology;
        let transitionPrevTopology = input.transitionPrevTopology ?? null;
        const samplePrevTopo = transitionPrevTopology ?? planPrevTopo;
        const previousGeometryReliable = isTransitionGeometryReliable(
            input.previousGeometry,
        );
        const nextGeometryReliable = isTransitionGeometryReliable(input.geometry);
        const canPlanTopologyPath =
            topologyPathEnabled &&
            !!(planPrevTopo && nextTopo) &&
            previousGeometryReliable &&
            nextGeometryReliable;

        if (hasNewConquests && hasGeometryDelta) {
            envelope = this.clock.buildEnvelope(
                `transition:${input.nowMs}`,
                input.nowMs,
                input.tunables.transitionDurationMs,
                input.ownership.conquestEvents,
            );

            if (pvFrontlinePathEnabled) {
                activeFillPlan = null;
                if (input.resolvedPowerVoronoiPair) {
                    const preReliable = isTransitionGeometryReliable(
                        input.resolvedPowerVoronoiPair.preGeometry,
                    );
                    const postReliable = isTransitionGeometryReliable(
                        input.resolvedPowerVoronoiPair.postGeometry,
                    );
                    if (preReliable && postReliable) {
                        activePvFrontlineTransition =
                            buildPowerVoronoiFrontlineRuntime({
                                preGeometry:
                                    input.resolvedPowerVoronoiPair.preGeometry,
                                postGeometry:
                                    input.resolvedPowerVoronoiPair.postGeometry,
                                previousOwnership:
                                    input.resolvedPowerVoronoiPair.previousOwnership,
                                nextOwnership:
                                    input.resolvedPowerVoronoiPair.nextOwnership,
                                tunables: input.tunables,
                            });
                        activeFrontPlan =
                            activePvFrontlineTransition.activeFrontPlan;
                        transitionPrevTopology =
                            input.resolvedPowerVoronoiPair.preGeometry.frontierTopology;
                        log.renderer(
                            'TransitionCoordinator',
                            `Using PV frontline path: ${activePvFrontlineTransition.plan.fronts.length} fronts`,
                        );
                    } else {
                        fallbackReason = preReliable
                            ? 'pv_frontline_unreliable_post_geometry'
                            : 'pv_frontline_unreliable_pre_geometry';
                        activePvFrontlineTransition = null;
                        activeFrontPlan = null;
                        transitionPrevTopology = null;
                        log.renderer(
                            'TransitionCoordinator',
                            `PV frontline selected but geometry is unreliable (${fallbackReason}); snapping to steady geometry.`,
                        );
                    }
                } else {
                    fallbackReason = 'pv_frontline_missing_geometry_pair';
                    activePvFrontlineTransition = null;
                    activeFrontPlan = null;
                    transitionPrevTopology = null;
                    log.renderer(
                        'TransitionCoordinator',
                        'pv_frontline selected without paired PRE/POST geometry; snapping to steady geometry.',
                    );
                }
            } else if (canPlanTopologyPath) {
                activePvFrontlineTransition = null;
                activeFrontPlan = planActiveFrontTransition(
                    planPrevTopo!,
                    nextTopo!,
                    input.ownership,
                );
                activeFillPlan = null;
                transitionPrevTopology = planPrevTopo!;
                log.renderer(
                    'TransitionCoordinator',
                    `Using unified active-front path: ${activeFrontPlan.fronts.length} fronts`,
                );
            } else {
                activePvFrontlineTransition = null;
                activeFrontPlan = null;
                transitionPrevTopology = null;

                if (topologyPathEnabled) {
                    fallbackReason =
                        !planPrevTopo || !nextTopo
                            ? 'unified_topology_missing_topology'
                            : !previousGeometryReliable
                              ? 'unified_topology_unreliable_previous_geometry'
                              : 'unified_topology_unreliable_next_geometry';
                    log.renderer(
                        'TransitionCoordinator',
                        `Unified topology selected but topology data unavailable ` +
                            `(prev=${!!planPrevTopo}, next=${!!nextTopo}) — falling back to static`,
                    );
                }

                if (
                    input.selection.fillTransitionMode !== 'off' &&
                    !topologyPathEnabled &&
                    !pvFrontlinePathEnabled
                ) {
                    const fillMode = FILL_TRANSITION_MODE_BY_ID.get(
                        input.selection.fillTransitionMode,
                    );
                    if (fillMode) {
                        activeFillPlan = planFillTransition(fillMode, {
                            nowMs: input.nowMs,
                            ownership: input.ownership,
                            previousGeometry: input.previousGeometry,
                            nextGeometry: input.geometry,
                        });
                    }
                } else {
                    activeFillPlan = null;
                }
            }
        }

        if (!hasNewConquests && hasGeometryDelta) {
            envelope = null;
            activeFillPlan = null;
            activeFrontPlan = null;
            activePvFrontlineTransition = null;
            transitionPrevTopology = null;
            fallbackReason = 'geometry_delta_without_conquest';
        }

        const activePlanIncompatibleWithSelection =
            (activePvFrontlineTransition !== null && !pvFrontlinePathEnabled) ||
            (activePvFrontlineTransition !== null &&
                pvFrontlinePathEnabled &&
                !nextGeometryReliable) ||
            (activeFrontPlan !== null &&
                activePvFrontlineTransition === null &&
                !topologyPathEnabled) ||
            (activeFillPlan !== null &&
                activeFillPlan.sourceMode !== input.selection.fillTransitionMode) ||
            (activeFrontPlan !== null &&
                activePvFrontlineTransition === null &&
                topologyPathEnabled &&
                (!samplePrevTopo || !nextTopo || !nextGeometryReliable));

        if (activePlanIncompatibleWithSelection) {
            envelope = null;
            activeFillPlan = null;
            activeFrontPlan = null;
            activePvFrontlineTransition = null;
            transitionPrevTopology = null;
            fallbackReason = 'active_transition_incompatible';
            log.renderer(
                'TransitionCoordinator',
                'Active transition no longer matches selected mode/topology; snapping to steady geometry.',
            );
        }

        if (envelope) {
            envelope.progress = this.clock.sampleProgress(envelope, input.nowMs);
        }

        let fillFrame: FillTransitionFrame;
        let borderFrame: BorderTransitionFrame;

        if (envelope && activePvFrontlineTransition) {
            fillFrame = samplePowerVoronoiFrontlineTransition(
                activePvFrontlineTransition,
                envelope.progress,
            );
            borderFrame = buildEmptyBorderFrame();
        } else if (envelope && activeFrontPlan && samplePrevTopo && nextTopo) {
            fillFrame = sampleActiveFrontTransition(
                activeFrontPlan,
                samplePrevTopo,
                nextTopo,
                envelope.progress,
            );
            borderFrame = buildEmptyBorderFrame();
        } else {
            const fillModeId = activeFillPlan?.sourceMode;
            const fillMode = fillModeId
                ? FILL_TRANSITION_MODE_BY_ID.get(fillModeId)
                : null;
            fillFrame =
                envelope && activeFillPlan && fillMode
                    ? fillMode.sample(activeFillPlan, {
                          nowMs: input.nowMs,
                          progress: envelope.progress,
                      })
                    : buildFillFrameFromGeometry(input.geometry);
            borderFrame = buildEmptyBorderFrame();
        }

        const pathUsed = activePvFrontlineTransition
            ? 'pv_frontline'
            : activeFrontPlan
              ? 'active_front'
              : activeFillPlan
                ? `fill:${activeFillPlan.sourceMode}`
                : 'static';
        if (envelope) {
            log.renderer(
                'CLR:TRACE',
                JSON.stringify({
                    pathUsed,
                    progress: envelope.progress.toFixed(3),
                    regionCount: fillFrame.regions.length,
                    borderCount: borderFrame.frontiers.length,
                    hasNewConquests,
                    hasGeometryDelta,
                    topologyPathEnabled,
                    pvFrontlinePathEnabled,
                }),
            );
        }

        if (envelope && envelope.progress >= 1) {
            envelope = null;
            activeFillPlan = null;
            activeFrontPlan = null;
            activePvFrontlineTransition = null;
            transitionPrevTopology = null;
        }

        return {
            snapshot: {
                geometryVersion: input.geometry.version,
                envelope,
                fillFrame,
                borderFrame,
            },
            activeFillPlan,
            activeFrontPlan,
            activePvFrontlineTransition,
            transitionPrevTopology,
            fallbackReason,
        };
    }
}
