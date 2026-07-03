/**
 * kineticBubble.test.ts — K1: transition kinetic core against the T-criteria
 * (2026-07-02_TRANSITION_CORRECTNESS_SPEC_AND_KINETIC_PLAN.md).
 *
 * T1 endpoint exactness · T2 frame validity · T3 frozen-outside ·
 * T6 determinism · ripple monotonicity · T7 budget probe.
 * (T4 recapture retarget is exercised at the engine level in K2.)
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarConnection, StarState } from '$lib/types/game.types';
import {
    buildGeometry0319SitesAndClip,
    resolveDisconnectCellOwner,
} from '../../compiler/Geometry_0319';
import { DISCONNECT_OWNER_ID } from '../../../renderers/territoryFeatures';
import { buildPowerVoronoi0319Settings } from '../../families/buildFamilyGeometry';
import { buildPowerCellsFromSites } from './buildPowerCellsFromSites';
import { buildTransitionBubble, polygonKey } from './buildTransitionBubble';
import type { KineticEndpointState } from './kineticTypes';
import { rampProgress, sampleKineticFrame } from './sampleKineticFrame';
import { buildSharedEdgeGraph, walkRegionLoops, reconstructLoopPolygon } from './sharedEdgeGraph';
import type { PowerCell, Point } from './powerCoreTypes';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..', '..', '..');

// ── endpoint-state construction (real shared Stage-0) ───────────────────────

interface Loaded {
    stars: StarState[];
    connections: StarConnection[];
    worldWidth: number;
    worldHeight: number;
}

function loadMap(dir: string, name: string): Loaded {
    const raw = JSON.parse(
        readFileSync(path.join(REPO_ROOT, 'common', 'resources', dir, `${name}.json`), 'utf-8'),
    ) as { stars: StarState[]; connections: StarConnection[] };
    let maxX = 0, maxY = 0;
    for (const s of raw.stars) { if (s.x > maxX) maxX = s.x; if (s.y > maxY) maxY = s.y; }
    return {
        stars: raw.stars,
        connections: raw.connections,
        worldWidth: maxX + 200,
        worldHeight: maxY + 200,
    };
}

function buildState(
    map: Loaded,
    ownerOverrides: Record<string, string>,
): { state: KineticEndpointState; clip: [number, number][] } {
    const stars = map.stars.map((s) =>
        ownerOverrides[s.id] ? ({ ...s, ownerId: ownerOverrides[s.id] } as StarState) : s,
    );
    const config = buildPowerVoronoi0319Settings({
        lanes: map.connections,
        worldWidth: map.worldWidth,
        worldHeight: map.worldHeight,
        configSource: GAME_CONFIG as unknown as Record<string, unknown>,
    });
    const stage0 = buildGeometry0319SitesAndClip([...stars], [...map.connections], config);
    if ('kind' in stage0) throw new Error(stage0.message);
    const siteById = new Map(stage0.sites.map((s) => [s.starId, s]));
    const raw = buildPowerCellsFromSites(stage0.sites, stage0.clip);
    const cells: PowerCell[] = [];
    for (const cell of raw) {
        if (cell.ownerId !== DISCONNECT_OWNER_ID) { cells.push(cell); continue; }
        const site = siteById.get(cell.siteId);
        const resolved = site ? resolveDisconnectCellOwner(site, stage0.ownedStars) : null;
        if (resolved) cells.push({ ...cell, ownerId: resolved });
    }
    return { state: { sites: stage0.sites, cells }, clip: stage0.clip };
}

/** Pick a capture: flip the first star to the first OTHER owner on the map. */
function pickCapture(map: Loaded): { starId: string; from: string; to: string } {
    const owners = [...new Set(map.stars.filter((s) => s.ownerId).map((s) => s.ownerId!))];
    const star = map.stars.find((s) => s.ownerId)!;
    const to = owners.find((o) => o !== star.ownerId)!;
    return { starId: star.id, from: star.ownerId!, to };
}

// ── validity helpers ─────────────────────────────────────────────────────────

