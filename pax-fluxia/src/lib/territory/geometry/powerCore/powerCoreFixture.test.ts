/**
 * powerCoreFixture.test.ts — P1a integration: real fixture maps through the
 * full powerCore pipeline (weighted-voronoi adapter → shared-edge graph →
 * angular-order loop walk).
 *
 * Sites are PLAIN: real stars only, constant weight — NO virtual sites, NO MSR
 * weights. Stage-0 parity with the live 0319 site construction comes later;
 * this test pins the structural invariants of the core on real coordinates.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildPowerCellsFromSites, type PowerCoreSite } from './buildPowerCellsFromSites';
import {
    buildSharedEdgeGraph,
    reconstructLoopPolygon,
    walkRegionLoops,
} from './sharedEdgeGraph';
import { smoothSharedEdges } from './smoothSharedEdges';
import type { Point, WorldRect } from './powerCoreTypes';

// --- fixture loading ---------------------------------------------------------

interface FixtureStar {
    readonly id: string;
    readonly x: number;
    readonly y: number;
    readonly ownerId?: string;
}

interface FixtureMap {
    readonly metadata: { readonly name: string };
    readonly stars: FixtureStar[];
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
// powerCore → geometry → territory → lib → src → pax-fluxia → repo root
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..', '..', '..');
const FIXTURE_DIR = path.join(REPO_ROOT, 'common', 'resources', 'fixture-maps');

function loadFixture(name: string): FixtureMap {
    const raw = readFileSync(path.join(FIXTURE_DIR, `${name}.json`), 'utf-8');
    return JSON.parse(raw) as FixtureMap;
}

const CONSTANT_WEIGHT = 3600;
const CLIP_PAD = 200;

function sitesFromFixture(fixture: FixtureMap): PowerCoreSite[] {
    return fixture.stars
        .filter((s) => !!s.ownerId)
        .map((s) => ({
            x: s.x,
            y: s.y,
            weight: CONSTANT_WEIGHT,
            ownerId: s.ownerId!,
            starId: s.id,
        }));
}

/** World rect from star bounds, padded; origin (0,0) as the graph expects. */
function worldFromSites(sites: readonly PowerCoreSite[]): WorldRect {
    let maxX = 0;
    let maxY = 0;
    for (const s of sites) {
        if (s.x > maxX) maxX = s.x;
        if (s.y > maxY) maxY = s.y;
    }
    return { width: maxX + CLIP_PAD, height: maxY + CLIP_PAD };
}

function clipFromWorld(world: WorldRect): [number, number][] {
    return [
        [0, 0],
        [world.width, 0],
        [world.width, world.height],
        [0, world.height],
    ];
}

// --- geometry helpers --------------------------------------------------------

function ringArea(ring: Point[]): number {
    let s = 0;
    const n = ring.length;
    for (let i = 0; i < n; i++) {
        const a = ring[i];
        const b = ring[(i + 1) % n];
        s += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(s / 2);
}

/** O(n^2) proper/degenerate segment-intersection check over a closed ring. */
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
    const intersects = (a: Point, b: Point, c: Point, d: Point) => {
        const d1 = cross(c, d, a);
        const d2 = cross(c, d, b);
        const d3 = cross(a, b, c);
        const d4 = cross(a, b, d);
        if (
            ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
            ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
        )
            return true;
        if (Math.abs(d1) < 1e-9 && onSeg(a, c, d)) return true;
        if (Math.abs(d2) < 1e-9 && onSeg(b, c, d)) return true;
        if (Math.abs(d3) < 1e-9 && onSeg(c, a, b)) return true;
        if (Math.abs(d4) < 1e-9 && onSeg(d, a, b)) return true;
        return false;
    };
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (j === (i + 1) % n || (j + 1) % n === i) continue; // adjacent
            const [a, b] = seg(i);
            const [c, d] = seg(j);
            if (intersects(a, b, c, d)) return true;
        }
    }
    return false;
}

/** Deterministic permutation (rotate + reverse) — a stable "shuffle" for tests. */
function permute<T>(arr: readonly T[]): T[] {
    const cut = Math.floor(arr.length / 2);
    return [...arr.slice(cut), ...arr.slice(0, cut)].reverse();
}

/** Canonical serialization of the full pipeline output (already sorted upstream). */
function runPipelineSerialized(sites: readonly PowerCoreSite[]): string {
    const world = worldFromSites(sites);
    const cells = buildPowerCellsFromSites(sites, clipFromWorld(world));
    const graph = buildSharedEdgeGraph(cells, world);
    const loops = walkRegionLoops(graph, cells);
    return JSON.stringify({
        sharedEdges: graph.sharedEdges,
        worldEdges: graph.worldEdges,
        loops,
    });
}

// --- the invariant suite, run per fixture ------------------------------------

