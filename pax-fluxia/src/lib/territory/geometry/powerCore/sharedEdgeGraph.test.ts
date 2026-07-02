/**
 * sharedEdgeGraph.test.ts — the SPEC for the power-Voronoi core.
 *
 * All cells are hand-built with exact coordinates on a 100x100 world. Areas are
 * checked with the shoelace formula and a relative tolerance. The 3-way junction
 * (case 4) is the make-or-break: it is exactly the historical greedy-walk failure.
 */

import { describe, expect, it } from 'vitest';
import {
    buildSharedEdgeGraph,
    reconstructLoopPolygon,
    walkRegionLoops,
} from './sharedEdgeGraph';
import type { Point, PowerCell, WorldRect } from './powerCoreTypes';

const WORLD: WorldRect = { width: 100, height: 100 };
const WORLD_AREA = 100 * 100;

// --- test helpers -----------------------------------------------------------

/** Shoelace absolute area. */
function area(ring: Point[]): number {
    let s = 0;
    const n = ring.length;
    for (let i = 0; i < n; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % n];
        s += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(s / 2);
}

function approx(actual: number, expected: number, relTol = 1e-6): boolean {
    const denom = Math.max(1, Math.abs(expected));
    return Math.abs(actual - expected) / denom <= relTol;
}

/** Sum of loop polygon areas (reconstructed from edges). */
function totalLoopArea(
    loops: ReturnType<typeof walkRegionLoops>,
    graph: ReturnType<typeof buildSharedEdgeGraph>,
): number {
    let sum = 0;
    for (const loop of loops) {
        sum += area(reconstructLoopPolygon(loop, graph));
    }
    return sum;
}

/** Assert a ring is closed/valid: >= 3 distinct vertices, non-zero area, no immediate dupes. */
function assertClosedRing(ring: Point[]): void {
    expect(ring.length).toBeGreaterThanOrEqual(3);
    expect(area(ring)).toBeGreaterThan(1e-9);
    for (let i = 0; i < ring.length; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        expect(a[0] === b[0] && a[1] === b[1]).toBe(false);
    }
}

/** Simple self-intersection check on a closed ring (O(n^2), fine for tiny rings). */
function hasSelfIntersection(ring: Point[]): boolean {
    const n = ring.length;
    const seg = (i: number): [Point, Point] => [ring[i], ring[(i + 1) % n]];
    const cross = (o: Point, a: Point, b: Point) =>
        (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const onSeg = (p: Point, a: Point, b: Point) =>
        Math.min(a[0], b[0]) - 1e-9 <= p[0] &&
        p[0] <= Math.max(a[0], b[0]) + 1e-9 &&
        Math.min(a[1], b[1]) - 1e-9 <= p[1] &&
        p[1] <= Math.max(a[1], b[1]) + 1e-9;
    const properIntersect = (a: Point, b: Point, c: Point, d: Point) => {
        const d1 = cross(c, d, a);
        const d2 = cross(c, d, b);
        const d3 = cross(a, b, c);
        const d4 = cross(a, b, d);
        if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)))
            return true;
        if (Math.abs(d1) < 1e-9 && onSeg(a, c, d)) return true;
        if (Math.abs(d2) < 1e-9 && onSeg(b, c, d)) return true;
        if (Math.abs(d3) < 1e-9 && onSeg(c, a, b)) return true;
        if (Math.abs(d4) < 1e-9 && onSeg(d, a, b)) return true;
        return false;
    };
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            // skip adjacent (share a vertex) and the wrap-adjacent pair
            if (j === i || j === (i + 1) % n || (j + 1) % n === i) continue;
            const [a, b] = seg(i);
            const [c, d] = seg(j);
            if (properIntersect(a, b, c, d)) return true;
        }
    }
    return false;
}

// --- case 1: single owner, single square cell -------------------------------

