import type * as PIXI from 'pixi.js';
import type { TerritoryPresentationFrame } from '../../layers/presentation/TerritoryStyleMode';
import { PixiFillPresenter } from './PixiFillPresenter';
import { PixiBorderPresenter } from './PixiBorderPresenter';

type OwnerColorResolver = (ownerId: string) => number;

export class PixiTerritoryPresenter {
    private readonly fillPresenter: PixiFillPresenter;
    private readonly borderPresenter: PixiBorderPresenter;

    constructor(
        container: PIXI.Container,
        resolveOwnerColor?: OwnerColorResolver,
    ) {
        this.fillPresenter = new PixiFillPresenter(container, resolveOwnerColor);
        this.borderPresenter = new PixiBorderPresenter(
            container,
            resolveOwnerColor,
        );
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
