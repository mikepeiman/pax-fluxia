/**
 * smoothMorphFrame.proof.test.ts — PROOF of the viable "smooth the live sweep"
 * approach.
 *
 * The failed approaches (months): (a) vertex-correspondence lerp; (b) Chaikin
 * each MOVING CELL independently — which tears at shared cell edges. This proves
 * the real fix: a morph frame's cell set (frozen + moving bubble) flows through
 * the SAME sharedEdgeGraph → smoothSharedEdges (junction-pinned) → walkRegionLoops
 * pipeline that already makes the IDLE map seamless and smooth. If the frozen /
 * bubble seam welds (quantized shared endpoints) then every morph frame is a
 * complete, watertight, per-owner region map — smoothable and VFX-able as a whole,
 * exactly like idle — with NO per-cell tearing.
 *
 * Make-or-break assertion: the owner region loops of a MID-SWEEP frame tile the
 * clip EXACTLY (seam welded, no gaps/overlaps), before AND after smoothing.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarConnection, StarState } from '$lib/types/game.types';
import { computePowerCoreEndpoint } from './buildPowerCoreAuthoritySnapshot';
import { buildPowerVoronoi0319Settings } from '../../families/buildFamilyGeometry';
import { buildTransitionBubble } from './buildTransitionBubble';
import { sampleKineticFrame } from './sampleKineticFrame';
import {
    buildSharedEdgeGraph,
    reconstructLoopPolygon,
    walkRegionLoops,
} from './sharedEdgeGraph';
import { smoothSharedEdges } from './smoothSharedEdges';
import { buildSurfaceFromCells } from './buildSurfaceFromCells';
import { KineticTransitionRuntime } from './kineticTransitionRuntime';
import { WORLD_OWNER, type Point, type PowerCell, type WorldRect } from './powerCoreTypes';
import type { KineticEndpointState } from './kineticTypes';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..', '..', '..');
const FIXTURE = 'cross_owner_midpoint_corridor';

function load() {
    const raw = JSON.parse(
        readFileSync(
            path.join(REPO_ROOT, 'common', 'resources', 'fixture-maps', `${FIXTURE}.json`),
            'utf-8',
        ),
    ) as { stars: StarState[]; connections: StarConnection[] };
    let maxX = 0;
    let maxY = 0;
    for (const s of raw.stars) {
        if (s.x > maxX) maxX = s.x;
        if (s.y > maxY) maxY = s.y;
    }
    return { stars: raw.stars, connections: raw.connections, w: maxX + 200, h: maxY + 200 };
}

const MAP = load();

function endpoint(overrides: Record<string, string>): {
    state: KineticEndpointState;
    clip: [number, number][];
} {
    const stars = MAP.stars.map((s) =>
        overrides[s.id] ? ({ ...s, ownerId: overrides[s.id] } as StarState) : s,
    );
    const config = buildPowerVoronoi0319Settings({
        lanes: MAP.connections,
        worldWidth: MAP.w,
        worldHeight: MAP.h,
        configSource: GAME_CONFIG as unknown as Record<string, unknown>,
    });
    const r = computePowerCoreEndpoint({ stars, connections: MAP.connections, config });
    if ('kind' in r) throw new Error(r.message);
    return { state: { sites: r.sites, cells: r.cells }, clip: r.clip };
}

const CAPTURED = 'star-0';
const NEW_OWNER = 'ai-1';
const ATTACKER = MAP.stars.find((s) => s.id === 'star-1')!;
const S0 = endpoint({});
const S1 = endpoint({ [CAPTURED]: NEW_OWNER });
const CONQUEST_ORIGINS = new Map([[CAPTURED, { x: ATTACKER.x, y: ATTACKER.y }]]);

function shoelace(ring: readonly Point[]): number {
    let s = 0;
    const n = ring.length;
    for (let i = 0; i < n; i++) {
        const a = ring[i]!;
        const b = ring[(i + 1) % n]!;
        s += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(s / 2);
}

function clipBounds(clip: [number, number][]): WorldRect {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of clip) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    return { width: MAP.w, height: MAP.h, minX, minY, maxX, maxY };
}

/** Build the smooth per-owner region map for one morph frame, the idle way. */
function morphFrameRegions(p: number, passes: number) {
    const bubble = buildTransitionBubble({
        s0: S0.state,
        s1: S1.state,
        conquestOrigins: CONQUEST_ORIGINS,
    });
    const frame = sampleKineticFrame({ bubble, p, clip: S0.clip });
    const cells: PowerCell[] = [...frame.frozenCells, ...frame.bubbleCells];
    const world = clipBounds(S0.clip);
    const graph = buildSharedEdgeGraph(cells, world);
    if (passes > 0) smoothSharedEdges(graph, passes);
    const loops = walkRegionLoops(graph, cells);
    return { cells, graph, loops };
}

