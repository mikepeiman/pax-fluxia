import type * as PIXI from 'pixi.js';
import type { TerritoryPresentationFrame } from '../../layers/presentation/TerritoryStyleMode';
import { PixiFillPresenter } from './PixiFillPresenter';
import { PixiBorderPresenter } from './PixiBorderPresenter';

export class PixiTerritoryPresenter {
    private readonly fillPresenter: PixiFillPresenter;
    private readonly borderPresenter: PixiBorderPresenter;

    constructor(container: PIXI.Container) {
        this.fillPresenter = new PixiFillPresenter(container);
        this.borderPresenter = new PixiBorderPresenter(container);
    }

    present(frame: TerritoryPresentationFrame): void {
        this.fillPresenter.present(frame.fills);
        this.borderPresenter.present(frame.borders);
        void frame.debug;
    }

    reset(): void {
        this.fillPresenter.reset();
        this.borderPresenter.reset();
    }
}
