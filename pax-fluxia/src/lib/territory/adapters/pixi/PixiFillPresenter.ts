import type * as PIXI from 'pixi.js';
import type { FillDrawCommand } from '../../layers/presentation/TerritoryStyleMode';

export class PixiFillPresenter {
    constructor(private readonly container: PIXI.Container) {}

    present(commands: readonly FillDrawCommand[]): void {
        // Scaffolding stage: command-to-PIXI translation will be implemented next.
        void this.container;
        void commands;
    }

    reset(): void {
        // Scaffolding stage: presenter owns no mutable state yet.
    }
}
