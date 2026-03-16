/**
 * territory/render/buildBorderMeshCache.ts
 *
 * Derive border stroke geometry from canonical FrontierGraph.
 * Called from steady-state and transition passes with the SAME FrontierGraph
 * that drove buildFillMeshCache to guarantee fill/border alignment.
 *
 * Rules:
 * - May import PIXI (presentation layer)
 * - Must NOT compute ownership — reads ownerA/B from frontier edges only
 * - Must NOT fabricate geometry — reads node world-coordinates from frontier only
 */

import type { FrontierGraph, FittedFrontier } from '../compiler/types';

export interface BorderStroke {
    ownerA: number; // player index
    ownerB: number;
    pairId: string;
    points: number[]; // [x1, y1, x2, y2, ...] world coords, polyline
}

export interface BorderRenderConfig {
    width: number; // border half-width in pixels
    softness?: number; // 0 = hard, 1 = fully soft AA
    alpha?: number;
}

export interface BorderMeshCache {
    strokes: BorderStroke[];
}

/**
 * Build the border mesh cache from canonical fitted frontiers.
 * Returns one stroke per owner-pair. Width/softness are style params.
 * Ownership color blending is deferred to the layer renderer.
 */
export function buildBorderMeshCache(
    fittedFrontiers: FittedFrontier[],
    config: BorderRenderConfig = { width: 4 },
): BorderMeshCache {
    const strokes: BorderStroke[] = fittedFrontiers.map((ff) => {
        // Flatten all polylines in this fitted frontier into one stroke
        const points: number[] = [];
        for (const polyline of ff.polylines) {
            points.push(...polyline);
        }
        return {
            ownerA: ff.ownerA,
            ownerB: ff.ownerB,
            pairId: ff.pairId,
            points,
        };
    });

    return { strokes };
}

/**
 * Fallback: build border mesh cache directly from raw FrontierGraph
 * when fittedFrontiers is unavailable. Less optimized but correct.
 */
export function buildBorderMeshCacheFromGraph(
    frontier: FrontierGraph,
    config: BorderRenderConfig = { width: 4 },
): BorderMeshCache {
    const pairPoints = new Map<string, number[]>();
    const pairOwners = new Map<string, { ownerA: number; ownerB: number }>();

    for (const edge of frontier.edges.values()) {
        const nodeA = frontier.nodes.get(edge.a);
        const nodeB = frontier.nodes.get(edge.b);
        if (!nodeA || !nodeB) continue;

        const pts = pairPoints.get(edge.pairId) ?? [];
        pts.push(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
        pairPoints.set(edge.pairId, pts);
        pairOwners.set(edge.pairId, { ownerA: edge.ownerA, ownerB: edge.ownerB });
    }

    const strokes: BorderStroke[] = [];
    for (const [pairId, points] of pairPoints) {
        const owners = pairOwners.get(pairId)!;
        strokes.push({ ownerA: owners.ownerA, ownerB: owners.ownerB, pairId, points });
    }

    return { strokes };
}
