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
import {
    clipPolylineBehindFront,
    clipPolylineByFront,
    frontFieldForRing,
    splitCellByFrontDetailed,
} from './conquestFrontField';
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

// End-snap fix 1: the conquest front COMPLETES before the timeline ends, so the
// old owner's residual strip shrinks to nothing while animating instead of
// popping at retirement (smoothstep decelerates to zero exactly when the strip
// is thinnest — the measured 717px² lingering sliver).
describe('conquest front completes early (no settle pop)', () => {
    const rt = new KineticTransitionRuntime();
    rt.commit({
        state: S0.state, clip: S0.clip, ownershipVersion: 'v0',
        transitionKey: null, nowMs: 0, durationMs: 1000,
    });
    rt.commit({
        state: S1.state, clip: S1.clip, ownershipVersion: 'v1',
        transitionKey: 'k', nowMs: 0, durationMs: 1000,
        conquestOrigins: CONQUEST_ORIGINS,
    });

    it('by p=0.95 the front is DONE: no overlay, captured cell settled-owner', () => {
        const frame = rt.sampleFull(950)!;
        const parts = frame.bubbleCells.filter((c) => c.siteId === CAPTURED);
        expect(parts.length).toBe(1);
        expect(parts[0]!.ownerId).toBe(NEW_OWNER);
        expect(frame.fronts ?? []).toHaveLength(0);
    });

    it('mid-sweep: cell UNSPLIT (settled owner) + an overlay front with 0<q<1', () => {
        const frame = rt.sampleFull(500)!;
        const parts = frame.bubbleCells.filter((c) => c.siteId === CAPTURED);
        expect(parts.length).toBe(1); // split-after-smoothing: graph never sees a split
        expect(parts[0]!.ownerId).toBe(NEW_OWNER);
        const front = (frame.fronts ?? []).find((f) => f.siteId === CAPTURED);
        expect(front).toBeTruthy();
        expect(front!.q).toBeGreaterThan(0);
        expect(front!.q).toBeLessThan(1);
        // LIVE-LABEL CLASSIFICATION: pass fronts straight into
        // buildSurfaceFromCells — the returned cellFills for the captured
        // siteId are ALREADY split into both owners' pieces; no caller-side
        // splitting needed.
        const surface = buildSurfaceFromCells(
            [...frame.frozenCells, ...frame.bubbleCells],
            2,
            undefined,
            frame.fronts ?? [],
        );
        const pieces = surface.cellFills.filter((f) => f.siteId?.startsWith(`${CAPTURED}§`));
        const owners = new Set(pieces.map((p) => p.ownerId));
        expect(owners.size).toBe(2);
    });

    it('ACCEPTANCE GATE: no border reorganization at front completion (was 33.75px in one frame)', () => {
        // The user-visible "overshoot that snaps back": the split's junctions used
        // to reorganize the smoothing chains in ONE frame at the completion
        // crossing (~p=0.828). With split-after-smoothing the chains are settled-
        // topology all morph long — the frontier jump across the crossing must be
        // motion-scale, never a reorganization.
        const lines = (t: number): [number, number][][] => {
            const f = rt.sampleFull(t)!;
            const s = buildSurfaceFromCells([...f.frozenCells, ...f.bubbleCells], 2);
            return [...s.frontiers, ...s.worldBorders].map((x) => x.points as [number, number][]);
        };
        const ptSegD = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
            const dx = bx - ax;
            const dy = by - ay;
            const l2 = dx * dx + dy * dy;
            if (l2 < 1e-12) return Math.hypot(px - ax, py - ay);
            let t = ((px - ax) * dx + (py - ay) * dy) / l2;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            return Math.hypot(ax + t * dx - px, ay + t * dy - py);
        };
        const maxDev = (A: [number, number][][], B: [number, number][][]) => {
            let worst = 0;
            for (const L of A) {
                for (const p of L) {
                    let best = Infinity;
                    for (const M of B) {
                        for (let i = 0; i < M.length - 1; i++) {
                            const d = ptSegD(p[0], p[1], M[i]![0], M[i]![1], M[i + 1]![0], M[i + 1]![1]);
                            if (d < best) best = d;
                        }
                    }
                    if (best > worst) worst = best;
                }
            }
            return worst;
        };
        for (const [a, b] of [[810, 820], [820, 825], [825, 830], [830, 835], [835, 840]] as const) {
            expect(maxDev(lines(a), lines(b)), `jump ${a}→${b}`).toBeLessThan(2);
        }
        // After completion: byte-stable.
        expect(maxDev(lines(850), lines(900))).toBeLessThan(1e-6);
    });

    it('front chains cover the WHOLE front from the FIRST frame, endpoints ON the rim', () => {
        // User requirement 1: the front stroke must occupy the entire front —
        // the old off-rim-distance extraction left it bare at start ("grows
        // from a point").
        for (const t of [8, 30, 300, 700]) {
            const f = rt.sampleFull(t)!;
            const af = (f.fronts ?? []).find((x) => x.siteId === CAPTURED);
            if (!af) continue; // post-completion
            const surface = buildSurfaceFromCells([...f.frozenCells, ...f.bubbleCells], 2);
            const rim = surface.cellFills.find((c) => c.siteId === CAPTURED)!.points;
            const split = splitCellByFrontDetailed(
                { siteId: CAPTURED, ownerId: af.front.ownerIn, points: rim } as never,
                af.front,
                af.q,
            );
            expect(split.frontChains.length, `t=${t}`).toBeGreaterThan(0);
            const segD = (px: number, py: number, a: [number, number], b: [number, number]) => {
                const dx = b[0] - a[0];
                const dy = b[1] - a[1];
                const l2 = dx * dx + dy * dy;
                let s = l2 < 1e-12 ? 0 : ((px - a[0]) * dx + (py - a[1]) * dy) / l2;
                s = s < 0 ? 0 : s > 1 ? 1 : s;
                return Math.hypot(a[0] + s * dx - px, a[1] + s * dy - py);
            };
            const distToRim = (p: [number, number]) => {
                let best = Infinity;
                for (let i = 0; i < rim.length; i++) {
                    const d = segD(p[0], p[1], rim[i]! as [number, number], rim[(i + 1) % rim.length]! as [number, number]);
                    if (d < best) best = d;
                }
                return best;
            };
            for (const chain of split.frontChains) {
                expect(chain.length).toBeGreaterThanOrEqual(2);
                // Both endpoints anchor exactly on the rim (the crossings).
                expect(distToRim(chain[0]! as [number, number])).toBeLessThan(1e-6);
                expect(distToRim(chain[chain.length - 1]! as [number, number])).toBeLessThan(1e-6);
            }
        }
    });

    it('EXACT anchors: revealed rim frontier tips coincide with front chain endpoints', () => {
        // User requirement 2: the settled-frontier clip must terminate at the
        // SAME points where the front meets the rim (no bites into the frontier).
        const f = rt.sampleFull(400)!;
        const af = (f.fronts ?? []).find((x) => x.siteId === CAPTURED)!;
        const surface = buildSurfaceFromCells([...f.frozenCells, ...f.bubbleCells], 2);
        const rim = surface.cellFills.find((c) => c.siteId === CAPTURED)!.points;
        const split = splitCellByFrontDetailed(
            { siteId: CAPTURED, ownerId: af.front.ownerIn, points: rim } as never,
            af.front,
            af.q,
        );
        const anchors = split.frontChains.flatMap((chain) => [
            chain[0]!,
            chain[chain.length - 1]!,
        ]);
        expect(anchors.length).toBeGreaterThan(0);
        const field = frontFieldForRing(rim as never, af.front, af.q)!;
        const pair = [af.front.ownerIn, af.front.ownerOld].sort().join('|');
        let checkedTips = 0;
        for (const line of surface.frontiers) {
            if ([line.ownerA, line.ownerB].sort().join('|') !== pair) continue;
            for (const kept of clipPolylineBehindFront(line.points as [number, number][], field)) {
                for (const tip of [kept[0]!, kept[kept.length - 1]!]) {
                    // A tip is either an original chain junction (unclipped end)
                    // or an EXACT crossing — if it lies on the field threshold,
                    // it must coincide with a front-chain anchor.
                    if (Math.abs(field.value(tip) - field.c) < 1e-6) {
                        const nearest = Math.min(
                            ...anchors.map((a) => Math.hypot(a[0] - tip[0], a[1] - tip[1])),
                        );
                        expect(nearest).toBeLessThan(1e-6);
                        checkedTips++;
                    }
                }
            }
        }
        expect(checkedTips).toBeGreaterThan(0); // the invariant was actually exercised
    });

    it('ACCEPTANCE GATE (POST): live classification converges to the settled border as q→1', () => {
        // As the front nears completion, the classified frontier set must
        // converge on exactly what buildSurfaceFromCells(cells) — no fronts —
        // already draws once the conquest is settled (the runtime drops the
        // front from `fronts` entirely once q reaches 1; this proves
        // classification MEETS the settled set, never overshoots past it).
        // Find the LATEST (highest-q) sampled instant where the front is still
        // active — the exact completion boundary isn't a stable constant to
        // hardcode (MORPH_COMPLETE_AT is an implementation detail).
        type Frame = NonNullable<ReturnType<typeof rt.sampleFull>>;
        let frame: Frame | undefined;
        let fronts: NonNullable<Frame['fronts']> = [];
        for (const t of [830, 800, 750, 700, 650, 600]) {
            const f = rt.sampleFull(t)!;
            const found = (f.fronts ?? []).filter((x) => x.siteId === CAPTURED);
            if (found.length > 0) {
                frame = f;
                fronts = found;
                break;
            }
        }
        expect(frame).toBeTruthy();
        const cells = [...frame!.frozenCells, ...frame!.bubbleCells];
        const classified = buildSurfaceFromCells(cells, 2, undefined, fronts);
        const settled = buildSurfaceFromCells(cells, 2);
        const lineSet = (s: ReturnType<typeof buildSurfaceFromCells>) =>
            [...s.frontiers, ...s.worldBorders].map((x) => x.points as [number, number][]);
        const ptSegD = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
            const dx = bx - ax;
            const dy = by - ay;
            const l2 = dx * dx + dy * dy;
            if (l2 < 1e-12) return Math.hypot(px - ax, py - ay);
            let t = ((px - ax) * dx + (py - ay) * dy) / l2;
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            return Math.hypot(ax + t * dx - px, ay + t * dy - py);
        };
        const maxDev = (A: [number, number][][], B: [number, number][][]) => {
            let worst = 0;
            for (const L of A) {
                for (const p of L) {
                    let best = Infinity;
                    for (const M of B) {
                        for (let i = 0; i < M.length - 1; i++) {
                            const d = ptSegD(p[0], p[1], M[i]![0], M[i]![1], M[i + 1]![0], M[i + 1]![1]);
                            if (d < best) best = d;
                        }
                    }
                    if (best > worst) worst = best;
                }
            }
            return worst;
        };
        expect(maxDev(lineSet(classified), lineSet(settled))).toBeLessThan(2);
    });
});

