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
    activeTopologyPlan?: FrontierTransitionPlan | null;
}

export interface TransitionCoordinatorResult {
    snapshot: TransitionSnapshot;
    activeFillPlan: FillTransitionPlan | null;
    activeTopologyPlan?: FrontierTransitionPlan | null;
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
        let activeTopologyPlan = input.activeTopologyPlan ?? null;

        const hasNewConquests = input.ownership.conquestEvents.length > 0;
        const hasGeometryDelta =
            input.previousGeometry?.version !== input.geometry.version;

        let envelope = input.previousTransition?.envelope ?? null;

        // ── Unified topology path — section-level transitions ────────────
        // Fills are reconstructed from independently interpolated border
        // sections. Unchanged sections pass through bit-identical.
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
            }
        }

        // ── Tunable-only geometry change (no conquest) ───────────────────
        // Cancel active transition so renderer snaps to new geometry.
        // Without this, MSR/CX/DX changes are invisible mid-transition
        // because the fill plan still holds old-tunable target regions.
        if (!hasNewConquests && hasGeometryDelta) {
            envelope = null;
            activeFillPlan = null;
            activeTopologyPlan = null;
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
        const pathUsed = activeTopologyPlan ? 'topology'
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
            activeTopologyPlan,
        };
    }
}
