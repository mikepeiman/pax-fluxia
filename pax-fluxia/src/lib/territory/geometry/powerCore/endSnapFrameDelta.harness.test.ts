/**
 * endSnapFrameDelta.harness.test.ts — PERMANENT measurement harness for the
 * end-of-transition BORDER SNAP.
 *
 * WHY THIS EXISTS (read before touching): two prior diagnoses of this snap were
 * WRONG because they measured "deviation from the settled state" — a metric that
 * conflates the morph's legitimate convergence with the one-frame POP the user
 * actually sees. This harness measures the RIGHT thing: the maximum border
 * displacement between CONSECUTIVE RENDERED FRAMES, reproduced through the exact
 * production assembly each frame uses, across the whole timeline INCLUDING the
 * retirement boundary (last morph frame → first idle frame). The frame-pair with
 * the largest displacement IS the snap; a decomposition then NAMES its mechanism.
 *
 * Reproduces the user's stated case: arena-further, star-13 (ai-5) conquers
 * star-7 (human-player). star-7's cell borders ai-4 (star-8) — so the pre-conquest
 * human|ai-4 segment becomes an ai-5|ai-4 victor-boundary: the user's stated WORST
 * case ("third-party borders that become victor-boundaries after conquest").
 *
 * PRODUCTION FIDELITY (the thing the last harness got wrong):
 *  - MORPH frame render = buildSurfaceFromCells(frozen+bubble, passes)  ← conforms
 *    the split crossings, exactly like PowerVectorFamily's morph branch.
 *  - IDLE frame render   = buildPowerCoreAuthoritySnapshot(stars)        ← the idle
 *    branch PowerVectorFamily draws once the runtime retires.
 *  These are DIFFERENT assembly paths for the same settled geometry; the retirement
 *  frame switches from the first to the second in one frame.
 *
 * DECOMPOSITION (isolates which of the live hypotheses is real):
 *  A  snap magnitude  — max per-owner-pair Hausdorff over consecutive production
 *                       frames; report where it lands & whether it straddles retire.
 *  B  pipeline-switch — buildSurfaceFromCells(S1.cells) vs authoritySnapshot(S1):
 *                       two assembly paths, IDENTICAL settled cells. What you'd see
 *                       at retirement even if the morph converged perfectly.
 *  C  convergence     — last morph frame vs buildSurfaceFromCells(S1.cells): SAME
 *                       path, morph-endpoint vs true-settled. Isolates a sliver /
 *                       split-topology that survives to the last drawn frame.
 *  D  smoothing amp   — at the last morph frame, raw(passes=0) delta vs smoothed
 *                       delta. If smoothed >> raw, smoothing amplifies a sub-pixel
 *                       raw difference (topology-driven corner-cut at a vanishing pin).
 *
 * Run at BOTH morphCompleteAt = 0.92 (default: sweep finishes early, split gone
 * before retirement) AND 1.0 (the user's target: split survives to the last frame),
 * because the slider changes which mechanism is live at the boundary.
 *
 * This file MUST NOT be deleted after diagnosis. Its assertions lock in the
 * mechanism so a fix is provable and a regression is caught.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarConnection, StarState } from '$lib/types/game.types';
import {
    buildPowerCoreAuthoritySnapshot,
    computePowerCoreEndpoint,
} from './buildPowerCoreAuthoritySnapshot';
import { buildPowerVoronoi0319Settings } from '../../families/buildFamilyGeometry';
import { buildSurfaceFromCells } from './buildSurfaceFromCells';
import { KineticTransitionRuntime } from './kineticTransitionRuntime';
import { setMorphCompleteAt, getMorphCompleteAt } from './sampleKineticFrame';
import type { KineticEndpointState } from './kineticTypes';

// ---------------------------------------------------------------------------
// Map + scenario (the user's real reproduction case)
// ---------------------------------------------------------------------------

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..', '..', '..');

function loadArenaFurther() {
    const raw = JSON.parse(
        readFileSync(
            path.join(REPO_ROOT, 'common', 'resources', 'saved-maps', 'arena-further.json'),
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

const MAP = loadArenaFurther();
const CAPTURED = 'star-7'; // human-player, green-type
const ATTACKER = 'star-13'; // ai-5
const NEW_OWNER = MAP.stars.find((s) => s.id === ATTACKER)!.ownerId!; // ai-5
const OLD_OWNER = MAP.stars.find((s) => s.id === CAPTURED)!.ownerId!; // human-player
const ATTACKER_POS = MAP.stars.find((s) => s.id === ATTACKER)!;

const CONFIG = buildPowerVoronoi0319Settings({
    lanes: MAP.connections,
    worldWidth: MAP.w,
    worldHeight: MAP.h,
    configSource: GAME_CONFIG as unknown as Record<string, unknown>,
});
const PASSES = CONFIG.chaikinPasses;

function endpointFor(ownerOverride: Record<string, string>): {
    stars: StarState[];
    state: KineticEndpointState;
    clip: [number, number][];
} {
    const stars = MAP.stars.map((s) =>
        ownerOverride[s.id] ? ({ ...s, ownerId: ownerOverride[s.id] } as StarState) : s,
    );
    const r = computePowerCoreEndpoint({ stars, connections: MAP.connections, config: CONFIG });
    if ('kind' in r) throw new Error(r.message);
    return { stars, state: { sites: r.sites, cells: r.cells }, clip: r.clip };
}

const S0 = endpointFor({});
const S1 = endpointFor({ [CAPTURED]: NEW_OWNER });
const CONQUEST_ORIGINS = new Map([[CAPTURED, { x: ATTACKER_POS.x, y: ATTACKER_POS.y }]]);

// ---------------------------------------------------------------------------
// Border extraction — normalize BOTH render paths to Map<pairKey, polylines>.
// ---------------------------------------------------------------------------

type Poly = readonly (readonly [number, number])[];
type BorderMap = Map<string, Poly[]>;

function pairKey(a: string, b: string): string {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** MORPH render path: exactly PowerVectorFamily's morph branch. */
function bordersFromCells(cells: KineticEndpointState['cells'], passes: number): BorderMap {
    const surface = buildSurfaceFromCells(cells, passes);
    const out: BorderMap = new Map();
    const push = (a: string, b: string, pts: Poly) => {
        const k = pairKey(a, b);
        const bucket = out.get(k);
        if (bucket) bucket.push(pts);
        else out.set(k, [pts]);
    };
    for (const f of surface.frontiers) push(f.ownerA, f.ownerB, f.points);
    for (const w of surface.worldBorders) push(w.ownerA, w.ownerB, w.points);
    return out;
}

