/**
 * PowerVectorFamily — K3a: the first VISIBLE consumer of the kinetic transition
 * engine. A deliberately dumb vector skin: fill every power cell by owner color
 * + stroke. When a conquest morph is active the cells come straight from the
 * kinetic runtime (frozen + moving bubble), so the frontier SWEEPS; when idle
 * they are the settled endpoint cells; when the runtime is inactive (source ≠
 * power_core) it falls back to the resolved snapshot's regions.
 *
 * v1 scope (per plan §3a/§3c): ownership flips at the ramp's own timing (a cell
 * changes color when the diagram says it changed owner). No crossfade/wipe yet
 * — that is v2, added only after the SWEEP itself reads right. Cell edges are
 * visible (Voronoi-mesh look) — accepted for v1; owner-only borders are polish.
 *
 * Coordinate space: kinetic cells are MAP/world coords; the caller positions
 * this family's container at (frame.minX, frame.minY), so cells are drawn at
 * (x - world.minX, y - world.minY). The resolved-snapshot fallback is ALREADY
 * localized by the caller (no offset).
 */

import * as PIXI from 'pixi.js';
import type { ColorUtils } from '$lib/renderers/RenderContext';
import { getKineticRenderCells } from '../../geometry/powerCore/kineticRuntimeBridge';
import type {
    RenderFamily,
    RenderFamilyInput,
    RenderFamilyOutput,
} from '../RenderFamilyTypes';

const FILL_ALPHA = 0.55;
const STROKE_ALPHA = 0.9;
const STROKE_WIDTH = 1;

export class PowerVectorFamily implements RenderFamily {
    readonly id = 'power_vector';
    readonly label = 'Power Vector';
    readonly tunableKeys: readonly string[] = [];

    private readonly root = new PIXI.Container();
    private readonly graphics = new PIXI.Graphics();
    private readonly colorUtils: ColorUtils;

    constructor(colorUtils: ColorUtils) {
        this.colorUtils = colorUtils;
        this.root.addChild(this.graphics);
    }

    get displayRoot(): PIXI.Container {
        return this.root;
    }

    update(input: RenderFamilyInput): RenderFamilyOutput {
        const g = this.graphics;
        g.clear();

        // Live kinetic cells (map coords → offset into presentation space).
        const cells = getKineticRenderCells();
        if (cells && cells.length > 0) {
            const dx = -(input.world.minX ?? 0);
            const dy = -(input.world.minY ?? 0);
            for (const cell of cells) {
                if (cell.points.length < 3) continue;
                const color = this.colorUtils.getPlayerColor(cell.ownerId);
                const flat: number[] = [];
                for (const [px, py] of cell.points) {
                    flat.push(px + dx, py + dy);
                }
                g.poly(flat)
                    .fill({ color, alpha: FILL_ALPHA })
                    .stroke({ width: STROKE_WIDTH, color, alpha: STROKE_ALPHA });
            }
            return { container: this.root };
        }

        // Fallback: resolved snapshot regions (already localized by the caller).
        const geometry = input.geometry;
        if (geometry) {
            for (const region of geometry.territoryRegions) {
                if (region.points.length < 3) continue;
                const color = this.colorUtils.getPlayerColor(region.ownerId);
                const flat: number[] = [];
                for (const [px, py] of region.points) {
                    flat.push(px, py);
                }
                g.poly(flat)
                    .fill({ color, alpha: FILL_ALPHA })
                    .stroke({
                        width: STROKE_WIDTH + 0.5,
                        color,
                        alpha: STROKE_ALPHA,
                    });
            }
        }
        return { container: this.root };
    }

    dispose(): void {
        this.graphics.destroy();
        this.root.destroy({ children: true });
    }
}

export function createPowerVectorFamily(
    colorUtils: ColorUtils,
): PowerVectorFamily {
    return new PowerVectorFamily(colorUtils);
}
