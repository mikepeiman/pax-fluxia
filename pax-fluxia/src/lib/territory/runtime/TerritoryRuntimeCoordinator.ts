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

export interface TerritoryRuntimeOutput {
    ownership: OwnershipSnapshot;
    geometry: GeometrySnapshot;
    transition: TransitionSnapshot;
    presentation: TerritoryPresentationFrame;
    diagnostics: TerritoryRuntimeDiagnostics;
}

export class TerritoryRuntimeCoordinator {
    private state: TerritoryRuntimeState = createInitialTerritoryRuntimeState();

    constructor(
        private readonly ownershipLayer = new OwnershipLayerCoordinator(),
        private readonly geometryLayer = new GeometryLayerCoordinator(),
        private readonly transitionLayer = new TransitionLayerCoordinator(),
        private readonly presentationLayer = new PresentationLayerCoordinator(),
    ) {}

    reset(): void {
        this.state = createInitialTerritoryRuntimeState();
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

        const geometry = this.geometryLayer.compute({
            nowMs: input.nowMs,
            stars: input.stars,
            lanes: input.lanes,
            world: input.world,
            tunables: input.tunables,
            ownership,
            selection: input.selection,
            previousSnapshot: this.state.previousGeometry,
        });

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
            transition,
            selection: input.selection,
            tunables: input.tunables,
        });

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
