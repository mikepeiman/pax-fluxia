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
    sampleActiveFrontBorderFrame,
    sampleActiveFrontTransition,
    type ActiveFrontTransitionPlan,
    type ActiveFrontPlanDiagnosticsSummary,
} from './ActiveFrontTransition';
import { log } from '$lib/utils/logger';

export interface TransitionCoordinatorInput {
    nowMs: number;
    stars: readonly { id: string; x: number; y: number }[];
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
    activeFrontDebug: ActiveFrontRuntimeDebugState;
    /** Prev topology to keep alive for the duration of the transition. */
    transitionPrevTopology?: import('../../contracts/FrontierTopologyContracts').FrontierTopology | null;
}

export interface ActiveFrontRuntimeDebugState {
    evaluation:
        | 'idle'
        | 'animated_fronts'
        | 'collapse_only'
        | 'classification_defect'
        | 'topology_unavailable'
        | 'legacy_fill'
        | 'static';
    pathUsed: string;
    transitionActive: boolean;
    transitionSelected: boolean;
    topologyPathSelected: boolean;
    hasNewConquests: boolean;
    hasGeometryDelta: boolean;
    topologyAvailable: {
        planPrev: boolean;
        next: boolean;
        samplePrev: boolean;
    };
    frontCount: number;
    collapseTargetCount: number;
    sampledProgress: number | null;
    planSummary: ActiveFrontPlanDiagnosticsSummary | null;
    hasClassificationDefect: boolean;
    defectPairCount: number;
    defectSectionCount: number;
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

function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number): number {
    const t = clamp01(value);
    return t * t * (3 - 2 * t);
}