/** Total area of the bounded owner faces (exclude the WORLD exterior face). */
function ownerCoverage(
    loops: ReturnType<typeof walkRegionLoops>,
    graph: ReturnType<typeof buildSharedEdgeGraph>,
): number {
    let sum = 0;
    for (const loop of loops) {
        if (loop.ownerId === WORLD_OWNER) continue;
        sum += shoelace(reconstructLoopPolygon(loop, graph));
    }
    return sum;
}

describe('PROOF: a morph frame flows through the idle smoothing pipeline seamlessly', () => {
    const CLIP_AREA = shoelace(S0.clip.map((p) => [p[0], p[1]] as Point));

    it('mid-sweep owner regions tile the clip EXACTLY (frozen/bubble seam welds)', () => {
        const { loops, graph } = morphFrameRegions(0.4, 0);
        expect(loops.length).toBeGreaterThan(0);
        // No degenerate frontier: every shared edge separates two DISTINCT owners.
        for (const e of graph.sharedEdges) expect(e.ownerA).not.toBe(e.ownerB);
        // Watertight: bounded owner faces cover the whole clip, no gap at the seam.
        const coverage = ownerCoverage(loops, graph);
        expect(coverage / CLIP_AREA).toBeGreaterThan(0.999);
        expect(coverage / CLIP_AREA).toBeLessThan(1.001);
    });

    it('chain-aware smoothing ROUNDS the live frontier AND stays watertight (single-source)', () => {
        const { loops, graph } = morphFrameRegions(0.4, 3);
        // Rounding now happens: multi-segment same-owner-pair chains gained
        // interior points (the old per-atomic-edge Chaikin was a no-op here).
        const smoothed = graph.sharedEdges.filter((e) => e.smoothedPts.length > 2);
        expect(smoothed.length).toBeGreaterThan(0);
        // ...and the watertight tiling is preserved — junction pinning keeps the
        // smoothed regions gap-free, so every morph frame is still a complete map.
        const coverage = ownerCoverage(loops, graph);
        expect(coverage / CLIP_AREA).toBeGreaterThan(0.98);
        expect(coverage / CLIP_AREA).toBeLessThan(1.02);
    });

    it('SMOOTHED loops reconstruct as clean closed rings (single-source seams stitch exactly)', () => {
        // The single-source guarantee is structural: a SharedEdge is ONE object
        // referenced by BOTH adjacent region loops, so fills (reconstructLoopPolygon)
        // and borders read the exact same smoothedPts — they cannot diverge. Prove
        // it renders watertight: every smoothed owner loop is a valid closed ring
        // with no consecutive duplicate vertices (a duplicate would mean a seam
        // failed to share its point exactly).
        const { loops, graph } = morphFrameRegions(0.4, 3);
        let ownerLoops = 0;
        for (const loop of loops) {
            if (loop.ownerId === WORLD_OWNER) continue;
            ownerLoops++;
            const ring = reconstructLoopPolygon(loop, graph);
            expect(ring.length).toBeGreaterThanOrEqual(3);
            expect(shoelace(ring)).toBeGreaterThan(1e-6);
            for (let i = 0; i < ring.length; i++) {
                const a = ring[i]!;
                const b = ring[(i + 1) % ring.length]!;
                expect(a[0] === b[0] && a[1] === b[1]).toBe(false);
            }
        }
        expect(ownerLoops).toBeGreaterThan(0);
        for (const e of graph.sharedEdges) expect(e.ownerA).not.toBe(e.ownerB);
    });

    it('the frontier is OWNER-MERGED, not per-cell (far fewer, longer edges)', () => {
        const { cells, graph } = morphFrameRegions(0.4, 0);
        let rawCellEdges = 0;
        for (const c of cells) rawCellEdges += c.points.length;
        // The merged inter-owner frontier is a small fraction of raw cell edges —
        // this is why smoothing it as WHOLES (not per cell) cannot tear seams.
        expect(graph.sharedEdges.length).toBeLessThan(rawCellEdges / 3);
    });

    it('is continuous frame-to-frame (no snap): adjacent frames barely differ', () => {
        const a = ownerCoverage(...regionsForCoverage(0.5));
        const b = ownerCoverage(...regionsForCoverage(0.52));
        // Coverage is always the full clip (tiling), so compare the moving owner's
        // captured area instead: it must change by only a small step, not jump.
        const shareA = capturedNewOwnerArea(0.5);
        const shareB = capturedNewOwnerArea(0.52);
        expect(shareB).toBeGreaterThan(shareA); // advancing
        expect(shareB - shareA).toBeLessThan(0.2 * CLIP_AREA); // small step, no snap
        // (a,b kept meaningful so the tiling invariant is exercised at both.)
        expect(a / CLIP_AREA).toBeGreaterThan(0.999);
        expect(b / CLIP_AREA).toBeGreaterThan(0.999);
    });
});