describe('case 1 — single owner, single square cell covering the world', () => {
    const cells: PowerCell[] = [
        {
            siteId: 's1',
            ownerId: 'A',
            points: [
                [0, 0],
                [100, 0],
                [100, 100],
                [0, 100],
            ],
        },
    ];

    it('produces exactly one closed RegionLoop with world area and 4 world edges', () => {
        const graph = buildSharedEdgeGraph(cells, WORLD);
        const loops = walkRegionLoops(graph, cells);

        expect(graph.sharedEdges.length).toBe(0);
        expect(graph.worldEdges.length).toBe(4);
        expect(loops.length).toBe(1);

        const ring = reconstructLoopPolygon(loops[0], graph);
        assertClosedRing(ring);
        expect(approx(area(ring), WORLD_AREA)).toBe(true);
        expect(loops[0].ownerId).toBe('A');
        expect(loops[0].orderedEdgeRefs.every((r) => r.kind === 'world')).toBe(true);
        expect(loops[0].orderedEdgeRefs.length).toBe(4);
    });
});

// --- case 2: two owners split left | right ----------------------------------

describe('case 2 — two owners split left|right with a shared vertical seam', () => {
    const cells: PowerCell[] = [
        {
            siteId: 'L',
            ownerId: 'A',
            points: [
                [0, 0],
                [50, 0],
                [50, 100],
                [0, 100],
            ],
        },
        {
            siteId: 'R',
            ownerId: 'B',
            points: [
                [50, 0],
                [100, 0],
                [100, 100],
                [50, 100],
            ],
        },
    ];

    it('seam is exactly ONE SharedEdge object referenced (same edgeId) by BOTH loops', () => {
        const graph = buildSharedEdgeGraph(cells, WORLD);
        const loops = walkRegionLoops(graph, cells);

        expect(loops.length).toBe(2);
        expect(graph.sharedEdges.length).toBe(1);

        const seam = graph.sharedEdges[0];
        expect(seam.ownerA).toBe('A'); // lexicographic
        expect(seam.ownerB).toBe('B');

        const refsSeamCount = loops.map(
            (l) => l.orderedEdgeRefs.filter((r) => r.edgeId === seam.edgeId).length,
        );
        // BOTH loops reference the seam edgeId exactly once — the single-source invariant.
        expect(refsSeamCount.sort()).toEqual([1, 1]);

        // And one references it forward, the other backward (opposite traversal).
        const dirs = loops.map(
            (l) => l.orderedEdgeRefs.find((r) => r.edgeId === seam.edgeId)!.forward,
        );
        expect(dirs[0]).not.toBe(dirs[1]);
    });

    it('both loops closed; union area == world; no gap at the seam', () => {
        const graph = buildSharedEdgeGraph(cells, WORLD);
        const loops = walkRegionLoops(graph, cells);
        for (const loop of loops) assertClosedRing(reconstructLoopPolygon(loop, graph));
        expect(approx(totalLoopArea(loops, graph), WORLD_AREA)).toBe(true);

        // Each half is 50x100 = 5000.
        const areas = loops
            .map((l) => area(reconstructLoopPolygon(l, graph)))
            .sort((a, b) => a - b);
        expect(approx(areas[0], 5000)).toBe(true);
        expect(approx(areas[1], 5000)).toBe(true);
    });
});

// --- case 3: 2x2 four-owner grid, central 4-way junction --------------------

describe('case 3 — 2x2 four-owner grid meeting at a central 4-way junction', () => {
    const cells: PowerCell[] = [
        { siteId: 'q1', ownerId: 'A', points: [[0, 0], [50, 0], [50, 50], [0, 50]] },
        { siteId: 'q2', ownerId: 'B', points: [[50, 0], [100, 0], [100, 50], [50, 50]] },
        { siteId: 'q3', ownerId: 'C', points: [[0, 50], [50, 50], [50, 100], [0, 100]] },
        { siteId: 'q4', ownerId: 'D', points: [[50, 50], [100, 50], [100, 100], [50, 100]] },
    ];

    it('produces exactly 4 closed loops, union == world, center vertex shared by 4 edges', () => {
        const graph = buildSharedEdgeGraph(cells, WORLD);
        const loops = walkRegionLoops(graph, cells);

        expect(loops.length).toBe(4);
        for (const loop of loops) {
            const ring = reconstructLoopPolygon(loop, graph);
            assertClosedRing(ring);
            expect(approx(area(ring), 2500)).toBe(true); // each 50x50
        }
        expect(approx(totalLoopArea(loops, graph), WORLD_AREA)).toBe(true);

        // Four SharedEdges all touch the center (50,50): the 4-way junction.
        const centerKey = '50000:50000';
        const key = (p: Point) => `${Math.round(p[0] * 1000)}:${Math.round(p[1] * 1000)}`;
        const touchingCenter = graph.sharedEdges.filter(
            (e) => key(e.pts[0]) === centerKey || key(e.pts[1]) === centerKey,
        );
        expect(touchingCenter.length).toBe(4);

        // Each owner appears exactly once.
        expect(loops.map((l) => l.ownerId).sort()).toEqual(['A', 'B', 'C', 'D']);
    });
});

