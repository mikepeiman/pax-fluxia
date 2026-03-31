import * as PIXI from 'pixi.js';
import type { BorderDrawCommand } from '../../layers/presentation/TerritoryStyleMode';

type OwnerColorResolver = (ownerId: string) => number;

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function parseOwnerId(ownerPairKey: string): string {
    const pipeIndex = ownerPairKey.indexOf('|');
    if (pipeIndex > 0) return ownerPairKey.slice(0, pipeIndex);
    const colonIndex = ownerPairKey.indexOf(':');
    if (colonIndex > 0) return ownerPairKey.slice(0, colonIndex);
    return ownerPairKey;
}

function fallbackColor(ownerPairKey: string): number {
    const ownerId = parseOwnerId(ownerPairKey);
    let hash = 2166136261;
    for (let i = 0; i < ownerId.length; i += 1) {
        hash ^= ownerId.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    const r = 120 + ((hash >>> 16) & 0x5f);
    const g = 120 + ((hash >>> 8) & 0x5f);
    const b = 120 + (hash & 0x5f);
    return (r << 16) | (g << 8) | b;
}

export class PixiBorderPresenter {
    private readonly graphics: PIXI.Graphics;

    constructor(
        private readonly container: PIXI.Container,
        private readonly resolveOwnerColor?: OwnerColorResolver,
    ) {
        this.graphics = new PIXI.Graphics();
        this.container.addChild(this.graphics);
    }

    present(commands: readonly BorderDrawCommand[]): void {
        this.graphics.visible = true;
        this.graphics.clear();

        for (const command of commands) {
            if (command.points.length < 2) continue;
            const flatPoints = command.points.flat();
            if (flatPoints.length < 4) continue;

            const ownerId = parseOwnerId(command.ownerPairKey);
            const color =
                command.color ??
                this.resolveOwnerColor?.(ownerId) ??
                fallbackColor(command.ownerPairKey);
            const alpha = clamp01(command.alpha);
            const width = Math.max(0, command.width);

            this.graphics.beginPath();
            this.graphics.poly(flatPoints, false);
            this.graphics.stroke({ color, alpha, width });
        }
    }

    reset(): void {
        this.graphics.clear();
        this.graphics.visible = false;
    }
}
