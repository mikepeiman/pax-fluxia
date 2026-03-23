import { log } from '$lib/utils/logger';
import type { TerritoryFrameInput } from '../contracts/TerritoryFrameInput';
import type { TerritoryPresentationFrame } from '../contracts/PresentationContracts';
import type { TerritoryRuntimeDiagnostics } from '../contracts/DiagnosticsContracts';
import type { OwnershipSnapshot } from '../contracts/OwnershipContracts';
import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import type { TransitionSnapshot } from '../contracts/TransitionContracts';
import { normalizeTerritoryFrameInput } from './TerritoryConfigNormalizer';
import { validateTerritoryModeSelection } from './TerritoryCompatibilityMatrix';
import {
    createInitialTerritoryRuntimeState,
    type TerritoryRuntimeState,
} from './TerritoryRuntimeState';
import { OwnershipLayerCoordinator } from '../layers/ownership/OwnershipLayerCoordinator';
import { GeometryLayerCoordinator } from '../layers/geometry/GeometryLayerCoordinator';
import { TransitionLayerCoordinator } from '../layers/transition/TransitionLayerCoordinator';
import { PresentationLayerCoordinator } from '../layers/presentation/PresentationLayerCoordinator';
import { TerritoryWorker } from './TerritoryWorker';

export interface TerritoryRuntimeOutput {
    ownership: OwnershipSnapshot;
    geometry: GeometrySnapshot;
    transition: TransitionSnapshot;
    presentation: TerritoryPresentationFrame;
    diagnostics: TerritoryRuntimeDiagnostics;
}

export class TerritoryRuntimeCoordinator {
    private state: TerritoryRuntimeState = createInitialTerritoryRuntimeState();
    private lastLogMs = 0;
    private frameCount = 0;

    constructor(
        private readonly ownershipLayer = new OwnershipLayerCoordinator(),
        geometryLayer = new GeometryLayerCoordinator(),
        private readonly transitionLayer = new TransitionLayerCoordinator(),
        private readonly presentationLayer = new PresentationLayerCoordinator(),
        private readonly worker = new TerritoryWorker(geometryLayer),
    ) { }

    reset(): void {
        this.state = createInitialTerritoryRuntimeState();
        this.frameCount = 0;
    }

    update(rawInput: TerritoryFrameInput): TerritoryRuntimeOutput {
        const startedAtMs = Date.now();
        const diagnostics: TerritoryRuntimeDiagnostics = {
            startedAtMs,
            finishedAtMs: startedAtMs,
            messages: [],
        };

        const input = normalizeTerritoryFrameInput(rawInput);
        const compatibility = validateTerritoryModeSelection(input.selection);
        for (const warning of compatibility.warnings) {
            diagnostics.messages.push({
                level: 'warn',
                source: 'TerritoryCompatibilityMatrix',
                message: warning,
            });
        }

        const ownership = this.ownershipLayer.compute({
            nowMs: input.nowMs,
            stars: input.stars,
            lanes: input.lanes,
            selection: input.selection,
            previousSnapshot: this.state.previousOwnership,
        });

        const geometryResult = this.worker.computeGeometrySync({
            requestId: `territory:${input.tickId}:${input.nowMs}`,
            nowMs: input.nowMs,
            stars: input.stars,
            lanes: input.lanes,
            world: input.world,
            tunables: input.tunables,
            ownership,
            selection: input.selection,
            previousGeometry: this.state.previousGeometry,
        });
        const geometry = geometryResult.geometry;

        const transition = this.transitionLayer.compute({
            nowMs: input.nowMs,
            tunables: input.tunables,
            ownership,
            geometry,
            previousGeometry: this.state.previousGeometry,
            previousTransition: this.state.previousTransition,
            activeFillPlan: this.state.activeFillPlan,
            activeBorderPlan: this.state.activeBorderPlan,
            selection: input.selection,
        });

        const presentation = this.presentationLayer.compute({
            nowMs: input.nowMs,
            ownership,
            geometry,
            transition: transition.snapshot,
            selection: input.selection,
            tunables: input.tunables,
        });

        // ── Diagnostic logging ─────────────────────────────────────────────
        this.frameCount++;
        const logNow = Date.now();
        const envelope = transition.snapshot.envelope;

        // Always log conquest + transition lifecycle events
        if (ownership.conquestEvents.length > 0) {
            log.renderer('Territory',
                `CONQUEST: ${ownership.conquestEvents.length} event(s)` +
                ` | geom: ${geometry.territoryRegions.length} regions, ${geometry.frontierPolylines.length} frontiers` +
                ` | version: ${geometry.version.slice(0, 50)}`,
            );
        }
        if (envelope && !this.state.previousTransition?.envelope) {
            log.renderer('Territory',
                `TRANSITION START: duration=${envelope.durationMs}ms` +
                ` | fill=${transition.activeFillPlan?.sourceMode ?? 'none'}` +
                ` | border=${transition.activeBorderPlan?.sourceMode ?? 'none'}`,
            );
        }
        if (!envelope && this.state.previousTransition?.envelope) {
            log.renderer('Territory', 'TRANSITION COMPLETE');
        }

        // Throttled general stats (once per second)
        if (logNow - this.lastLogMs > 1000) {
            this.lastLogMs = logNow;
            log.renderer('Territory',
                `f=${this.frameCount}` +
                ` | owners=${ownership.starOwners.size} conquests=${ownership.conquestEvents.length}` +
                ` | regions=${geometry.territoryRegions.length} frontiers=${geometry.frontierPolylines.length}` +
                ` | cached=${geometryResult.fromCache}` +
                ` | fills=${presentation.fills.length} borders=${presentation.borders.length}` +
                ` | transition=${envelope ? `p=${envelope.progress.toFixed(2)}` : 'none'}` +
                ` | modes: g=${input.selection.geometryMode} ft=${input.selection.fillTransitionMode} bt=${input.selection.borderTransitionMode}`,
            );
        }

        this.state = {
            previousOwnership: ownership,
            previousGeometry: geometry,
            previousTransition: transition.snapshot,
            activeFillPlan: transition.activeFillPlan,
            activeBorderPlan: transition.activeBorderPlan,
        };

        diagnostics.finishedAtMs = Date.now();

        return {
            ownership,
            geometry,
            transition: transition.snapshot,
            presentation,
            diagnostics,
        };
    }
}
