/**
 * territory/render/BorderLayerRenderer.ts
 *
 * Class-encapsulated renderer for territory border strokes.
 * Draws BorderMeshCache strokes using PIXI.Graphics polylines.
 *
 * Rules:
 * - All render state is class-encapsulated (no module-level globals)
 * - Width, softness, alpha are pure style parameters (uniform-driven)
 * - Color blends the two adjacent owners — does not reinterpret ownership
 */

import * as PIXI from 'pixi.js';
import type { BorderMeshCache, BorderRenderConfig } from './buildBorderMeshCache';

export class BorderLayerRenderer {
    private graphics: PIXI.Graphics;

    constructor(
        private container: PIXI.Container,
        private getPlayerColor: (ownerIdx: number) => number,
        private playerIds: string[],
    ) {
        this.graphics = new PIXI.Graphics();
        this.container.addChild(this.graphics);
    }

    draw(cache: BorderMeshCache, config: BorderRenderConfig = { width: 4 }): void {
        const g = this.graphics;
        g.clear();

        const width = config.width ?? 4;
        const alpha = config.alpha ?? 1.0;

        for (const stroke of cache.strokes) {
            const { points, ownerA, ownerB } = stroke;
            if (points.length < 4) continue;

            // Blend color A and B at 50%/50% for the shared border
            const colorA = this.getPlayerColor(ownerA);
            const colorB = this.getPlayerColor(ownerB);
            const blended = blendColors(colorA, colorB, 0.5);

            g.setStrokeStyle({ width, color: blended, alpha, cap: 'round', join: 'round' });
            g.beginPath();
            g.moveTo(points[0], points[1]);
            for (let i = 2; i < points.length - 1; i += 2) {
                g.lineTo(points[i], points[i + 1]);
            }
            g.stroke();
        }
    }

    /** Update player ID list (e.g. after a player is eliminated). */
    updatePlayerIds(playerIds: string[]): void {
        this.playerIds = playerIds;
    }

    destroy(): void {
        if (this.graphics.parent) {
            this.graphics.parent.removeChild(this.graphics);
        }
        this.graphics.destroy();
    }
}

function blendColors(colorA: number, colorB: number, t: number): number {
    const rA = (colorA >> 16) & 0xff;
    const gA = (colorA >> 8) & 0xff;
    const bA = colorA & 0xff;
    const rB = (colorB >> 16) & 0xff;
    const gB = (colorB >> 8) & 0xff;
    const bB = colorB & 0xff;
    const r = Math.round(rA + (rB - rA) * t);
    const g = Math.round(gA + (gB - gA) * t);
    const b = Math.round(bA + (bB - bA) * t);
    return (r << 16) | (g << 8) | b;
}