/** IDLE render path: exactly PowerVectorFamily's idle branch (authority snapshot). */
function bordersFromIdleSnapshot(stars: StarState[]): BorderMap {
    const snap = buildPowerCoreAuthoritySnapshot({
        stars,
        connections: MAP.connections,
        config: CONFIG,
        ownershipVersion: 'idle',
        sourceStyle: 'vector',
    });
    if ('kind' in snap) throw new Error(snap.message);
    const out: BorderMap = new Map();
    const push = (a: string, b: string, pts: Poly) => {
        const k = pairKey(a, b);
        const bucket = out.get(k);
        if (bucket) bucket.push(pts);
        else out.set(k, [pts]);
    };
    for (const f of snap.frontierPolylines) push(f.ownerA, f.ownerB, f.points);
    for (const w of snap.worldBorderPolylines) push(w.ownerA, w.ownerB, w.points);
    return out;
}

// ---------------------------------------------------------------------------
// Displacement metric — per-owner-pair symmetric Hausdorff (densified).
// A border that shifts by d px shows up as d; a border that only re-parametrizes
// (same curve, different vertex spacing) shows up as ~0. Pairs present on only
// one side are reported separately (appear/disappear, not a shift).
// ---------------------------------------------------------------------------

function distPointToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    return Math.hypot(px - cx, py - cy);
}

/** Min distance from point to a set of polylines. */
function distPointToPolys(px: number, py: number, polys: Poly[]): number {
    let best = Infinity;
    for (const poly of polys) {
        for (let i = 0; i + 1 < poly.length; i++) {
            const d = distPointToSeg(px, py, poly[i]![0], poly[i]![1], poly[i + 1]![0], poly[i + 1]![1]);
            if (d < best) best = d;
        }
    }
    return best;
}