function selfIntersects(ring: readonly Point[]): boolean {
    const n = ring.length;
    const seg = (i: number): [Point, Point] => [ring[i]!, ring[(i + 1) % n]!];
    const cross = (o: Point, a: Point, b: Point) =>
        (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const intersect = (a: Point, b: Point, c: Point, d: Point): boolean => {
        const d1 = cross(c, d, a), d2 = cross(c, d, b), d3 = cross(a, b, c), d4 = cross(a, b, d);
        return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
            ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
    };
    for (let i = 0; i < n; i++) {
        for (let j = i + 2; j < n; j++) {
            if (i === 0 && j === n - 1) continue;
            const [a, b] = seg(i);
            const [c, d] = seg(j);
            if (intersect(a, b, c, d)) return true;
        }
    }
    return false;
}

function assertFrameValid(
    cells: readonly PowerCell[],
    world: { width: number; height: number; minX: number; minY: number; maxX: number; maxY: number },
): void {
    const graph = buildSharedEdgeGraph([...cells], world);
    const loops = walkRegionLoops(graph, [...cells]);
    expect(loops.length).toBeGreaterThan(0);
    for (const loop of loops) {
        const poly = reconstructLoopPolygon(loop, graph);
        expect(poly.length).toBeGreaterThanOrEqual(3);
        expect(selfIntersects(poly)).toBe(false);
    }
}

function polygonArea(points: readonly Point[]): number {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i]!;
        const [bx, by] = points[(i + 1) % points.length]!;
        area += ax * by - bx * ay;
    }
    return Math.abs(area * 0.5);
}

// ── the suite ────────────────────────────────────────────────────────────────

const FIXTURES = ['cross_owner_midpoint_corridor', 'world_edge_frontier'];

