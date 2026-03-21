import type * as PIXI from 'pixi.js';
import type { BorderDrawCommand } from '../../layers/presentation/TerritoryStyleMode';

export class PixiBorderPresenter {
    constructor(private readonly container: PIXI.Container) {}

    present(commands: readonly BorderDrawCommand[]): void {
        // Scaffolding stage: command-to-PIXI translation will be implemented next.
        void this.container;
        void commands;
    }

    reset(): void {
        // Scaffolding stage: presenter owns no mutable state yet.
    }
}