/** Densify a polyline set to ~step-px sample points. */
function sample(polys: Poly[], step: number): [number, number][] {
    const out: [number, number][] = [];
    for (const poly of polys) {
        for (let i = 0; i + 1 < poly.length; i++) {
            const [ax, ay] = poly[i]!;
            const [bx, by] = poly[i + 1]!;
            const segLen = Math.hypot(bx - ax, by - ay);
            const n = Math.max(1, Math.ceil(segLen / step));
            for (let k = 0; k < n; k++) {
                const t = k / n;
                out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
            }
        }
        if (poly.length > 0) out.push([poly[poly.length - 1]![0], poly[poly.length - 1]![1]]);
    }
    return out;
}

function directedHausdorff(from: Poly[], to: Poly[], step: number): number {
    if (to.length === 0) return 0;
    let max = 0;
    for (const [px, py] of sample(from, step)) {
        const d = distPointToPolys(px, py, to);
        if (d > max) max = d;
    }
    return max;
}

interface PairDelta {
    key: string;
    hausdorff: number;
    onlyIn: 'both' | 'A' | 'B';
}

/** Per-owner-pair symmetric Hausdorff between two border maps. */
function borderDelta(a: BorderMap, b: BorderMap, step = 2): PairDelta[] {
    const keys = new Set([...a.keys(), ...b.keys()]);
    const out: PairDelta[] = [];
    for (const key of keys) {
        const pa = a.get(key);
        const pb = b.get(key);
        if (pa && pb) {
            const h = Math.max(directedHausdorff(pa, pb, step), directedHausdorff(pb, pa, step));
            out.push({ key, hausdorff: h, onlyIn: 'both' });
        } else {
            out.push({ key, hausdorff: Infinity, onlyIn: pa ? 'A' : 'B' });
        }
    }
    out.sort((x, y) => (y.hausdorff === Infinity ? 1 : y.hausdorff) - (x.hausdorff === Infinity ? 1 : x.hausdorff));
    return out;
}

/** Max finite Hausdorff over pairs present on BOTH sides (a genuine SHIFT). */
function maxBothDelta(deltas: PairDelta[]): { key: string; d: number } {
    let best = { key: '(none)', d: 0 };
    for (const pd of deltas) {
        if (pd.onlyIn === 'both' && pd.hausdorff > best.d) best = { key: pd.key, d: pd.hausdorff };
    }
    return best;
}

function isThirdPartyPair(key: string): boolean {
    // A victor-boundary that did NOT involve the victor before conquest — i.e. a
    // pair containing NEW_OWNER but whose partner is neither NEW_OWNER nor 'world'
    // and (the striking case) not the OLD_OWNER either.
    const [a, b] = key.split('|');
    if (a !== NEW_OWNER && b !== NEW_OWNER) return false;
    const other = a === NEW_OWNER ? b : a;
    return other !== 'world' && other !== OLD_OWNER && other !== NEW_OWNER;
}

// ---------------------------------------------------------------------------
// Timeline reproduction — step the runtime exactly as the game loop does.
// ---------------------------------------------------------------------------

const DURATION = 1000;

interface Frame {
    nowMs: number;
    p: number;
    retired: boolean;
    borders: BorderMap;
    rawBorders: BorderMap;
}

function runTimeline(morphCompleteAt: number, fps = 60): Frame[] {
    setMorphCompleteAt(morphCompleteAt);
    const rt = new KineticTransitionRuntime();
    rt.commit({
        state: S0.state, clip: S0.clip, ownershipVersion: 'v0',
        transitionKey: null, nowMs: 0, durationMs: DURATION,
    });
    rt.commit({
        state: S1.state, clip: S1.clip, ownershipVersion: 'v1',
        transitionKey: 'sess:star-7:human-player:ai-5', nowMs: 0, durationMs: DURATION,
        conquestOrigins: CONQUEST_ORIGINS, conquestFrontMode: 'radial',
    });

    const dt = 1000 / fps;
    const frames: Frame[] = [];
    // Step to just past retirement so we capture last-morph → first-idle.
    for (let nowMs = 0; nowMs <= DURATION + 2 * dt; nowMs += dt) {
        const frame = rt.sampleFull(nowMs);
        if (frame) {
            const cells = [...frame.frozenCells, ...frame.bubbleCells];
            frames.push({
                nowMs, p: frame.p, retired: false,
                borders: bordersFromCells(cells, PASSES),
                rawBorders: bordersFromCells(cells, 0),
            });
        } else {
            frames.push({
                nowMs, p: 1, retired: true,
                borders: bordersFromIdleSnapshot(S1.stars),
                rawBorders: bordersFromIdleSnapshot(S1.stars), // idle path has no raw variant; same
            });
        }
    }
    setMorphCompleteAt(getMorphCompleteAt()); // (no-op; documents we don't leak state)
    return frames;
}

