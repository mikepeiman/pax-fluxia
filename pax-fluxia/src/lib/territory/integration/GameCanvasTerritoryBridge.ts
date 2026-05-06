import type * as PIXI from 'pixi.js';
import type { TerritoryFrameInput } from '../contracts/TerritoryFrameInput';
import type { TransitionSnapshot } from '../contracts/TransitionContracts';
import type { TerritoryVFXCommand } from '../vfx/VFXContracts';
import { TerritoryRuntimeCoordinator } from '../runtime/TerritoryRuntimeCoordinator';
import type { TerritoryRuntimeOutput } from '../runtime/TerritoryRuntimeCoordinator';
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
    private lastOutput: TerritoryRuntimeOutput | null = null;

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

    update(input: TerritoryFrameInput): TerritoryRuntimeOutput {
        const output = this.runtime.update(input);
        this.lastOutput = output;
        this.presenter.present(output.presentation);

        // Live debug overlay — updates from topology + plan each frame
        this.debugOverlay.update(
            output.transitionPrevTopology ?? null,
            output.geometry.frontierTopology ?? null,
            output.activeFrontPlan,
            output.activeFrontDebug,
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
        return output;
    }

    getLatestRuntimeOutput(): TerritoryRuntimeOutput | null {
        return this.lastOutput;
    }

    consumeVFXCommands(): TerritoryVFXCommand[] {
        const commands = this.pendingVFXCommands;
        this.pendingVFXCommands = [];
        return commands;
    }

    reset(): void {
        this.runtime.reset();
        this.presenter.reset();
        this.previousTransition = null;
        this.pendingVFXCommands = [];
        this.lastOutput = null;
    }
}