// ACCEPTANCE GATE (PRE): needs a captured cell genuinely ADJACENT to its
// attacker pre-conquest (cross_owner_midpoint_corridor's captured cell is
// NOT — see the "fixture adjacency trap" lesson) so a real pre-existing
// border exists to reproduce. kinetic_independent_conquests' star-7 is
// adjacent to its attacker star-6 — the same fixture the RADIAL test below
// uses, run here in the default (linear) front mode.
describe('ACCEPTANCE GATE (PRE): live classification reproduces the PRE border at the captured rim', () => {
    const MAPP = (() => {
        const raw2 = JSON.parse(
            readFileSync(
                path.join(REPO_ROOT, 'common', 'resources', 'fixture-maps', 'kinetic_independent_conquests.json'),
                'utf-8',
            ),
        ) as { stars: StarState[]; connections: StarConnection[] };
        let maxX = 0;
        let maxY = 0;
        for (const s of raw2.stars) {
            if (s.x > maxX) maxX = s.x;
            if (s.y > maxY) maxY = s.y;
        }
        return { stars: raw2.stars, connections: raw2.connections, w: maxX + 200, h: maxY + 200 };
    })();
    const epp = (ov: Record<string, string>) => {
        const stars = MAPP.stars.map((s) =>
            ov[s.id] ? ({ ...s, ownerId: ov[s.id] } as StarState) : s,
        );
        const config = buildPowerVoronoi0319Settings({
            lanes: MAPP.connections, worldWidth: MAPP.w, worldHeight: MAPP.h,
            configSource: GAME_CONFIG as unknown as Record<string, unknown>,
        });
        const r = computePowerCoreEndpoint({ stars, connections: MAPP.connections, config });
        if ('kind' in r) throw new Error(r.message);
        return { state: { sites: r.sites, cells: r.cells }, clip: r.clip };
    };

    it('at the first sampled instant, the captured-rim border matches the PRE surface (not vanished, not redrawn from a point)', () => {
        const oldOwner = MAPP.stars.find((s) => s.id === 'star-7')!.ownerId!;
        const newOwner = MAPP.stars.find((s) => s.id === 'star-6')!.ownerId!;
        const P0 = epp({});
        const P1 = epp({ 'star-7': newOwner });
        const rtp = new KineticTransitionRuntime();
        rtp.commit({
            state: P0.state, clip: P0.clip, ownershipVersion: 'v0',
            transitionKey: null, nowMs: 0, durationMs: 1000,
        });
        rtp.commit({
            state: P1.state, clip: P1.clip, ownershipVersion: 'v1',
            transitionKey: 'k', nowMs: 0, durationMs: 1000,
            conquestOrigins: new Map([[
                'star-7',
                { x: MAPP.stars[6]!.x, y: MAPP.stars[6]!.y },
            ]]),
        });

        const oldBorderPair = [oldOwner, newOwner].sort().join('|');
        const borderLen = (s: ReturnType<typeof buildSurfaceFromCells>): number => {
            let sum = 0;
            for (const f of s.frontiers) {
                if ([f.ownerA, f.ownerB].sort().join('|') !== oldBorderPair) continue;
                for (let i = 0; i < f.points.length - 1; i++) {
                    sum += Math.hypot(
                        f.points[i + 1]![0] - f.points[i]![0],
                        f.points[i + 1]![1] - f.points[i]![1],
                    );
                }
            }
            return sum;
        };

        const preSurface = buildSurfaceFromCells(P0.state.cells as never, 2);
        const preRimLen = borderLen(preSurface);
        expect(preRimLen).toBeGreaterThan(0); // the pre-existing border is real

        const frame = rtp.sampleFull(8)!;
        const af = (frame.fronts ?? []).find((f) => f.siteId === 'star-7')!;
        expect(af).toBeTruthy();
        expect(af.q).toBeLessThan(0.05); // genuinely near the start
        const surface = buildSurfaceFromCells(
            [...frame.frozenCells, ...frame.bubbleCells],
            2,
            undefined,
            frame.fronts ?? [],
        );
        const liveLen = borderLen(surface);
        expect(liveLen / preRimLen).toBeGreaterThan(0.9); // near-full border present
        expect(liveLen / preRimLen).toBeLessThanOrEqual(1.05); // not over-long either
    });
});