function report(title: string, lines: string[]): void {
    // eslint-disable-next-line no-console
    console.log(`\n===== ${title} =====\n${lines.join('\n')}`);
}

// ---------------------------------------------------------------------------
// The measurement
// ---------------------------------------------------------------------------

describe('END-SNAP frame-delta harness (arena-further star-13 → star-7)', () => {
    it('scenario sanity: the conquest creates an ai-5|ai-4 third-party victor-boundary', () => {
        const before = bordersFromIdleSnapshot(S0.stars);
        const after = bordersFromIdleSnapshot(S1.stars);
        const tpAfter = [...after.keys()].filter(isThirdPartyPair);
        report('SCENARIO', [
            `captured=${CAPTURED} old=${OLD_OWNER} new=${NEW_OWNER} passes=${PASSES}`,
            `owner-pairs BEFORE: ${[...before.keys()].sort().join(', ')}`,
            `owner-pairs AFTER : ${[...after.keys()].sort().join(', ')}`,
            `third-party victor-boundaries AFTER: ${tpAfter.join(', ') || '(none)'}`,
        ]);
        expect(NEW_OWNER).toBe('ai-5');
        expect(OLD_OWNER).toBe('human-player');
    });

    for (const mca of [0.92, 1.0]) {
        it(`morphCompleteAt=${mca}: measures the snap + decomposition`, () => {
            const frames = runTimeline(mca);

            // ── A: snap magnitude across consecutive production frames ──────────
            let worst = { i: -1, d: 0, key: '(none)', straddlesRetire: false };
            const perPairAcrossRetire: PairDelta[] = [];
            for (let i = 0; i + 1 < frames.length; i++) {
                const f0 = frames[i]!;
                const f1 = frames[i + 1]!;
                const deltas = borderDelta(f0.borders, f1.borders);
                const m = maxBothDelta(deltas);
                const straddle = !f0.retired && f1.retired;
                if (straddle) perPairAcrossRetire.push(...deltas);
                if (m.d > worst.d) {
                    worst = { i, d: m.d, key: m.key, straddlesRetire: straddle };
                }
            }
            const retireIdx = frames.findIndex((f) => f.retired);
            const lastMorph = frames[retireIdx - 1]!;
            const firstIdle = frames[retireIdx]!;

            // ── B: pipeline-switch on IDENTICAL settled cells ───────────────────
            const bDeltas = borderDelta(bordersFromCells(S1.state.cells, PASSES), bordersFromIdleSnapshot(S1.stars));
            const bMax = maxBothDelta(bDeltas);

            // ── C: last morph frame vs true-settled, SAME assembly path ─────────
            const cDeltas = borderDelta(lastMorph.borders, bordersFromCells(S1.state.cells, PASSES));
            const cMax = maxBothDelta(cDeltas);

            // ── D: smoothing amplification at the last morph frame ──────────────
            const dRaw = maxBothDelta(borderDelta(lastMorph.rawBorders, bordersFromCells(S1.state.cells, 0)));
            const dSmooth = cMax;

            // Retirement-pair breakdown by owner-pair (both-present shifts only).
            const retireBoth = perPairAcrossRetire
                .filter((p) => p.onlyIn === 'both')
                .sort((a, b) => b.hausdorff - a.hausdorff)
                .slice(0, 8);
            const retireOnly = perPairAcrossRetire.filter((p) => p.onlyIn !== 'both');

            report(`morphCompleteAt=${mca}`, [
                `frames=${frames.length} retireIdx=${retireIdx} lastMorph.p=${lastMorph.p.toFixed(4)}`,
                ``,
                `A  WORST consecutive-frame snap = ${worst.d.toFixed(2)}px on pair ${worst.key}`,
                `   at frame-pair ${worst.i}->${worst.i + 1} (p ${frames[worst.i]!.p.toFixed(3)}->${frames[worst.i + 1]!.p.toFixed(3)}) straddlesRetire=${worst.straddlesRetire}`,
                ``,
                `   retirement pair (last-morph p=${lastMorph.p.toFixed(4)} -> first-idle):`,
                ...retireBoth.map((p) => `     ${p.hausdorff.toFixed(2)}px  ${p.key}${isThirdPartyPair(p.key) ? '  <-- THIRD-PARTY' : ''}`),
                retireOnly.length ? `     appear/disappear at retire: ${retireOnly.map((p) => p.key).join(', ')}` : `     (no pairs appear/disappear at retire)`,
                ``,
                `B  pipeline-switch (buildSurfaceFromCells(S1) vs authoritySnapshot(S1), identical cells) = ${bMax.d.toFixed(2)}px on ${bMax.key}`,
                `   top B pairs: ${bDeltas.filter((p) => p.onlyIn === 'both').slice(0, 5).map((p) => `${p.key}:${p.hausdorff.toFixed(1)}`).join('  ')}`,
                `   B only-in-one: ${bDeltas.filter((p) => p.onlyIn !== 'both').map((p) => `${p.key}(${p.onlyIn})`).join(', ') || '(none)'}`,
                ``,
                `C  convergence (last-morph vs settled, SAME path) = ${cMax.d.toFixed(2)}px on ${cMax.key}`,
                `D  smoothing amp @last-morph: raw=${dRaw.d.toFixed(2)}px  smoothed=${dSmooth.d.toFixed(2)}px  (ratio ${dRaw.d > 0 ? (dSmooth.d / dRaw.d).toFixed(1) : 'inf'})`,
            ]);

            // ── SERIES: is the active-frontier delta a SMOOTH bump or a terminal
            //    SPIKE? For each conquest-relevant pair, print the per-frame-pair
            //    delta across the whole sweep. A smoothstep sweep decelerates, so a
            //    LEGITIMATE motion has its final step ≈ 0; a SNAP is a step far above
            //    its neighbours (esp. the last nonzero one). ──────────────────────
            const seriesPairs = ['ai-5|human-player', 'ai-3|ai-5', 'ai-4|ai-5'];
            const seriesLines: string[] = [];
            for (const key of seriesPairs) {
                const series: number[] = [];
                for (let i = 0; i + 1 < frames.length; i++) {
                    const a = frames[i]!.borders.get(key);
                    const b = frames[i + 1]!.borders.get(key);
                    if (!a || !b) { series.push(-1); continue; } // -1 = absent one side
                    series.push(Math.max(directedHausdorff(a, b, 2), directedHausdorff(b, a, 2)));
                }
                const finite = series.filter((v) => v >= 0);
                const peak = Math.max(...finite);
                const peakIdx = series.indexOf(peak);
                // "final nonzero step" — the last frame-pair where this border still moved > 0.25px.
                let lastMove = -1;
                for (let i = series.length - 1; i >= 0; i--) {
                    if (series[i]! > 0.25) { lastMove = i; break; }
                }
                const median =
                    finite.length > 0
                        ? [...finite].sort((a, b) => a - b)[Math.floor(finite.length / 2)]!
                        : 0;
                seriesLines.push(
                    `  ${key}${isThirdPartyPair(key) ? ' (3rd-party)' : ' (active front)'}: peak=${peak.toFixed(2)}px @pair ${peakIdx} (p≈${frames[peakIdx]?.p.toFixed(3)}) median=${median.toFixed(2)} spikeRatio=${median > 0 ? (peak / median).toFixed(1) : '∞'}`,
                );
                // last 12 steps, so a terminal spike is visible against its neighbours.
                const tail = series
                    .slice(Math.max(0, series.length - 14))
                    .map((v, j) => {
                        const idx = Math.max(0, series.length - 14) + j;
                        return `${frames[idx]?.p.toFixed(3)}:${v < 0 ? '—' : v.toFixed(1)}`;
                    });
                seriesLines.push(`    tail[p:Δpx] ${tail.join('  ')}  lastMove@pair ${lastMove} (p≈${frames[lastMove]?.p.toFixed(3)})`);
            }
            report(`morphCompleteAt=${mca} — DELTA SERIES (spike vs smooth)`, seriesLines);

            // ── JUMP ANATOMY: at the worst frame-pair, decompose the active-front
            //    jump into directed components + dump the raw geometry, to tell
            //    "arc drifts to bisector" (both directions ~equal) from "hidden far
            //    edges appear at settle" (one direction dominates, point-count and
            //    total-length jump). Only meaningful when the worst pair is present
            //    on both sides. ─────────────────────────────────────────────────
            if (worst.i >= 0) {
                const fa = frames[worst.i]!;
                const fb = frames[worst.i + 1]!;
                const pa = fa.borders.get(worst.key);
                const pb = fb.borders.get(worst.key);
                if (pa && pb) {
                    const aToB = directedHausdorff(pa, pb, 2); // morph → settled
                    const bToA = directedHausdorff(pb, pa, 2); // settled → morph
                    const len = (polys: Poly[]) => {
                        let s = 0;
                        for (const poly of polys) for (let i = 0; i + 1 < poly.length; i++) s += Math.hypot(poly[i + 1]![0] - poly[i]![0], poly[i + 1]![1] - poly[i]![1]);
                        return s;
                    };
                    const bbox = (polys: Poly[]) => {
                        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
                        for (const poly of polys) for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
                        return `[${x0.toFixed(0)},${y0.toFixed(0)}..${x1.toFixed(0)},${y1.toFixed(0)}]`;
                    };
                    const ptCount = (polys: Poly[]) => polys.reduce((n, p) => n + p.length, 0);
                    report(`morphCompleteAt=${mca} — JUMP ANATOMY (pair ${worst.key}, p ${fa.p.toFixed(3)}→${fb.p.toFixed(3)})`, [
                        `directed morph→settled = ${aToB.toFixed(2)}px   directed settled→morph = ${bToA.toFixed(2)}px`,
                        `morph(before): polylines=${pa.length} points=${ptCount(pa)} totalLen=${len(pa).toFixed(0)}px bbox=${bbox(pa)}`,
                        `settled(after): polylines=${pb.length} points=${ptCount(pb)} totalLen=${len(pb).toFixed(0)}px bbox=${bbox(pb)}`,
                        `Δlen=${(len(pb) - len(pa)).toFixed(0)}px  (large +Δlen ⇒ hidden edges APPEAR at settle; ~0 ⇒ same curve drifts)`,
                    ]);
                }
            }

            // ── LOCKED FINDINGS (regression guards) ─────────────────────────────
            // These encode what the harness MEASURED (2026-07-11). A fix must keep
            // the first three true and FLIP the fourth.
            expect(retireIdx).toBeGreaterThan(1);

            // 1) RETIREMENT IS SEAMLESS. The last-morph → first-idle transition moves
            //    no border. (Kills every retirement/parity/pipeline-switch theory;
            //    a fix must NOT reintroduce a retirement jump.)
            const retireMaxBoth = Math.max(
                0,
                ...perPairAcrossRetire.filter((p) => p.onlyIn === 'both').map((p) => p.hausdorff),
            );
            expect(retireMaxBoth).toBeLessThan(0.5);
            expect(retireOnly.length).toBe(0); // no pair appears/disappears at retire

            // 2) THE TWO ASSEMBLY PATHS AGREE on identical settled cells. buildSurface
            //    FromCells(S1) and the idle authority snapshot(S1) are the same border.
            expect(bMax.d).toBeLessThan(0.5);

            // 3) THE MORPH CONVERGES: the last drawn morph frame IS the settled map.
            expect(cMax.d).toBeLessThan(0.5);

            // 4) THE DEFECT (to be fixed): a terminal discontinuity in the ACTIVE
            //    conquest frontier — the sweep decelerates then jumps ~9px in ONE
            //    frame at completion. Documented here as the CURRENT reality; when the
            //    front is made to converge to the bisector, flip this to
            //    `toBeLessThan(1.5)` and it becomes the fix's proof.
            //    (The worst consecutive-frame delta is on the victor's active front,
            //    never straddles retirement, and is slider-independent in magnitude.)
            expect(worst.key).toContain(NEW_OWNER); // the snap is on the victor's frontier
            expect(worst.straddlesRetire).toBe(false); // NOT at retirement
            expect(worst.d).toBeGreaterThan(5); // CURRENT DEFECT — flip to <1.5 after fix
        });
    }
});
