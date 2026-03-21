import type * as PIXI from 'pixi.js';
import type { TerritoryFrameInput } from '../contracts/TerritoryFrameInput';
import type { TransitionSnapshot } from '../contracts/TransitionContracts';
import type { TerritoryVFXCommand } from '../vfx/VFXContracts';
import { TerritoryRuntimeCoordinator } from '../runtime/TerritoryRuntimeCoordinator';
import { PixiTerritoryPresenter } from '../adapters/pixi/PixiTerritoryPresenter';
import { TerritoryVFXBridge } from './TerritoryVFXBridge';
import { ConquestParticles } from '../vfx/handlers/ConquestParticles';

export class GameCanvasTerritoryBridge {
    private readonly runtime: TerritoryRuntimeCoordinator;
    private readonly presenter: PixiTerritoryPresenter;
    private readonly vfxBridge: TerritoryVFXBridge;
    private previousTransition: TransitionSnapshot | null = null;
    private pendingVFXCommands: TerritoryVFXCommand[] = [];

    constructor(container: PIXI.Container) {
        this.runtime = new TerritoryRuntimeCoordinator();
        this.presenter = new PixiTerritoryPresenter(container);
        this.vfxBridge = new TerritoryVFXBridge();
        this.vfxBridge.registerHandler(new ConquestParticles());
    }

    update(input: TerritoryFrameInput): void {
        const output = this.runtime.update(input);
        this.presenter.present(output.presentation);

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

    reset(): void {
        this.runtime.reset();
        this.presenter.reset();
        this.previousTransition = null;
        this.pendingVFXCommands = [];
    }
}