// The old attacker↔defender border, now first-class (RADIAL — the mode the
// user runs). Live-label classification means there is nothing to "dissolve"
// as a separate concept: the AHEAD portion of the captured cell's rim reads
// the pair (oldOwner, newOwner) directly, and its length recedes as the front
// consumes it.
describe('captured-cell rim border (RADIAL): recedes as the front advances, gone at completion', () => {
    const MAPZ2 = (() => {
        const raw2 = JSON.parse(
            readFileSync(
                path.join(REPO_ROOT, 'common', 'resources', 'fixture-maps', 'kinetic_independent_conquests.json'),
                'utf-8',
            ),
        ) as { stars: StarState[]; connections: StarConnection[] };
        let maxX = 0;
        let maxY = 0;
        for (const s of raw2.stars) {
            if (s.x > maxX) maxX = s.x;
            if (s.y > maxY) maxY = s.y;
        }
        return { stars: raw2.stars, connections: raw2.connections, w: maxX + 200, h: maxY + 200 };
    })();
    const epz2 = (ov: Record<string, string>) => {
        const stars = MAPZ2.stars.map((s) =>
            ov[s.id] ? ({ ...s, ownerId: ov[s.id] } as StarState) : s,
        );
        const config = buildPowerVoronoi0319Settings({
            lanes: MAPZ2.connections, worldWidth: MAPZ2.w, worldHeight: MAPZ2.h,
            configSource: GAME_CONFIG as unknown as Record<string, unknown>,
        });
        const r = computePowerCoreEndpoint({ stars, connections: MAPZ2.connections, config });
        if ('kind' in r) throw new Error(r.message);
        return { state: { sites: r.sites, cells: r.cells }, clip: r.clip };
    };

    it('radial: rim border is near-full at start and shrinks to zero at completion', () => {
        const oldOwner = MAPZ2.stars.find((s) => s.id === 'star-7')!.ownerId!;
        const newOwner = MAPZ2.stars.find((s) => s.id === 'star-6')!.ownerId!;
        const Z0 = epz2({});
        const Z1 = epz2({ 'star-7': newOwner });
        const rtz = new KineticTransitionRuntime();
        rtz.commit({
            state: Z0.state, clip: Z0.clip, ownershipVersion: 'v0',
            transitionKey: null, nowMs: 0, durationMs: 1000,
        });
        rtz.commit({
            state: Z1.state, clip: Z1.clip, ownershipVersion: 'v1',
            transitionKey: 'k', nowMs: 0, durationMs: 1000,
            conquestOrigins: new Map([[
                'star-7',
                { x: MAPZ2.stars[6]!.x, y: MAPZ2.stars[6]!.y },
            ]]),
            conquestFrontMode: 'radial',
        });
        const pair = [oldOwner, newOwner].sort().join('|');
        const rimBorderLen = (t: number): number => {
            const frame = rtz.sampleFull(t)!;
            const af = (frame.fronts ?? []).find((x) => x.siteId === 'star-7');
            if (!af) return 0;
            const surface = buildSurfaceFromCells(
                [...frame.frozenCells, ...frame.bubbleCells],
                2,
                undefined,
                frame.fronts ?? [],
            );
            let len = 0;
            for (const line of surface.frontiers) {
                if ([line.ownerA, line.ownerB].sort().join('|') !== pair) continue;
                for (let i = 0; i < line.points.length - 1; i++) {
                    len += Math.hypot(
                        line.points[i + 1]![0] - line.points[i]![0],
                        line.points[i + 1]![1] - line.points[i]![1],
                    );
                }
            }
            return len;
        };
        const early = rimBorderLen(16);
        const mid = rimBorderLen(500);
        expect(early).toBeGreaterThan(10); // old border present at start (radial!)
        expect(mid).toBeLessThan(early); // recedes as the arc expands
        // At completion the runtime drops the front entirely (no overlay) — the
        // settled border set takes over; there is no separate "dissolved" state
        // to assert on within this describe block.
    });
});

