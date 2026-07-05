/**
 * buildSurfaceFromCells — turn ANY power-cell set into the SAME smooth,
 * single-source surface the idle map uses: per-owner region rings (fills) +
 * inter-owner frontier polylines + owner↔world border polylines, all sharing
 * one Chaikin-smoothed source (buildSharedEdgeGraph → smoothSharedEdges →
 * walkRegionLoops / chainEdgesIntoPolylines).
 *
 * The point: a MORPH frame's cells (frozen + moving bubble) go through the exact
 * same assembly as buildPowerCoreAuthoritySnapshot's idle path — so a conquest
 * sweep renders as smooth, watertight, owner-MERGED regions and rounded
 * frontiers, frame by frame, with fills and borders reading the identical
 * smoothed boundary (no per-cell tearing, no fill/border mismatch).
 *
 * Pure: no PIXI, no config, no Svelte. Offline-testable.
 */

import {
    buildSharedEdgeGraph,
    reconstructLoopPolygon,
    walkRegionLoops,
} from './sharedEdgeGraph';
import { smoothSharedEdges } from './smoothSharedEdges';
import { chainEdgesIntoPolylines } from './buildPowerCoreAuthoritySnapshot';
import {
    WORLD_OWNER,
    type Point,
    type PowerCell,
    type WorldRect,
} from './powerCoreTypes';

export interface SurfaceRegion {
    readonly ownerId: string;
    readonly points: Point[];
}

export interface SurfaceFrontier {
    readonly ownerA: string;
    /** WORLD_OWNER for owner↔world borders. */
    readonly ownerB: string;
    readonly points: [number, number][];
    readonly closed: boolean;
}

export interface CellSurface {
    readonly regions: SurfaceRegion[];
    /** Inter-owner frontiers (ownerA < ownerB). */
    readonly frontiers: SurfaceFrontier[];
    /** Owner↔world borders (ownerB === WORLD_OWNER). */
    readonly worldBorders: SurfaceFrontier[];
}

function chainByGroup(
    entries: Map<string, { edgeId: string; points: readonly Point[] }[]>,
    split: (key: string) => [string, string],
): SurfaceFrontier[] {
    const out: SurfaceFrontier[] = [];
    for (const key of [...entries.keys()].sort()) {
        const [ownerA, ownerB] = split(key);
        for (const chain of chainEdgesIntoPolylines(entries.get(key)!)) {
            out.push({ ownerA, ownerB, points: chain.points, closed: chain.closed });
        }
    }
    return out;
}

export function buildSurfaceFromCells(
    cells: PowerCell[],
    world: WorldRect,
    passes: number,
): CellSurface {
    const graph = buildSharedEdgeGraph(cells, world);
    smoothSharedEdges(graph, passes);
    const loops = walkRegionLoops(graph, cells);

    const regions: SurfaceRegion[] = [];
    for (const loop of loops) {
        if (loop.ownerId === WORLD_OWNER) continue;
        regions.push({ ownerId: loop.ownerId, points: reconstructLoopPolygon(loop, graph) });
    }

    const byPair = new Map<string, { edgeId: string; points: readonly Point[] }[]>();
    for (const e of graph.sharedEdges) {
        const key = `${e.ownerA}|${e.ownerB}`;
        const bucket = byPair.get(key);
        const entry = { edgeId: e.edgeId, points: e.smoothedPts };
        if (bucket) bucket.push(entry);
        else byPair.set(key, [entry]);
    }
    const frontiers = chainByGroup(
        byPair,
        (key) => key.split('|') as [string, string],
    );

    const byOwner = new Map<string, { edgeId: string; points: readonly Point[] }[]>();
    for (const e of graph.worldEdges) {
        const bucket = byOwner.get(e.owner);
        const entry = { edgeId: e.edgeId, points: e.smoothedPts };
        if (bucket) bucket.push(entry);
        else byOwner.set(e.owner, [entry]);
    }
    const worldBorders = chainByGroup(byOwner, (owner) => [owner, WORLD_OWNER]);

    return { regions, frontiers, worldBorders };
}
