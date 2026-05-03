import type { TerritoryTunables } from '../../contracts/TerritoryFrameInput';
import type { TerritoryModeSelection } from '../../contracts/TerritoryModeSelection';
import type { GeometrySnapshot } from '../../contracts/GeometryContracts';
import type { OwnershipSnapshot } from '../../contracts/OwnershipContracts';
import type {
    BorderTransitionFrame,
    FillTransitionFrame,
    FillTransitionPlan,
    TransitionSnapshot,
} from '../../contracts/TransitionContracts';
import type { CanonicalPowerVoronoiTransitionRuntime } from '../../pvCanonical/contracts';
import { buildCanonicalPowerVoronoiTransitionRuntime } from '../../pvCanonical/planner';
import { sampleCanonicalPowerVoronoiTransition } from '../../pvCanonical/sampler';
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
    activeCanonicalPvTransition?: CanonicalPowerVoronoiTransitionRuntime | null;
    canonicalPowerVoronoiPair?: {
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
    activeCanonicalPvTransition?: CanonicalPowerVoronoiTransitionRuntime | null;
    transitionPrevTopology?: FrontierTopology | null;
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

export class TransitionLayerCoordinator {
    private readonly clock = new SharedTransitionClock();

    compute(input: TransitionCoordinatorInput): TransitionCoordinatorResult {
        let activeFillPlan = input.activeFillPlan;
        let activeFrontPlan = input.activeFrontPlan ?? null;
        let activeCanonicalPvTransition =
            input.activeCanonicalPvTransition ?? null;

        const hasNewConquests = input.ownership.conquestEvents.length > 0;
        const hasGeometryDelta =
            input.previousGeometry?.version !== input.geometry.version;
        let envelope = input.previousTransition?.envelope ?? null;

        const topologyPathEnabled =
            input.selection.fillTransitionMode === 'unified_topology';
        const canonicalPvPathEnabled =
            input.selection.fillTransitionMode === 'pv_frontline';
        const nextTopo = input.geometry.frontierTopology;
        const planPrevTopo = input.previousGeometry?.frontierTopology;
        let transitionPrevTopology = input.transitionPrevTopology ?? null;
        const samplePrevTopo = transitionPrevTopology ?? planPrevTopo;
        const canPlanTopologyPath = topologyPathEnabled && !!(planPrevTopo && nextTopo);

        if (hasNewConquests && hasGeometryDelta) {
            envelope = this.clock.buildEnvelope(
                `transition:${input.nowMs}`,
                input.nowMs,
                input.tunables.transitionDurationMs,
                input.ownership.conquestEvents,
            );

            if (canonicalPvPathEnabled) {
                activeFillPlan = null;
                if (input.canonicalPowerVoronoiPair) {
                    activeCanonicalPvTransition =
                        buildCanonicalPowerVoronoiTransitionRuntime({
                            preGeometry: input.canonicalPowerVoronoiPair.preGeometry,
                            postGeometry:
                                input.canonicalPowerVoronoiPair.postGeometry,
                            previousOwnership:
                                input.canonicalPowerVoronoiPair.previousOwnership,
                            nextOwnership:
                                input.canonicalPowerVoronoiPair.nextOwnership,
                            tunables: input.tunables,
                        });
                    activeFrontPlan =
                        activeCanonicalPvTransition.activeFrontPlan;
                    transitionPrevTopology =
                        input.canonicalPowerVoronoiPair.preGeometry.frontierTopology;
                    log.renderer(
                        'TransitionCoordinator',
                        `Using canonical PV frontline path: ${activeCanonicalPvTransition.plan.fronts.length} fronts`,
                    );
                } else {
                    activeCanonicalPvTransition = null;
                    activeFrontPlan = null;
                    transitionPrevTopology = null;
                    log.renderer(
                        'TransitionCoordinator',
                        'pv_frontline selected without paired PRE/POST geometry; snapping to steady geometry.',
                    );
                }
            } else if (canPlanTopologyPath) {
                activeCanonicalPvTransition = null;
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
                activeCanonicalPvTransition = null;
                activeFrontPlan = null;
                transitionPrevTopology = null;

                if (topologyPathEnabled) {
                    log.renderer(
                        'TransitionCoordinator',
                        `Unified topology selected but topology data unavailable ` +
                            `(prev=${!!planPrevTopo}, next=${!!nextTopo}) — falling back to static`,
                    );
                }

                if (
                    input.selection.fillTransitionMode !== 'off' &&
                    !topologyPathEnabled &&
                    !canonicalPvPathEnabled
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
            activeCanonicalPvTransition = null;
            transitionPrevTopology = null;
        }

        if (envelope) {
            envelope.progress = this.clock.sampleProgress(envelope, input.nowMs);
        }

        let fillFrame: FillTransitionFrame;
        let borderFrame: BorderTransitionFrame;

        if (envelope && activeCanonicalPvTransition) {
            fillFrame = sampleCanonicalPowerVoronoiTransition(
                activeCanonicalPvTransition,
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

        const pathUsed = activeCanonicalPvTransition
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
                    canonicalPvPathEnabled,
                }),
            );
        }

        if (envelope && envelope.progress >= 1) {
            envelope = null;
            activeFillPlan = null;
            activeFrontPlan = null;
            activeCanonicalPvTransition = null;
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
            activeCanonicalPvTransition,
            transitionPrevTopology,
        };
    }
}