const FIXTURES = ['cross_owner_midpoint_corridor', 'world_edge_frontier'] as const;

for (const fixtureName of FIXTURES) {
    describe(`fixture: ${fixtureName}`, () => {
        const fixture = loadFixture(fixtureName);
        const sites = sitesFromFixture(fixture);
        const world = worldFromSites(sites);
        const cells = buildPowerCellsFromSites(sites, clipFromWorld(world));
        const graph = buildSharedEdgeGraph(cells, world);
        const loops = walkRegionLoops(graph, cells);

        it('adapter yields one cell per site', () => {
            expect(sites.length).toBeGreaterThan(0);
            expect(cells.map((c) => c.siteId).sort()).toEqual(
                sites.map((s) => s.starId).sort(),
            );
        });

        it('every owned input site appears in EXACTLY ONE region loop contributing set', () => {
            const counts = new Map<string, number>();
            for (const loop of loops) {
                for (const starId of loop.starIds) {
                    counts.set(starId, (counts.get(starId) ?? 0) + 1);
                }
            }
            for (const site of sites) {
                expect(counts.get(site.starId) ?? 0).toBe(1);
            }
        });

        it('every loop polygon is closed with >= 3 distinct points and positive area', () => {
            expect(loops.length).toBeGreaterThan(0);
            for (const loop of loops) {
                const ring = reconstructLoopPolygon(loop, graph);
                expect(ring.length).toBeGreaterThanOrEqual(3);
                const distinct = new Set(ring.map((p) => `${p[0]}:${p[1]}`));
                expect(distinct.size).toBeGreaterThanOrEqual(3);
                // Closed-ring convention: no consecutive duplicates, incl. the wrap.
                for (let i = 0; i < ring.length; i++) {
                    const a = ring[i];
                    const b = ring[(i + 1) % ring.length];
                    expect(a[0] === b[0] && a[1] === b[1]).toBe(false);
                }
                expect(ringArea(ring)).toBeGreaterThan(0);
            }
        });

        it('no loop polygon self-intersects', () => {
            for (const loop of loops) {
                const ring = reconstructLoopPolygon(loop, graph);
                expect(hasSelfIntersection(ring)).toBe(false);
            }
        });

        it('every SharedEdge separates two DIFFERENT owners', () => {
            expect(graph.sharedEdges.length).toBeGreaterThan(0);
            for (const e of graph.sharedEdges) {
                expect(e.ownerA).not.toBe(e.ownerB);
            }
        });

        it('loop walks use every SharedEdge exactly TWICE (once per side) and every WorldEdge exactly ONCE', () => {
            const sharedUse = new Map<string, boolean[]>(); // edgeId → forward flags
            const worldUse = new Map<string, number>();
            for (const loop of loops) {
                for (const ref of loop.orderedEdgeRefs) {
                    if (ref.kind === 'shared') {
                        const flags = sharedUse.get(ref.edgeId) ?? [];
                        flags.push(ref.forward);
                        sharedUse.set(ref.edgeId, flags);
                    } else {
                        worldUse.set(ref.edgeId, (worldUse.get(ref.edgeId) ?? 0) + 1);
                    }
                }
            }
            for (const e of graph.sharedEdges) {
                const flags = sharedUse.get(e.edgeId) ?? [];
                expect(flags.length).toBe(2);
                // Once per SIDE: one forward traversal, one backward.
                expect(flags.filter(Boolean).length).toBe(1);
            }
            for (const e of graph.worldEdges) {
                expect(worldUse.get(e.edgeId) ?? 0).toBe(1);
            }
            // And no refs to edges outside the graph.
            const known = new Set([
                ...graph.sharedEdges.map((e) => e.edgeId),
                ...graph.worldEdges.map((e) => e.edgeId),
            ]);
            for (const loop of loops) {
                for (const ref of loop.orderedEdgeRefs) {
                    expect(known.has(ref.edgeId)).toBe(true);
                }
            }
        });

        it('smoothing (passes=2) keeps every loop reconstructable with exact junction seams', () => {
            smoothSharedEdges(graph, 2);
            for (const loop of loops) {
                const ring = reconstructLoopPolygon(loop, graph);
                expect(ring.length).toBeGreaterThanOrEqual(3);
                for (let i = 0; i < ring.length; i++) {
                    const a = ring[i];
                    const b = ring[(i + 1) % ring.length];
                    expect(a[0] === b[0] && a[1] === b[1]).toBe(false);
                }
            }
            smoothSharedEdges(graph, 0); // restore raw for any later assertions
        });

        it('pipeline is deterministic: shuffled site order → byte-identical sorted output', () => {
            const a = runPipelineSerialized(sites);
            const b = runPipelineSerialized(permute(sites));
            expect(b).toBe(a);
        });
    });
}
