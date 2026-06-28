import type * as PIXI from 'pixi.js';
import type { TerritoryFrameInput } from '../contracts/TerritoryFrameInput';
import type { TransitionSnapshot } from '../contracts/TransitionContracts';
import type { TerritoryRuntimeDiagnostics } from '../contracts/DiagnosticsContracts';
import type { TerritoryVFXCommand } from '../vfx/VFXContracts';
import { TerritoryRuntimeCoordinator } from '../runtime/TerritoryRuntimeCoordinator';
import { PixiTerritoryPresenter } from '../adapters/pixi/PixiTerritoryPresenter';
import { PixiTerritoryDebugOverlay } from '../adapters/pixi/PixiTerritoryDebugOverlay';
import { TerritoryVFXBridge } from './TerritoryVFXBridge';
import { ConquestParticles } from '../vfx/handlers/ConquestParticles';
import { transitionSnapshotRecorder } from '../devtools/TransitionSnapshotRecorder';
import { overlayConfig } from '../devtools/overlayConfig';

type OwnerColorResolver = (ownerId: string) => number;

export class GameCanvasTerritoryBridge {
    private readonly runtime: TerritoryRuntimeCoordinator;
    private readonly presenter: PixiTerritoryPresenter;
    private readonly debugOverlay: PixiTerritoryDebugOverlay;
    private readonly vfxBridge: TerritoryVFXBridge;
    private previousTransition: TransitionSnapshot | null = null;
    private pendingVFXCommands: TerritoryVFXCommand[] = [];
    private latestDiagnostics: TerritoryRuntimeDiagnostics | null = null;

    constructor(
        container: PIXI.Container,
        resolveOwnerColor?: OwnerColorResolver,
    ) {
        this.runtime = new TerritoryRuntimeCoordinator();
        this.runtime.setSnapshotRecorder(transitionSnapshotRecorder);
        this.presenter = new PixiTerritoryPresenter(container, resolveOwnerColor);
        this.debugOverlay = new PixiTerritoryDebugOverlay(container);
        this.vfxBridge = new TerritoryVFXBridge();
        this.vfxBridge.registerHandler(new ConquestParticles());

        // Wire color resolver for geometry-based snapshot rendering
        if (resolveOwnerColor) {
            transitionSnapshotRecorder.setColorResolver(resolveOwnerColor);
        }
    }

    /** Expose the snapshot recorder for UI controls */
    get snapshotRecorder() {
        return transitionSnapshotRecorder;
    }

    /** Expose the overlay config for UI controls */
    get debugOverlayConfig() {
        return overlayConfig;
    }

    update(input: TerritoryFrameInput): void {
        const output = this.runtime.update(input);
        this.latestDiagnostics = output.diagnostics;
        this.presenter.present(output.presentation);

        // Live debug overlay — updates from topology + plan each frame
        this.debugOverlay.update(
            output.geometry.frontierTopology ?? null,
            output.activeFrontPlan,
        );

        this.pendingVFXCommands.push(
            ...this.vfxBridge.emitConquestEvents(
                output.ownership.conquestEvents,
                input.nowMs,
            ),
        );
        this.pendingVFXCommands.push(
            ...this.vfxBridge.emitTransitionLifecycle(
                this.previousTransition,
                output.transition,
                input.nowMs,
            ),
        );
        this.previousTransition = output.transition;
    }

    consumeVFXCommands(): TerritoryVFXCommand[] {
        const commands = this.pendingVFXCommands;
        this.pendingVFXCommands = [];
        return commands;
    }

    getBenchmarkDiagnostics(): Record<string, unknown> | null {
        const diagnostics = this.latestDiagnostics;
        if (!diagnostics) return null;
        const modeDiagnostics = diagnostics.modeDiagnostics;
        return {
            startedAtMs: diagnostics.startedAtMs,
            finishedAtMs: diagnostics.finishedAtMs,
            durationMs: diagnostics.finishedAtMs - diagnostics.startedAtMs,
            transitionFallbackReason:
                diagnostics.transitionFallbackReason ?? null,
            messages: diagnostics.messages,
            modeDiagnosticsKind: modeDiagnostics?.kind ?? null,
            modeDiagnosticsPlanId: modeDiagnostics?.planId ?? null,
            modeDiagnosticsBundleId: modeDiagnostics?.bundleId ?? null,
            workerStats: this.runtime.getWorkerStats(),
        };
    }

    reset(): void {
        this.runtime.reset();
        this.presenter.reset();
        this.previousTransition = null;
        this.pendingVFXCommands = [];
        this.latestDiagnostics = null;
    }
}