// --- case 4: THREE-owner 3-way junction (the make-or-break case) -------------

describe('case 4 — three-owner 3-way junction (the classic failure)', () => {
    // UL owner A: [0,50]x[0,50]; UR owner B: [50,100]x[0,50];
    // BOTTOM owner C: full width [0,100] x [50,100], WITH a vertex at (50,50)
    // so the junction key exists for all three cells. They meet at (50,50).
    const cells: PowerCell[] = [
        { siteId: 'ul', ownerId: 'A', points: [[0, 0], [50, 0], [50, 50], [0, 50]] },
        { siteId: 'ur', ownerId: 'B', points: [[50, 0], [100, 0], [100, 50], [50, 50]] },
        {
            siteId: 'bot',
            ownerId: 'C',
            points: [[0, 50], [50, 50], [100, 50], [100, 100], [0, 100]],
        },
    ];

    it('produces exactly 3 loops, all closed, union == world, NO self-crossing, NO omission', () => {
        const graph = buildSharedEdgeGraph(cells, WORLD);
        const loops = walkRegionLoops(graph, cells);

        // Exactly three regions — none omitted (the historical bug dropped one).
        expect(loops.length).toBe(3);
        expect(loops.map((l) => l.ownerId).sort()).toEqual(['A', 'B', 'C']);

        const expectedAreas: Record<string, number> = {
            A: 2500, // 50x50
            B: 2500, // 50x50
            C: 5000, // 100x50
        };
        for (const loop of loops) {
            const ring = reconstructLoopPolygon(loop, graph);
            assertClosedRing(ring);
            expect(hasSelfIntersection(ring)).toBe(false); // NO self-crossing loop
            expect(approx(area(ring), expectedAreas[loop.ownerId])).toBe(true);
        }

        // Union == world (zero gap, zero overlap accounted by exact areas summing).
        expect(approx(totalLoopArea(loops, graph), WORLD_AREA)).toBe(true);

        // Three SharedEdges meet at the junction (50,50).
        const key = (p: Point) => `${Math.round(p[0] * 1000)}:${Math.round(p[1] * 1000)}`;
        const junctionKey = '50000:50000';
        const atJunction = graph.sharedEdges.filter(
            (e) => key(e.pts[0]) === junctionKey || key(e.pts[1]) === junctionKey,
        );
        expect(atJunction.length).toBe(3);
    });
});

// --- case 4b: half-edge owner derivation === old point-in-polygon answer -----

describe('case 4b — structural owner derivation matches point-in-polygon (3-way junction)', () => {
    // Same cells as case 4 — the make-or-break junction.
    const cells: PowerCell[] = [
        { siteId: 'ul', ownerId: 'A', points: [[0, 0], [50, 0], [50, 50], [0, 50]] },
        { siteId: 'ur', ownerId: 'B', points: [[50, 0], [100, 0], [100, 50], [50, 50]] },
        {
            siteId: 'bot',
            ownerId: 'C',
            points: [[0, 50], [50, 50], [100, 50], [100, 100], [0, 100]],
        },
    ];

    /** The OLD derivation: ray-cast each cell's centroid against the loop ring. */
    function pointInPolygon(pt: Point, ring: Point[]): boolean {
        const x = pt[0];
        const y = pt[1];
        let inside = false;
        const n = ring.length;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = ring[i][0];
            const yi = ring[i][1];
            const xj = ring[j][0];
            const yj = ring[j][1];
            const intersects =
                yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
            if (intersects) inside = !inside;
        }
        return inside;
    }

    function centroid(ring: Point[]): Point {
        let mx = 0;
        let my = 0;
        for (const p of ring) {
            mx += p[0];
            my += p[1];
        }
        return [mx / ring.length, my / ring.length];
    }

    it('every loop: derived ownerId and starIds equal the point-in-polygon answer', () => {
        const graph = buildSharedEdgeGraph(cells, WORLD);
        const loops = walkRegionLoops(graph, cells);
        expect(loops.length).toBe(3);

        for (const loop of loops) {
            const ring = reconstructLoopPolygon(loop, graph);

            // Old-style membership: which cells' centroids fall inside the ring?
            const contained = cells.filter((c) => pointInPolygon(centroid(c.points), ring));
            expect(contained.length).toBeGreaterThan(0);

            const containedOwners = [...new Set(contained.map((c) => c.ownerId))];
            expect(containedOwners).toEqual([loop.ownerId]);
            expect(contained.map((c) => c.siteId).sort()).toEqual(loop.starIds);
        }
    });
});

