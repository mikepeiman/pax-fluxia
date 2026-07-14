/**
 * territory/render/buildFillMeshCache.ts
 *
 * Derive fill polygons from resolved TerritoryRegion[].
 * Called from steady-state and transition passes with the SAME CompiledTerritoryState.
 *
 * Rules:
 * - May import PIXI (presentation layer)
 * - Must NOT compute ownership — reads ownerId from regions only
 * - Must NOT fabricate geometry — reads loops from regions only
 */

import type { TerritoryRegion } from '../compiler/types';

export interface FillPolygon {
    ownerId: string;
    componentId: string;
    outer: number[]; // [x1, y1, x2, y2, ...] CCW closed loop
    holes: number[][]; // Each hole: [x1, y1, ...] CW closed loop
}

export interface FillMeshCache {
    polygons: FillPolygon[];
}

/**
 * Build the fill mesh cache directly from resolved regions.
 * One polygon per region. Component ID is preserved for disconnect styling.
 */
export function buildFillMeshCache(regions: TerritoryRegion[]): FillMeshCache {
    const polygons: FillPolygon[] = regions.map((region) => {
        const [outer = [], ...holes] = region.loops;
        return {
            ownerId: region.ownerId,
            componentId: region.componentId,
            outer,
            holes,
        };
    });
    return { polygons };
}
