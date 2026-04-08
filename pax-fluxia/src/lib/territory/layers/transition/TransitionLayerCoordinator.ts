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
import { SharedTransitionClock } from './SharedTransitionClock';
import { FILL_TRANSITION_MODE_BY_ID } from './registry';
import { planFillTransition } from './planners/TerritoryTransitionPlanner';
import {
    planActiveFrontTransition,
    sampleActiveFrontTransition,
    type ActiveFrontTransitionPlan,
} from './ActiveFrontTransition';
import { log } from '$lib/utils/logger';

export interface TransitionCoordinatorInput {
    nowMs: number;
    tunables: TerritoryTunables;
    selection: TerritoryModeSelection;
    ownership: OwnershipSnapshot;
    geometry: GeometrySnapshot;
    previousGeometry?: GeometrySnapshot | null;
    previousTransition?: TransitionSnapshot | null;
    activeFillPlan: FillTransitionPlan | null;
    activeFrontPlan?: ActiveFrontTransitionPlan | null;
    /** Prev topology snapshot preserved from when the transition started. */
    transitionPrevTopology?: import('../../contracts/FrontierTopologyContracts').FrontierTopology | null;
}

export interface TransitionCoordinatorResult {
    snapshot: TransitionSnapshot;
    activeFillPlan: FillTransitionPlan | null;
    activeFrontPlan?: ActiveFrontTransitionPlan | null;
    /** Prev topology to keep alive for the duration of the transition. */
    transitionPrevTopology?: import('../../contracts/FrontierTopologyContracts').FrontierTopology | null;
}

function buildFillFrameFromGeometry(geometry: GeometrySnapshot): FillTransitionFrame {
    return {
        regions: geometry.territoryRegions,
    };
}

function buildEmptyBorderFrame(): BorderTransitionFrame {
    return {
        frontiers: [],
    };
}

export class TransitionLayerCoordinator {
    private readonly clock = new SharedTransitionClock();

    compute(input: TransitionCoordinatorInput): TransitionCoordinatorResult {
        let activeFillPlan = input.activeFillPlan;
        let activeFrontPlan = input.activeFrontPlan ?? null;

        const hasNewConquests = input.ownership.conquestEvents.length > 0;
        const hasGeometryDelta =
            input.previousGeometry?.version !== input.geometry.version;

        let envelope = input.previousTransition?.envelope ?? null;

        // ── Unified active-front path — frontier-chain transitions ───────
        // Fills are reconstructed from interpolated active-front geometry.
        // Activated when user selects 'unified_topology' fill transition mode.
        const TOPOLOGY_PATH_ENABLED = input.selection.fillTransitionMode === 'unified_topology';
        const nextTopo = input.geometry.frontierTopology;

        // For planning (conquest frame): use previousGeometry's topology
        const planPrevTopo = input.previousGeometry?.frontierTopology;
        // For sampling (subsequent frames): use the stored topology from when
        // the transition started — previousGeometry is overwritten every frame
        // and would point to the NEW topology on frame 2+.
        let transitionPrevTopology = input.transitionPrevTopology ?? null;
        const samplePrevTopo = transitionPrevTopology ?? planPrevTopo;

        const canPlanTopologyPath = TOPOLOGY_PATH_ENABLED && !!(planPrevTopo && nextTopo);
        const canSampleTopologyPath = TOPOLOGY_PATH_ENABLED && !!(samplePrevTopo && nextTopo);

        if (hasNewConquests && hasGeometryDelta) {
            envelope = this.clock.buildEnvelope(
                `transition:${input.nowMs}`,
                input.nowMs,
                input.tunables.transitionDurationMs,
                input.ownership.conquestEvents,
            );

            if (canPlanTopologyPath) {
                // ── UNIFIED ACTIVE-FRONT PATH ───────────────────────────
                activeFrontPlan = planActiveFrontTransition(planPrevTopo!, nextTopo!, input.ownership);
                activeFillPlan = null;
                // Snapshot the prev topology so it survives the state overwrite
                transitionPrevTopology = planPrevTopo!;
                log.renderer('TransitionCoordinator',
                    `Using unified active-front path: ${activeFrontPlan.fronts.length} fronts` +
                    ` | prevTopo v=${planPrevTopo!.version.slice(0, 20)} nextTopo v=${nextTopo!.version.slice(0, 20)}`,
                );
            } else {
                // ── LEGACY INDEPENDENT PATH (fallback) ───────────────────
                activeFrontPlan = null;
                transitionPrevTopology = null;

                if (TOPOLOGY_PATH_ENABLED) {
                    log.renderer('TransitionCoordinator',
                        `Unified topology selected but topology data unavailable ` +
                        `(prev=${!!planPrevTopo}, next=${!!nextTopo}) — falling back to static`,
                    );
                }

                if (input.selection.fillTransitionMode !== 'off' && !TOPOLOGY_PATH_ENABLED) {
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

        // ── Tunable-only geometry change (no conquest) ───────────────────
        // Cancel active transition so renderer snaps to new geometry.
        // Without this, MSR/CX/DX changes are invisible mid-transition
        // because the fill plan still holds old-tunable target regions.
        if (!hasNewConquests && hasGeometryDelta) {
            envelope = null;
            activeFillPlan = null;
            activeFrontPlan = null;
            transitionPrevTopology = null;
        }

        if (envelope) {
            envelope.progress = this.clock.sampleProgress(envelope, input.nowMs);
        }

        // ── Sample frames ────────────────────────────────────────────────
        let fillFrame: FillTransitionFrame;
        let borderFrame: BorderTransitionFrame;

        if (envelope && activeFrontPlan && samplePrevTopo && nextTopo) {
            // ── UNIFIED ACTIVE-FRONT SAMPLING ───────────────────────────
            fillFrame = sampleActiveFrontTransition(
                activeFrontPlan,
                samplePrevTopo,
                nextTopo,
                envelope.progress,
            );
            borderFrame = buildEmptyBorderFrame();
        } else {
            // ── LEGACY SAMPLING (independent fill + border) ──────────────
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

        // ── CLR per-frame transition trace ───────────────────────────────
        const pathUsed = activeFrontPlan ? 'active_front'
            : (activeFillPlan ? `fill:${activeFillPlan.sourceMode}` : 'static');
        if (envelope) {
            log.renderer('CLR:TRACE', JSON.stringify({
                pathUsed,
                progress: envelope.progress.toFixed(3),
                regionCount: fillFrame.regions.length,
                borderCount: borderFrame.frontiers.length,
                hasNewConquests,
                hasGeometryDelta,
                topologyPathEnabled: TOPOLOGY_PATH_ENABLED,
            }));
        }

        if (envelope && envelope.progress >= 1) {
            envelope = null;
            activeFillPlan = null;
            activeFrontPlan = null;
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
            transitionPrevTopology,
        };
    }
}