function easeInOutQuad(value: number): number {
    const t = clamp01(value);
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeInOutCubic(value: number): number {
    const t = clamp01(value);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function shapePvFrontlineProgress(
    rawProgress: number,
    tunables: TerritoryTunables,
): number {
    const clamped = clamp01(rawProgress);
    const blend = clamp01(tunables.pvv4ProgressBlend ?? 0.4);
    const profile = tunables.pvv4ProgressProfile ?? 'smoothstep';
    const eased =
        profile === 'linear'
            ? clamped
            : profile === 'ease_in_out_quad'
              ? easeInOutQuad(clamped)
              : profile === 'ease_in_out_cubic'
                ? easeInOutCubic(clamped)
                : smoothstep(clamped);
    return clamped + (eased - clamped) * blend;
}

function isTopologyFillRebuildMode(fillTransitionMode: string): boolean {
    return (
        fillTransitionMode === 'topology_fill_rebuild' ||
        fillTransitionMode === 'unified_topology' ||
        // PVV4 still exposes the older public id. Keep that surface stable
        // while routing it through the active-front runtime path.
        fillTransitionMode === 'pv_frontline'
    );
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
        // Activated when user selects the topology-driven fill rebuild path.
        const pvFrontlineSelected = input.selection.fillTransitionMode === 'pv_frontline';
        const topologyFillRebuildSelected = isTopologyFillRebuildMode(
            input.selection.fillTransitionMode,
        );
        const nextTopo = input.geometry.frontierTopology;

        // For planning (conquest frame): use previousGeometry's topology
        const planPrevTopo = input.previousGeometry?.frontierTopology;
        // For sampling (subsequent frames): use the stored topology from when
        // the transition started — previousGeometry is overwritten every frame
        // and would point to the NEW topology on frame 2+.
        let transitionPrevTopology = input.transitionPrevTopology ?? null;
        const samplePrevTopo = transitionPrevTopology ?? planPrevTopo;

        const canPlanTopologyPath = topologyFillRebuildSelected && !!(planPrevTopo && nextTopo);
        const canSampleTopologyPath = topologyFillRebuildSelected && !!(samplePrevTopo && nextTopo);

        if (hasNewConquests && hasGeometryDelta) {
            envelope = this.clock.buildEnvelope(
                `transition:${input.nowMs}`,
                input.nowMs,
                input.tunables.transitionDurationMs,
                input.ownership.conquestEvents,
            );

            if (canPlanTopologyPath) {
                // ── UNIFIED ACTIVE-FRONT PATH ───────────────────────────
                activeFrontPlan = planActiveFrontTransition(
                    planPrevTopo!,
                    nextTopo!,
                    input.ownership,
                    {
                        stableAnchorEps: input.tunables.pvv4StableAnchorEps,
                        changeSpanEps: input.tunables.pvv4ChangeSpanEps,
                        changeSpanPadPoints: input.tunables.pvv4ChangeSpanPadPoints,
                    },
                    input.stars,
                    input.previousGeometry?.territoryRegions ?? [],
                    input.geometry.territoryRegions,
                );
                activeFillPlan = null;
                // Snapshot the prev topology so it survives the state overwrite
                transitionPrevTopology = planPrevTopo!;
                log.renderer('TransitionCoordinator',
                    `Using topology fill rebuild path: ${activeFrontPlan.fronts.length} fronts` +
                    ` | prevTopo v=${planPrevTopo!.version.slice(0, 20)} nextTopo v=${nextTopo!.version.slice(0, 20)}`,
                );
            } else {
                // ── LEGACY INDEPENDENT PATH (fallback) ───────────────────
                activeFrontPlan = null;
                transitionPrevTopology = null;

                if (topologyFillRebuildSelected) {
                    log.renderer('TransitionCoordinator',
                        `Topology fill rebuild selected but topology data unavailable ` +
                        `(prev=${!!planPrevTopo}, next=${!!nextTopo}) — using static geometry for this frame`,
                    );
                }

                if (input.selection.fillTransitionMode !== 'off' && !topologyFillRebuildSelected) {
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
        const sampledProgress =
            envelope && pvFrontlineSelected
                ? shapePvFrontlineProgress(envelope.progress, input.tunables)
                : envelope?.progress ?? 0;

        if (envelope && activeFrontPlan && samplePrevTopo && nextTopo) {
            // ── UNIFIED ACTIVE-FRONT SAMPLING ───────────────────────────
            fillFrame = sampleActiveFrontTransition(
                activeFrontPlan,
                samplePrevTopo,
                nextTopo,
                sampledProgress,
            );
            borderFrame = sampleActiveFrontBorderFrame(
                activeFrontPlan,
                samplePrevTopo,
                nextTopo,
                sampledProgress,
            );
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
        const pathUsed = activeFrontPlan ? (pvFrontlineSelected ? 'pv_frontline' : 'topology_fill_rebuild')
            : (activeFillPlan ? `fill:${activeFillPlan.sourceMode}` : 'static');
        const activeFrontDebug: ActiveFrontRuntimeDebugState = {
            evaluation: !topologyFillRebuildSelected
                ? (activeFillPlan ? 'legacy_fill' : 'static')
                : activeFrontPlan
                  ? activeFrontPlan.diagnostics.summary.classification
                  : hasNewConquests && hasGeometryDelta && !canPlanTopologyPath
                    ? 'topology_unavailable'
                    : 'idle',
            pathUsed,
            transitionActive: Boolean(envelope),
            transitionSelected: pvFrontlineSelected,
            topologyPathSelected: topologyFillRebuildSelected,
            hasNewConquests,
            hasGeometryDelta,
            topologyAvailable: {
                planPrev: Boolean(planPrevTopo),
                next: Boolean(nextTopo),
                samplePrev: Boolean(samplePrevTopo),
            },
            frontCount: activeFrontPlan?.fronts.length ?? 0,
            collapseTargetCount: activeFrontPlan?.collapseTargets.length ?? 0,
            sampledProgress: envelope ? sampledProgress : null,
            planSummary: activeFrontPlan?.diagnostics.summary ?? null,
            hasClassificationDefect:
                activeFrontPlan?.diagnostics.summary.hasClassificationDefect ?? false,
            defectPairCount:
                activeFrontPlan?.diagnostics.summary.defectPairCount ?? 0,
            defectSectionCount:
                activeFrontPlan?.diagnostics.summary.defectSectionCount ?? 0,
        };
        if (envelope) {
            log.renderer('CLR:TRACE', JSON.stringify({
                pathUsed,
                evaluation: activeFrontDebug.evaluation,
                progress: envelope.progress.toFixed(3),
                sampledProgress: sampledProgress.toFixed(3),
                regionCount: fillFrame.regions.length,
                borderCount: borderFrame.frontiers.length,
                hasNewConquests,
                hasGeometryDelta,
                topologyPathEnabled: topologyFillRebuildSelected,
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
            activeFrontDebug,
            transitionPrevTopology,
        };
    }
}
