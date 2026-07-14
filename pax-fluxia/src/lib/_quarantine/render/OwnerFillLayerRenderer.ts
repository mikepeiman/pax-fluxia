/**
 * territory/render/OwnerFillLayerRenderer.ts
 *
 * Class-encapsulated renderer for owned territory fills.
 * Draws FillMeshCache polygons using PIXI.Graphics.
 *
 * Rules:
 * - All render state is class-encapsulated (no module-level globals)
 * - Reads color from colorUtils by ownerId — does not compute ownership
 * - Does not invent or reinterpret geometry
 */

import * as PIXI from 'pixi.js';
import type { FillMeshCache } from './buildFillMeshCache';

export interface FillRenderConfig {
    alpha?: number;
    /** If true, distinct visual style for disconnected holdings (phase 2) */
    styleDisconnectedComponents?: boolean;
}

export class OwnerFillLayerRenderer {
    private graphics: PIXI.Graphics;

    constructor(
        private container: PIXI.Container,
        private getPlayerColor: (ownerId: string) => number,
    ) {
        this.graphics = new PIXI.Graphics();
        this.container.addChild(this.graphics);
    }

    draw(cache: FillMeshCache, config: FillRenderConfig = {}): void {
        const g = this.graphics;
        g.visible = true; // Re-show after GameCanvas hide-all-children loop
        g.clear();

        const alpha = config.alpha ?? 0.4;

        for (const polygon of cache.polygons) {
            const { outer, holes, ownerId } = polygon;
            if (outer.length < 6) continue; // need at least 3 points

            const color = this.getPlayerColor(ownerId);

            g.beginPath();
            // Draw outer loop
            g.moveTo(outer[0], outer[1]);
            for (let i = 2; i < outer.length; i += 2) {
                g.lineTo(outer[i], outer[i + 1]);
            }
            g.closePath();
            g.fill({ color, alpha });

            // Cut holes (enclaves)
            for (const hole of holes) {
                if (hole.length < 6) continue;
                g.beginPath();
                g.moveTo(hole[0], hole[1]);
                for (let i = 2; i < hole.length; i += 2) {
                    g.lineTo(hole[i], hole[i + 1]);
                }
                g.closePath();
                g.cut();
            }
        }
    }

    destroy(): void {
        if (this.graphics.parent) {
            this.graphics.parent.removeChild(this.graphics);
        }
        this.graphics.destroy();
    }
}