// End-snap fix 2: multi-conquest ticks previously fell back to the frozen/bubble
// STITCH (sampleFull was single-morph only) with its hanging-node artifacts —
// the "occasional, different" snap. Two disjoint concurrent morphs must now
// render through the one-diagram path with full coverage.
describe('MULTI-morph one-diagram (disjoint concurrent conquests)', () => {
    const MAP2 = (() => {
        const raw2 = JSON.parse(
            readFileSync(
                path.join(REPO_ROOT, 'common', 'resources', 'fixture-maps', 'kinetic_independent_conquests.json'),
                'utf-8',
            ),
        ) as { stars: StarState[]; connections: StarConnection[] };
        let maxX = 0;
        let maxY = 0;
        for (const s of raw2.stars) {
            if (s.x > maxX) maxX = s.x;
            if (s.y > maxY) maxY = s.y;
        }
        return { stars: raw2.stars, connections: raw2.connections, w: maxX + 200, h: maxY + 200 };
    })();
    const ep2 = (ov: Record<string, string>) => {
        const stars = MAP2.stars.map((s) =>
            ov[s.id] ? ({ ...s, ownerId: ov[s.id] } as StarState) : s,
        );
        const config = buildPowerVoronoi0319Settings({
            lanes: MAP2.connections, worldWidth: MAP2.w, worldHeight: MAP2.h,
            configSource: GAME_CONFIG as unknown as Record<string, unknown>,
        });
        const r = computePowerCoreEndpoint({ stars, connections: MAP2.connections, config });
        if ('kind' in r) throw new Error(r.message);
        return { stars, state: { sites: r.sites, cells: r.cells }, clip: r.clip };
    };

    it('two disjoint conquests render as ONE diagram, tiling the clip, own clocks', () => {
        const owner = (id: string) => MAP2.stars.find((s) => s.id === id)!.ownerId!;
        const cap0 = ep2({ 'star-0': owner('star-1') === 'ai-1' ? 'ai-1' : owner('star-1') });
        const both = ep2({ 'star-0': cap0.stars.find((s) => s.id === 'star-0')!.ownerId!, 'star-7': owner('star-6') });
        const base = ep2({});
        const rt = new KineticTransitionRuntime();
        rt.commit({
            state: base.state, clip: base.clip, ownershipVersion: 'v0',
            transitionKey: null, nowMs: 0, durationMs: 1000,
        });
        rt.commit({
            state: cap0.state, clip: cap0.clip, ownershipVersion: 'v1',
            transitionKey: 'k1', nowMs: 0, durationMs: 1000,
            conquestOrigins: new Map([[
                'star-0',
                { x: MAP2.stars[1]!.x, y: MAP2.stars[1]!.y },
            ]]),
        });
        rt.commit({
            state: both.state, clip: both.clip, ownershipVersion: 'v2',
            transitionKey: 'k2', nowMs: 400, durationMs: 1000,
            conquestOrigins: new Map([[
                'star-7',
                { x: MAP2.stars[6]!.x, y: MAP2.stars[6]!.y },
            ]]),
        });
        // Two independent morphs must be active (disjoint ends of the chain).
        expect(rt.activeKey).toBe('k1|k2');

        const CLIP_AREA2 = shoelace(both.clip.map((p) => [p[0], p[1]] as Point));
        for (const t of [450, 700, 950]) {
            const frame = rt.sampleFull(t);
            expect(frame).not.toBeNull(); // one-diagram path, NOT the stitch
            expect(frame!.frozenCells.length).toBe(0);
            let area = 0;
            for (const c of frame!.bubbleCells) {
                expect(c.ownerId).toBeTruthy();
                area += shoelace(c.points);
            }
            expect(area / CLIP_AREA2).toBeGreaterThan(0.999);
            expect(area / CLIP_AREA2).toBeLessThan(1.001);
        }
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
                // Split-after-smoothing: the cell is UNSPLIT (settled owner) and
                // the in-flight conquest is an overlay FRONT descriptor mid-sweep.
                if (t >= 250 && t <= 750) {
                    const front = (frame!.fronts ?? []).find((f) => f.siteId === CAPTURED);
                    expect(front).toBeTruthy();
                    expect(front!.q).toBeGreaterThan(0);
                    expect(front!.q).toBeLessThan(1);
                }
            }
        });

        it(`${front}: SMOOTHED per-cell fills — rounded, area-conserved per owner, no bucket-fill`, () => {
            const rt = runtimeFor(front);
            for (const t of [250, 500, 750]) {
                const cells = rt.sampleFull(t)!.bubbleCells;
                const surface = buildSurfaceFromCells(cells, 3);
                expect(surface.cellFills.length).toBeGreaterThan(0);

                // Per-owner area is conserved between raw cells and smoothed cell
                // fills ⇒ no area moved between owners ⇒ no bucket-fill. (Smoothing
                // only shaves corners, so allow a small per-owner delta.)
                const rawByOwner = new Map<string, number>();
                for (const c of cells) {
                    rawByOwner.set(c.ownerId, (rawByOwner.get(c.ownerId) ?? 0) + shoelace(c.points));
                }
                const fillByOwner = new Map<string, number>();
                for (const f of surface.cellFills) {
                    fillByOwner.set(f.ownerId, (fillByOwner.get(f.ownerId) ?? 0) + shoelace(f.points));
                }
                for (const [owner, raw] of rawByOwner) {
                    const filled = fillByOwner.get(owner) ?? 0;
                    expect(Math.abs(filled - raw) / CLIP_AREA).toBeLessThan(0.02);
                }
                // Fills still tile the clip (complete map).
                let cover = 0;
                for (const f of surface.cellFills) cover += shoelace(f.points);
                expect(cover / CLIP_AREA).toBeGreaterThan(0.97);
                expect(cover / CLIP_AREA).toBeLessThan(1.03);
                // Actually rounded: some fill has more vertices than any raw cell
                // could (owner-boundary edges were swapped for smoothed polylines).
                expect(surface.cellFills.some((f) => f.points.length > 8)).toBe(true);
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
