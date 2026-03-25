import type { TerritoryTunables } from '../../contracts/TerritoryFrameInput';
import type { TerritoryModeSelection } from '../../contracts/TerritoryModeSelection';
import type { GeometrySnapshot } from '../../contracts/GeometryContracts';
import type { OwnershipSnapshot } from '../../contracts/OwnershipContracts';
import type {
    BorderTransitionFrame,
    BorderTransitionPlan,
    FillTransitionFrame,
    FillTransitionPlan,
    TransitionSnapshot,
} from '../../contracts/TransitionContracts';
import { SharedTransitionClock } from './SharedTransitionClock';
import {
    BORDER_TRANSITION_MODE_BY_ID,
    FILL_TRANSITION_MODE_BY_ID,
} from './registry';
import {
    planBorderTransition,
    planFillTransition,
} from './planners/TerritoryTransitionPlanner';
import {
    buildFrontierTransitionPlan,
    type FrontierTransitionPlan,
} from './planners/FrontierTopologyPlanner';
import { sampleTopologyFrame } from './TopologyFrameSampler';
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
    activeBorderPlan: BorderTransitionPlan | null;
    activeTopologyPlan?: FrontierTransitionPlan | null;
}

export interface TransitionCoordinatorResult {
    snapshot: TransitionSnapshot;
    activeFillPlan: FillTransitionPlan | null;
    activeBorderPlan: BorderTransitionPlan | null;
    activeTopologyPlan?: FrontierTransitionPlan | null;
}

function buildFillFrameFromGeometry(geometry: GeometrySnapshot): FillTransitionFrame {
    return {
        regions: geometry.territoryRegions,
    };
}

function buildBorderFrameFromGeometry(
    geometry: GeometrySnapshot,
): BorderTransitionFrame {
    return {
        frontiers: geometry.frontierPolylines,
    };
}

export class TransitionLayerCoordinator {
    private readonly clock = new SharedTransitionClock();

    compute(input: TransitionCoordinatorInput): TransitionCoordinatorResult {
        let activeFillPlan = input.activeFillPlan;
        let activeBorderPlan = input.activeBorderPlan;
        let activeTopologyPlan = input.activeTopologyPlan ?? null;

        const hasNewConquests = input.ownership.conquestEvents.length > 0;
        const hasGeometryDelta =
            input.previousGeometry?.version !== input.geometry.version;

        let envelope = input.previousTransition?.envelope ?? null;

        // ── Check if we can use the unified topology path ────────────────
        // DISABLED: topology path produces malformed fills + perf regression.
        // Keep code path for future activation once planner/sampler are fixed.
        const TOPOLOGY_PATH_ENABLED = false;
        const prevTopo = input.previousGeometry?.frontierTopology;
        const nextTopo = input.geometry.frontierTopology;
        const canUseTopologyPath = TOPOLOGY_PATH_ENABLED && !!(prevTopo && nextTopo);

        if (hasNewConquests && hasGeometryDelta) {
            envelope = this.clock.buildEnvelope(
                `transition:${input.nowMs}`,
                input.nowMs,
                input.tunables.transitionDurationMs,
                input.ownership.conquestEvents,
            );

            if (canUseTopologyPath) {
                // ── UNIFIED TOPOLOGY PATH ────────────────────────────────
                // Fills and borders are derived from the SAME interpolated
                // border sections. This prevents fill/border divergence.
                activeTopologyPlan = buildFrontierTransitionPlan(prevTopo, nextTopo);
                activeFillPlan = null;  // not needed — topology sampler handles both
                activeBorderPlan = null;
                log.renderer('TransitionCoordinator',
                    `Using unified topology path: ${activeTopologyPlan.sections.size} sections`,
                );
            } else {
                // ── LEGACY INDEPENDENT PATH (fallback) ───────────────────
                activeTopologyPlan = null;

                if (input.selection.fillTransitionMode !== 'off') {
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

                if (input.selection.borderTransitionMode !== 'off') {
                    const borderMode = BORDER_TRANSITION_MODE_BY_ID.get(
                        input.selection.borderTransitionMode,
                    );
                    if (borderMode) {
                        activeBorderPlan = planBorderTransition(borderMode, {
                            nowMs: input.nowMs,
                            ownership: input.ownership,
                            previousGeometry: input.previousGeometry,
                            nextGeometry: input.geometry,
                        });
                    }
                } else {
                    activeBorderPlan = null;
                }
            }
        }

        if (envelope) {
            envelope.progress = this.clock.sampleProgress(envelope, input.nowMs);
        }

        // ── Sample frames ────────────────────────────────────────────────
        let fillFrame: FillTransitionFrame;
        let borderFrame: BorderTransitionFrame;

        if (envelope && activeTopologyPlan && nextTopo) {
            // ── UNIFIED TOPOLOGY SAMPLING ────────────────────────────────
            // Both fill and border come from the SAME interpolated sections.
            const result = sampleTopologyFrame(
                activeTopologyPlan,
                nextTopo,
                envelope.progress,
            );
            fillFrame = result.fillFrame;
            borderFrame = result.borderFrame;
        } else {
            // ── LEGACY SAMPLING (independent fill + border) ──────────────
            const fillModeId = activeFillPlan?.sourceMode;
            const borderModeId = activeBorderPlan?.sourceMode;
            const fillMode = fillModeId
                ? FILL_TRANSITION_MODE_BY_ID.get(fillModeId)
                : null;
            const borderMode = borderModeId
                ? BORDER_TRANSITION_MODE_BY_ID.get(borderModeId)
                : null;

            fillFrame =
                envelope && activeFillPlan && fillMode
                    ? fillMode.sample(activeFillPlan, {
                        nowMs: input.nowMs,
                        progress: envelope.progress,
                    })
                    : buildFillFrameFromGeometry(input.geometry);

            borderFrame =
                envelope && activeBorderPlan && borderMode
                    ? borderMode.sample(activeBorderPlan, {
                        nowMs: input.nowMs,
                        progress: envelope.progress,
                    })
                    : buildBorderFrameFromGeometry(input.geometry);
        }

        if (envelope && envelope.progress >= 1) {
            envelope = null;
            activeFillPlan = null;
            activeBorderPlan = null;
            activeTopologyPlan = null;
        }

        return {
            snapshot: {
                geometryVersion: input.geometry.version,
                envelope,
                fillFrame,
                borderFrame,
            },
            activeFillPlan,
            activeBorderPlan,
            activeTopologyPlan,
        };
    }
}
