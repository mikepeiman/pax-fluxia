import * as PIXI from 'pixi.js';
import type { FillDrawCommand } from '../../layers/presentation/TerritoryStyleMode';

type OwnerColorResolver = (ownerId: string) => number;

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function fallbackColor(ownerId: string): number {
    let hash = 2166136261;
    for (let i = 0; i < ownerId.length; i += 1) {
        hash ^= ownerId.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    const r = 80 + ((hash >>> 16) & 0x7f);
    const g = 80 + ((hash >>> 8) & 0x7f);
    const b = 80 + (hash & 0x7f);
    return (r << 16) | (g << 8) | b;
}

export class PixiFillPresenter {
    private readonly graphics: PIXI.Graphics;

    constructor(
        private readonly container: PIXI.Container,
        private readonly resolveOwnerColor?: OwnerColorResolver,
    ) {
        this.graphics = new PIXI.Graphics();
        this.container.addChild(this.graphics);
    }

    present(commands: readonly FillDrawCommand[]): void {
        this.graphics.visible = true;
        this.graphics.clear();

        for (const command of commands) {
            if (command.points.length < 3) continue;
            const flatPoints = command.points.flat();
            if (flatPoints.length < 6) continue;

            const color =
                command.color ??
                this.resolveOwnerColor?.(command.ownerId) ??
                fallbackColor(command.ownerId);
            const alpha = clamp01(command.alpha);

            this.graphics.poly(flatPoints);
            this.graphics.fill({ color, alpha });
        }
    }

    reset(): void {
        this.graphics.clear();
        this.graphics.visible = false;
    }
}