// --- case 5: determinism -----------------------------------------------------

describe('case 5 — determinism across input array order', () => {
    const base: PowerCell[] = [
        { siteId: 'ul', ownerId: 'A', points: [[0, 0], [50, 0], [50, 50], [0, 50]] },
        { siteId: 'ur', ownerId: 'B', points: [[50, 0], [100, 0], [100, 50], [50, 50]] },
        {
            siteId: 'bot',
            ownerId: 'C',
            points: [[0, 50], [50, 50], [100, 50], [100, 100], [0, 100]],
        },
    ];
    const shuffled: PowerCell[] = [base[2], base[0], base[1]];

    it('same cells in different order → identical edgeIds and loopIds', () => {
        const g1 = buildSharedEdgeGraph(base, WORLD);
        const g2 = buildSharedEdgeGraph(shuffled, WORLD);

        expect(g1.sharedEdges.map((e) => e.edgeId)).toEqual(g2.sharedEdges.map((e) => e.edgeId));
        expect(g1.worldEdges.map((e) => e.edgeId)).toEqual(g2.worldEdges.map((e) => e.edgeId));

        const l1 = walkRegionLoops(g1, base).map((l) => l.loopId);
        const l2 = walkRegionLoops(g2, shuffled).map((l) => l.loopId);
        expect(l1).toEqual(l2);

        // loopId depends only on member starIds, not order/centroid.
        const byOwner1 = new Map(walkRegionLoops(g1, base).map((l) => [l.ownerId, l.loopId]));
        const byOwner2 = new Map(walkRegionLoops(g2, shuffled).map((l) => [l.ownerId, l.loopId]));
        for (const owner of ['A', 'B', 'C']) {
            expect(byOwner1.get(owner)).toBe(byOwner2.get(owner));
        }
    });
});

// --- case 6: single-source identity (general) -------------------------------

describe('case 6 — single-source identity: mutating an edge changes both loops alike', () => {
    const cells: PowerCell[] = [
        {
            siteId: 'L',
            ownerId: 'A',
            points: [[0, 0], [50, 0], [50, 100], [0, 100]],
        },
        {
            siteId: 'R',
            ownerId: 'B',
            points: [[50, 0], [100, 0], [100, 100], [50, 100]],
        },
    ];

    it('every SharedEdge: both referencing loops read the SAME smoothedPts', () => {
        const graph = buildSharedEdgeGraph(cells, WORLD);
        const loops = walkRegionLoops(graph, cells);

        for (const edge of graph.sharedEdges) {
            const referencing = loops.filter((l) =>
                l.orderedEdgeRefs.some((r) => r.edgeId === edge.edgeId),
            );
            expect(referencing.length).toBe(2);

            // Baseline polygons.
            const before = referencing.map((l) => reconstructLoopPolygon(l, graph));

            // Mutate the SHARED edge's smoothedPts by inserting a midpoint bump.
            const [p, q] = edge.smoothedPts;
            const mid: Point = [(p[0] + q[0]) / 2 + 7, (p[1] + q[1]) / 2 - 4];
            edge.smoothedPts = [p, mid, q];

            const after = referencing.map((l) => reconstructLoopPolygon(l, graph));

            // BOTH loops must now contain the bump point (50+7, 50-4) = (57,46).
            for (const ring of after) {
                const hasBump = ring.some(
                    (pt) => Math.abs(pt[0] - 57) < 1e-9 && Math.abs(pt[1] - 46) < 1e-9,
                );
                expect(hasBump).toBe(true);
            }

            // The mutation changed BOTH polygons (point count grew for each).
            expect(after[0].length).toBe(before[0].length + 1);
            expect(after[1].length).toBe(before[1].length + 1);

            // restore for any later iterations
            edge.smoothedPts = [p, q];
        }
    });
});