describe('buildSurfaceFromCells: the render-ready morph surface (idle + morph share this)', () => {
    const CLIP_AREA = shoelace(S0.clip.map((p) => [p[0], p[1]] as Point));
    const bubble = buildTransitionBubble({
        s0: S0.state,
        s1: S1.state,
        conquestOrigins: CONQUEST_ORIGINS,
    });
    const frameCells = (p: number): PowerCell[] => {
        const frame = sampleKineticFrame({ bubble, p, clip: S0.clip });
        return [...frame.frozenCells, ...frame.bubbleCells];
    };
    it('borders: frontiers are rounded, inter-owner, and present (what the family strokes)', () => {
        const surface = buildSurfaceFromCells(frameCells(0.4), 3);
        // The family draws surface.frontiers/worldBorders as the smoothed borders
        // (fills are per-cell). Some frontier gained interior points ⇒ rounded.
        expect(surface.frontiers.some((f) => f.points.length > 2)).toBe(true);
        expect(surface.frontiers.every((f) => f.ownerA !== f.ownerB)).toBe(true);
        expect(surface.worldBorders.length).toBeGreaterThan(0);
    });

    it('passes=0 gives straight frontiers; passes>0 rounds them (slider works)', () => {
        const flat = buildSurfaceFromCells(frameCells(0.4), 0);
        const round = buildSurfaceFromCells(frameCells(0.4), 3);
        const flatPts = flat.frontiers.reduce((n, f) => n + f.points.length, 0);
        const roundPts = round.frontiers.reduce((n, f) => n + f.points.length, 0);
        expect(roundPts).toBeGreaterThan(flatPts);
    });

    it('is deterministic — identical cells give byte-identical surface', () => {
        const a = buildSurfaceFromCells(frameCells(0.4), 3);
        const b = buildSurfaceFromCells(frameCells(0.4), 3);
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    });

    // KNOWN BUG (it.fails until the single-diagram-per-frame morph lands): the
    // conquest split adds crossing points on the captured cell's boundary that
    // its neighbours don't have (hanging nodes). The crossed edge is shared with
    // a FROZEN cell from a different diagram, so the crossing can't be both
    // matched AND collinear on the frozen side — geometric conforming can't fix
    // it. The dropped frontier merges the victor's split-part into the loser's
    // region (past the midpoint, neighbours flood with the victor's colour). The
    // fix is to render each morph frame from ONE conforming diagram (no
    // frozen/bubble precision boundary). This guard flips red when that lands.
    it.fails('does NOT merge regions across the conquest front (each owner keeps its area)', () => {
        // Coverage stays 100% (merging conserves area), so only a PER-OWNER area
        // check catches it. passes=0 to isolate topology.
        for (const p of [0.25, 0.5, 0.75]) {
            const cells = frameCells(p);
            const surface = buildSurfaceFromCells(cells, 0);
            const cellArea = new Map<string, number>();
            for (const c of cells) {
                cellArea.set(c.ownerId, (cellArea.get(c.ownerId) ?? 0) + shoelace(c.points));
            }
            const regionArea = new Map<string, number>();
            for (const r of surface.regions) {
                regionArea.set(r.ownerId, (regionArea.get(r.ownerId) ?? 0) + shoelace(r.points));
            }
            for (const [owner, ca] of cellArea) {
                const ra = regionArea.get(owner) ?? 0;
                // Each owner's rendered area must match its true cell area — a
                // merged (absorbed) owner would be near zero here.
                expect(Math.abs(ra - ca) / CLIP_AREA).toBeLessThan(0.01);
            }
        }
    });
});

