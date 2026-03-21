import type * as PIXI from 'pixi.js';
import type { TerritoryFrameInput } from '../contracts/TerritoryFrameInput';
import { TerritoryRuntimeCoordinator } from '../runtime/TerritoryRuntimeCoordinator';
import { PixiTerritoryPresenter } from '../adapters/pixi/PixiTerritoryPresenter';

export class GameCanvasTerritoryBridge {
    private readonly runtime: TerritoryRuntimeCoordinator;
    private readonly presenter: PixiTerritoryPresenter;

    constructor(container: PIXI.Container) {
        this.runtime = new TerritoryRuntimeCoordinator();
        this.presenter = new PixiTerritoryPresenter(container);
    }

    update(input: TerritoryFrameInput): void {
        const output = this.runtime.update(input);
        this.presenter.present(output.presentation);
    }

    reset(): void {
        this.runtime.reset();
        this.presenter.reset();
    }
}
