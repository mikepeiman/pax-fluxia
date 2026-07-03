/**
 * buildPowerCellsFromSites — P1a adapter from weighted-Voronoi sites to
 * PowerCell[] (the input of buildSharedEdgeGraph).
 *
 * Runs the SAME power-diagram call as the live 0319 pipeline
 * (Geometry_0319.ts Stage 1: d3-weighted-voronoi with x/y/weight accessors and
 * a rectangular clip ring), then converts each output polygon into a PowerCell.
 *
 * This is the ONLY powerCore module allowed to import d3 — the rest of the
 * core (sharedEdgeGraph, smoothing, loop walk) stays dependency-free and takes
 * PowerCell[] as plain data.
 *
 * Determinism: output is sorted by siteId, and the conversion itself is a
 * pure per-polygon map, so the same site set produces the same cells
 * regardless of input array order (up to d3's own floating-point output,
 * which downstream quantization absorbs).
 */

import { weightedVoronoi } from 'd3-weighted-voronoi';
import type { Point, PowerCell } from './powerCoreTypes';

/**
 * Minimal site shape the adapter needs. Structurally compatible with the live
 * pipeline's PowerSite ({x, y, weight, ownerId, starId, ...}) — extra fields
 * are carried through untouched on `originalObject` but ignored here.
 */
export interface PowerCoreSite {
    readonly x: number;
    readonly y: number;
    readonly weight: number;
    readonly ownerId: string;
    readonly starId: string;
}

/**
 * Convert weighted-Voronoi sites to PowerCell[].
 *
 * @param sites Sites with pre-solved weights (real stars and/or virtuals).
 * @param clip  Rectangular (or convex) clip ring, e.g. [[0,0],[w,0],[w,h],[0,h]].
 *
 * Ring convention: PowerCell.points is an OPEN ring (no explicit closing
 * duplicate) — buildSharedEdgeGraph treats the last point as implicitly
 * connected to the first (see powerCoreTypes.PowerCell). d3-weighted-voronoi
 * polygons are open already; a defensive strip handles a closing duplicate if
 * one ever appears.
 */
export function buildPowerCellsFromSites(
    sites: readonly PowerCoreSite[],
    clip: [number, number][],
): PowerCell[] {
    if (sites.length === 0) return [];

    // Same call shape as Geometry_0319.ts:363-368.
    const wv = weightedVoronoi<PowerCoreSite>()
        .x((d) => d.x)
        .y((d) => d.y)
        .weight((d) => d.weight)
        .clip(clip);
    const polygons = wv([...sites]);

    const indexBySite = new Map<PowerCoreSite, number>();
    sites.forEach((site, index) => indexBySite.set(site, index));

    const cells: PowerCell[] = [];
    for (const poly of polygons) {
        if (!poly || poly.length < 3) continue;
        const site = poly.site?.originalObject;
        if (!site) continue;

        const points: Point[] = poly.map((p) => [p[0], p[1]] as Point);

        // Strip an explicit closing duplicate (open-ring convention).
        if (points.length >= 2) {
            const first = points[0];
            const last = points[points.length - 1];
            if (first[0] === last[0] && first[1] === last[1]) points.pop();
        }
        if (points.length < 3) continue;

        cells.push({
            siteId: site.starId,
            ownerId: site.ownerId,
            points,
            sourceSiteIndex: indexBySite.get(site),
        });
    }

    // Deterministic output order.
    cells.sort((a, b) => (a.siteId < b.siteId ? -1 : a.siteId > b.siteId ? 1 : 0));
    return cells;
}