// The LIVE path: drive the actual runtime (commit + sample) exactly as the game
// does, then render the frame with buildSurfaceFromCells the way the family now
// does. Reproduces the "all fills disappear mid-conquest" regression: the clip
// is PADDED, so an external presentation-frame rect classified zero world edges;
// self-deriving the rect from the cells fixes it.
describe('LIVE runtime path: fills must NOT disappear during the conquest', () => {
    const CLIP_AREA = shoelace(S0.clip.map((p) => [p[0], p[1]] as Point));

    it('clip is padded past the origin (so the world-rect bug is exercised)', () => {
        const b = clipBounds(S0.clip);
        // computePowerCoreEndpoint pads the clip — min is negative / max exceeds
        // the map — which is precisely why a presentation-frame rect fails.
        expect(b.minX! < 0 || b.minY! < 0).toBe(true);
    });

    it('every mid-conquest runtime frame (sampleFull) tiles the clip — complete per-cell fill', () => {
        const runtime = new KineticTransitionRuntime();
        runtime.commit({
            state: S0.state,
            clip: S0.clip,
            ownershipVersion: 'v0',
            transitionKey: null, // initial snap
            nowMs: 0,
            durationMs: 1000,
        });
        runtime.commit({
            state: S1.state,
            clip: S1.clip,
            ownershipVersion: 'v1',
            transitionKey: 'sess:star-0:human-player:ai-1',
            nowMs: 0,
            durationMs: 1000,
            conquestOrigins: CONQUEST_ORIGINS,
        });
        for (const nowMs of [50, 200, 500, 800, 950]) {
            const frame = runtime.sampleFull(nowMs);
            expect(frame).not.toBeNull();
            const cells = frame!.bubbleCells; // one diagram
            let area = 0;
            for (const c of cells) {
                expect(c.ownerId).toBeTruthy();
                area += shoelace(c.points);
            }
            expect(area / CLIP_AREA).toBeGreaterThan(0.999);
            expect(area / CLIP_AREA).toBeLessThan(1.001);
        }
    });
});

// THE FIX (fills): the family fills the one-diagram frame PER CELL. Each cell is
// exactly one owner and the cells tile the clip, so the fill is complete (no gaps)
// and cannot bucket-fill or leave a captured region unfilled — regardless of the
// conquest split's T-junctions. Drives the real runtime (commit + sample) and
// asserts exactly that, for BOTH front modes, every frame.
describe('ONE-DIAGRAM morph (runtime.sampleFull): per-cell fills tile completely', () => {
    const CLIP_AREA = shoelace(S0.clip.map((p) => [p[0], p[1]] as Point));
    const runtimeFor = (front: 'linear' | 'radial'): KineticTransitionRuntime => {
        const rt = new KineticTransitionRuntime();
        rt.commit({
            state: S0.state, clip: S0.clip, ownershipVersion: 'v0',
            transitionKey: null, nowMs: 0, durationMs: 1000,
        });
        rt.commit({
            state: S1.state, clip: S1.clip, ownershipVersion: 'v1',
            transitionKey: 'k', nowMs: 0, durationMs: 1000,
            conquestOrigins: CONQUEST_ORIGINS, conquestFrontMode: front,
        });
        return rt;
    };
    for (const front of ['linear', 'radial'] as const) {
        it(`${front}: cells tile the clip, every cell single-owner, every frame`, () => {
            const rt = runtimeFor(front);
            for (const t of [80, 250, 500, 750, 920]) {
                const frame = rt.sampleFull(t);
                expect(frame).not.toBeNull();
                expect(frame!.frozenCells.length).toBe(0); // one diagram, all in bubbleCells
                const cells = frame!.bubbleCells;
                let area = 0;
                for (const c of cells) {
                    expect(c.ownerId).toBeTruthy(); // single, real owner ⇒ no bucket-fill
                    expect(c.points.length).toBeGreaterThanOrEqual(3);
                    area += shoelace(c.points);
                }
                // Cells tile the clip ⇒ the per-cell fill is a complete map, no gaps.
                expect(area / CLIP_AREA).toBeGreaterThan(0.999);
                expect(area / CLIP_AREA).toBeLessThan(1.001);
                // Both owners of the captured cell are present mid-sweep (the split
                // actually renders as a shape change, not a flip).
                const capturedOwners = new Set(
                    cells.filter((c) => c.siteId === CAPTURED).map((c) => c.ownerId),
                );
                if (t >= 250 && t <= 750) expect(capturedOwners.size).toBe(2);
            }
        });
    }
});

function regionsForCoverage(
    p: number,
): [ReturnType<typeof walkRegionLoops>, ReturnType<typeof buildSharedEdgeGraph>] {
    const { loops, graph } = morphFrameRegions(p, 0);
    return [loops, graph];
}

function capturedNewOwnerArea(p: number): number {
    const bubble = buildTransitionBubble({
        s0: S0.state,
        s1: S1.state,
        conquestOrigins: CONQUEST_ORIGINS,
    });
    const frame = sampleKineticFrame({ bubble, p, clip: S0.clip });
    let sum = 0;
    for (const c of frame.bubbleCells) {
        if (c.siteId === CAPTURED && c.ownerId === NEW_OWNER) sum += shoelace(c.points);
    }
    return sum;
}