describe.each(FIXTURES)('kinetic bubble (%s)', (fixtureName) => {
    const map = loadMap('fixture-maps', fixtureName);
    const capture = pickCapture(map);
    const { state: s0, clip } = buildState(map, {});
    const { state: s1 } = buildState(map, { [capture.starId]: capture.to });
    const worldRect = (() => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const [x, y] of clip) {
            if (x < minX) minX = x; if (y < minY) minY = y;
            if (x > maxX) maxX = x; if (y > maxY) maxY = y;
        }
        return { width: map.worldWidth, height: map.worldHeight, minX, minY, maxX, maxY };
    })();

    it('null transition: identical states freeze everything', () => {
        const bubble = buildTransitionBubble({ s0, s1: s0 });
        expect(bubble.ramps.length).toBe(0);
        expect(bubble.frozenCells.length).toBe(s0.cells.length);
        const frame = sampleKineticFrame({ bubble, p: 0.5, clip });
        expect(frame.bubbleCells.length).toBe(0);
    });

    it('capture bubble: partitioned into frozen + changed, with a handoff ramp', () => {
        const bubble = buildTransitionBubble({ s0, s1 });
        expect(bubble.ramps.some((r) => r.kind === 'handoff')).toBe(true);
        expect(bubble.frozenCells.length + bubble.bubbleCells1.length).toBe(s1.cells.length);
        // (locality — frozen ≫ moving — is asserted on the acceptance map in
        // the budget test; tiny fixtures are legitimately all-bubble+ring.)
        // Frozen cells exist identically in S0 at the geometry quantum (the
        // two endpoint diagrams are independent d3 runs — bit-level noise on
        // unchanged cells is possible and absorbed by the 1e-3 quantization;
        // byte-exactness holds for the p=1 endpoint, which is all-S1).
        const s0Keys = new Set(s0.cells.map((c) => `${c.ownerId}:${polygonKey(c.points)}`));
        for (const cell of bubble.frozenCells) {
            expect(s0Keys.has(`${cell.ownerId}:${polygonKey(cell.points)}`)).toBe(true);
        }
    });

    it('T1: endpoint snap is byte-exact; near-endpoint frames are continuous', () => {
        const bubble = buildTransitionBubble({ s0, s1 });
        expect(sampleKineticFrame({ bubble, p: 0, clip }).bubbleCells).toBe(bubble.bubbleCells0);
        expect(sampleKineticFrame({ bubble, p: 1, clip }).bubbleCells).toBe(bubble.bubbleCells1);
        // Continuity: total bubble area at p≈0 within 3% of S0's bubble area.
        const area = (cells: readonly PowerCell[]) =>
            cells.reduce((sum, c) => sum + polygonArea(c.points), 0);
        const early = sampleKineticFrame({ bubble, p: 0.02, clip });
        const late = sampleKineticFrame({ bubble, p: 0.98, clip });
        expect(Math.abs(area(early.bubbleCells) - area(bubble.bubbleCells0)) / area(bubble.bubbleCells0)).toBeLessThan(0.03);
        expect(Math.abs(area(late.bubbleCells) - area(bubble.bubbleCells1)) / area(bubble.bubbleCells1)).toBeLessThan(0.03);
    });

    it('T2: stitched frames are valid partitions at sampled progress', () => {
        const bubble = buildTransitionBubble({ s0, s1 });
        for (const p of [0.25, 0.5, 0.75]) {
            const frame = sampleKineticFrame({ bubble, p, clip });
            assertFrameValid([...frame.frozenCells, ...frame.bubbleCells], worldRect);
        }
    });

    it('T3: frozen cells are the same objects in every frame', () => {
        const bubble = buildTransitionBubble({ s0, s1 });
        const a = sampleKineticFrame({ bubble, p: 0.3, clip });
        const b = sampleKineticFrame({ bubble, p: 0.7, clip });
        expect(a.frozenCells).toBe(bubble.frozenCells);
        expect(b.frozenCells).toBe(bubble.frozenCells);
    });

    it('T6: deterministic across rebuilds', () => {
        const run = () => {
            const bubble = buildTransitionBubble({ s0, s1 });
            return JSON.stringify(sampleKineticFrame({ bubble, p: 0.5, clip }));
        };
        expect(run()).toBe(run());
    });

    it('ripple: staggered ramps stay monotone and frames stay valid', () => {
        const origin = map.stars.find((s) => s.id === capture.starId)!;
        const bubble = buildTransitionBubble({
            s0, s1, rippleOrigin: { x: origin.x, y: origin.y },
        });
        for (const ramp of bubble.ramps) {
            let prev = -1;
            for (let p = 0; p <= 1.0001; p += 0.05) {
                const q = rampProgress(ramp, p);
                expect(q).toBeGreaterThanOrEqual(prev);
                prev = q;
            }
        }
        const frame = sampleKineticFrame({ bubble, p: 0.5, clip });
        assertFrameValid([...frame.frozenCells, ...frame.bubbleCells], worldRect);
    });
});

describe('kinetic budget (acceptance map)', () => {
    it('T7: sampleKineticFrame within budget on First Symmetry-6_April 17b', () => {
        const map = loadMap('saved-maps', 'first_symmetry-6_april_17b');
        const capture = pickCapture(map);
        const { state: s0, clip } = buildState(map, {});
        const { state: s1 } = buildState(map, { [capture.starId]: capture.to });
        const bubble = buildTransitionBubble({ s0, s1 });
        // warm-up
        sampleKineticFrame({ bubble, p: 0.5, clip });
        const N = 30;
        const t0 = performance.now();
        for (let i = 1; i < N; i++) {
            sampleKineticFrame({ bubble, p: i / N, clip });
        }
        const perFrameMs = (performance.now() - t0) / (N - 1);
        // eslint-disable-next-line no-console
        console.log(`[kinetic-budget] ramps=${bubble.ramps.length} ring=${bubble.ringSites.length} frozen=${bubble.frozenCells.length} perFrame=${perFrameMs.toFixed(2)}ms`);
        expect(perFrameMs).toBeLessThan(4); // spec target 2ms; 4ms guards CI noise
        // Locality (T3's premise): on a real map the overwhelming majority of
        // cells never move during a single capture.
        expect(bubble.frozenCells.length).toBeGreaterThan(s1.cells.length * 0.7);
    });
});
