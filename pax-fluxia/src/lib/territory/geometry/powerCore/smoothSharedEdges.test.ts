/**
 * smoothSharedEdges.test.ts — junction-pinned Chaikin smoothing invariants.
 *
 * The load-bearing property: edge ENDPOINTS never move, and junctions are edge
 * endpoints in this graph, so smoothing can never open a gap at a junction.
 */

import { describe, expect, it } from 'vitest';
import { buildSharedEdgeGraph, reconstructLoopPolygon, walkRegionLoops } from './sharedEdgeGraph';
import { chaikinOpenPinned, smoothSharedEdges } from './smoothSharedEdges';
import type { Point, PowerCell, WorldRect } from './powerCoreTypes';

const WORLD: WorldRect = { width: 100, height: 100 };

/** The case-4 three-owner 3-way junction cells (junction at (50,50)). */
function junctionCells(): PowerCell[] {
    return [
        { siteId: 'ul', ownerId: 'A', points: [[0, 0], [50, 0], [50, 50], [0, 50]] },
        { siteId: 'ur', ownerId: 'B', points: [[50, 0], [100, 0], [100, 50], [50, 50]] },
        {
            siteId: 'bot',
            ownerId: 'C',
            points: [[0, 50], [50, 50], [100, 50], [100, 100], [0, 100]],
        },
    ];
}

function samePoint(a: Point, b: Point): boolean {
    return a[0] === b[0] && a[1] === b[1];
}

/** Insert the midpoint into a 2-point edge so Chaikin has an interior corner to cut. */
function subdivideOnce(pts: Point[]): Point[] {
    const out: Point[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        out.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b);
    }
    return out;
}

describe('chaikinOpenPinned — pure helper invariants', () => {
    const bent: Point[] = [
        [0, 0],
        [10, 8], // off the straight line — a real corner to cut
        [20, 0],
    ];

    it('passes=0 returns an identical copy (and a NEW array)', () => {
        const out = chaikinOpenPinned(bent, 0);
        expect(out).toEqual(bent);
        expect(out).not.toBe(bent);
    });

    it('endpoints are EXACTLY invariant across passes; interior points move', () => {
        for (const passes of [1, 2, 3, 5]) {
            const out = chaikinOpenPinned(bent, passes);
            expect(samePoint(out[0], bent[0])).toBe(true);
            expect(samePoint(out[out.length - 1], bent[bent.length - 1])).toBe(true);
            // Corner cutting grew the polyline and removed the sharp corner point.
            expect(out.length).toBeGreaterThan(bent.length);
            expect(out.some((p) => samePoint(p, bent[1]))).toBe(false);
        }
    });

    it('is deterministic — same input, same passes, identical output', () => {
        const a = chaikinOpenPinned(bent, 3);
        const b = chaikinOpenPinned(bent, 3);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    it('a 2-point segment is returned unchanged (nothing to cut)', () => {
        const seg: Point[] = [[0, 0], [10, 10]];
        expect(chaikinOpenPinned(seg, 4)).toEqual(seg);
    });
});

describe('smoothSharedEdges — graph-level invariants', () => {
    it('passes=0 leaves smoothedPts identical to pts on every shared edge', () => {
        const cells = junctionCells();
        const graph = buildSharedEdgeGraph(cells, WORLD);
        // Dirty smoothedPts first so the reset is observable.
        for (const e of graph.sharedEdges) e.smoothedPts = [e.pts[0], [1, 2], e.pts[e.pts.length - 1]];
        smoothSharedEdges(graph, 0);
        for (const e of graph.sharedEdges) {
            expect(e.smoothedPts).toEqual(e.pts);
            expect(e.smoothedPts).not.toBe(e.pts); // still an independent copy
        }
    });

    it('world edges are never touched (world border stays exact)', () => {
        const cells = junctionCells();
        const graph = buildSharedEdgeGraph(cells, WORLD);
        const before = JSON.stringify(graph.worldEdges.map((e) => e.smoothedPts));
        smoothSharedEdges(graph, 3);
        expect(JSON.stringify(graph.worldEdges.map((e) => e.smoothedPts))).toBe(before);
    });

    it('3-way junction: all edges meeting at (50,50) still share the EXACT junction coordinate after smoothing', () => {
        const cells = junctionCells();
        const graph = buildSharedEdgeGraph(cells, WORLD);

        // Subdivide + bend each shared edge so smoothing genuinely moves interior
        // points — a straight 2-point edge would make this test vacuous.
        for (const e of graph.sharedEdges) {
            const sub = subdivideOnce(e.pts);
            // Nudge the inserted midpoint off-axis (a corner for Chaikin to cut).
            sub[1] = [sub[1][0] + 3, sub[1][1] + 2];
            e.pts = sub;
        }

        smoothSharedEdges(graph, 2);

        const junction: Point = [50, 50];
        const atJunction = graph.sharedEdges.filter(
            (e) =>
                samePoint(e.pts[0], junction) ||
                samePoint(e.pts[e.pts.length - 1], junction),
        );
        expect(atJunction.length).toBe(3);

        for (const e of atJunction) {
            const first = e.smoothedPts[0];
            const last = e.smoothedPts[e.smoothedPts.length - 1];
            // The junction coordinate survives smoothing EXACTLY on every spoke.
            expect(samePoint(first, junction) || samePoint(last, junction)).toBe(true);
            // Both endpoints (junction or not) are pinned to the raw pts endpoints.
            expect(samePoint(first, e.pts[0])).toBe(true);
            expect(samePoint(last, e.pts[e.pts.length - 1])).toBe(true);
            // And smoothing actually happened (interior points were produced).
            expect(e.smoothedPts.length).toBeGreaterThan(e.pts.length);
        }
    });

    it('smoothed loops still reconstruct as closed rings (no gap opens anywhere)', () => {
        const cells = junctionCells();
        const graph = buildSharedEdgeGraph(cells, WORLD);
        const loops = walkRegionLoops(graph, cells);

        for (const e of graph.sharedEdges) {
            const sub = subdivideOnce(e.pts);
            sub[1] = [sub[1][0] + 3, sub[1][1] + 2];
            e.pts = sub;
        }
        smoothSharedEdges(graph, 2);

        for (const loop of loops) {
            const ring = reconstructLoopPolygon(loop, graph);
            expect(ring.length).toBeGreaterThanOrEqual(3);
            // No consecutive duplicate vertices (a duplicate would mean an edge
            // seam failed to share its endpoint exactly).
            for (let i = 0; i < ring.length; i++) {
                const a = ring[i];
                const b = ring[(i + 1) % ring.length];
                expect(samePoint(a, b)).toBe(false);
            }
        }
    });

    it('is deterministic — two identical graphs smooth to byte-identical smoothedPts', () => {
        const build = () => {
            const graph = buildSharedEdgeGraph(junctionCells(), WORLD);
            for (const e of graph.sharedEdges) {
                const sub = subdivideOnce(e.pts);
                sub[1] = [sub[1][0] + 3, sub[1][1] + 2];
                e.pts = sub;
            }
            smoothSharedEdges(graph, 3);
            return graph;
        };
        const g1 = build();
        const g2 = build();
        expect(JSON.stringify(g1.sharedEdges)).toBe(JSON.stringify(g2.sharedEdges));
    });
});
