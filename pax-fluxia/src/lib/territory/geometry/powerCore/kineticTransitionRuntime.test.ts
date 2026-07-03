/**
 * kineticTransitionRuntime.test.ts — K2: lifecycle over the kinetic core.
 * T4 recapture retarget · T5 tick-bound timing · idempotence · snap · settle.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarConnection, StarState } from '$lib/types/game.types';
import { computePowerCoreEndpoint } from './buildPowerCoreAuthoritySnapshot';
import { buildPowerVoronoi0319Settings } from '../../families/buildFamilyGeometry';
import { KineticTransitionRuntime } from './kineticTransitionRuntime';
import type { KineticEndpointState, KineticFrame } from './kineticTypes';
import type { PowerCell, Point } from './powerCoreTypes';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..', '..', '..');
const FIXTURE = 'cross_owner_midpoint_corridor';

function loadStars(): {
    stars: StarState[];
    connections: StarConnection[];
    worldWidth: number;
    worldHeight: number;
} {
    const raw = JSON.parse(
        readFileSync(
            path.join(REPO_ROOT, 'common', 'resources', 'fixture-maps', `${FIXTURE}.json`),
            'utf-8',
        ),
    ) as { stars: StarState[]; connections: StarConnection[] };
    let maxX = 0, maxY = 0;
    for (const s of raw.stars) { if (s.x > maxX) maxX = s.x; if (s.y > maxY) maxY = s.y; }
    return { stars: raw.stars, connections: raw.connections, worldWidth: maxX + 200, worldHeight: maxY + 200 };
}

const MAP = loadStars();
const CAPTURED = MAP.stars.find((s) => s.ownerId)!;
const NEW_OWNER = [...new Set(MAP.stars.filter((s) => s.ownerId).map((s) => s.ownerId!))]
    .find((o) => o !== CAPTURED.ownerId)!;

function endpoint(overrides: Record<string, string>): {
    state: KineticEndpointState;
    clip: [number, number][];
} {
    const stars = MAP.stars.map((s) =>
        overrides[s.id] ? ({ ...s, ownerId: overrides[s.id] } as StarState) : s,
    );
    const config = buildPowerVoronoi0319Settings({
        lanes: MAP.connections,
        worldWidth: MAP.worldWidth,
        worldHeight: MAP.worldHeight,
        configSource: GAME_CONFIG as unknown as Record<string, unknown>,
    });
    const result = computePowerCoreEndpoint({
        stars,
        connections: MAP.connections,
        config,
    });
    if ('kind' in result) throw new Error(result.message);
    return { state: { sites: result.sites, cells: result.cells }, clip: result.clip };
}

const S0 = endpoint({});
const S1 = endpoint({ [CAPTURED.id]: NEW_OWNER });
const RIPPLE = { x: CAPTURED.x, y: CAPTURED.y };
const DUR = 600;

// Real conquests carry an attack direction → the continuous SWEEP (not the
// binary handoff flip). Exercise that here so retarget continuity reflects
// production behaviour.
function nearestOwnerStar(owner: string): { x: number; y: number } {
    let best: { x: number; y: number } | null = null;
    let bestD = Infinity;
    for (const s of MAP.stars) {
        if (s.id === CAPTURED.id || s.ownerId !== owner) continue;
        const d = (s.x - CAPTURED.x) ** 2 + (s.y - CAPTURED.y) ** 2;
        if (d < bestD) { bestD = d; best = { x: s.x, y: s.y }; }
    }
    return best ?? { x: CAPTURED.x + 100, y: CAPTURED.y };
}
const CONQUEST_FWD = new Map([[CAPTURED.id, nearestOwnerStar(NEW_OWNER)]]);
const CONQUEST_REV = new Map([[CAPTURED.id, nearestOwnerStar(CAPTURED.ownerId!)]]);

function ownerAreas(frame: KineticFrame): Map<string, number> {
    const area = (pts: readonly Point[]) => {
        let s = 0;
        for (let i = 0; i < pts.length; i++) {
            const [ax, ay] = pts[i]!;
            const [bx, by] = pts[(i + 1) % pts.length]!;
            s += ax * by - bx * ay;
        }
        return Math.abs(s / 2);
    };
    const sums = new Map<string, number>();
    const add = (cells: readonly PowerCell[]) => {
        for (const c of cells) sums.set(c.ownerId, (sums.get(c.ownerId) ?? 0) + area(c.points));
    };
    add(frame.frozenCells);
    add(frame.bubbleCells);
    return sums;
}

describe('KineticTransitionRuntime', () => {
    it('initial commit settles without animation; identical versions are no-ops', () => {
        const rt = new KineticTransitionRuntime();
        rt.commit({ state: S0.state, clip: S0.clip, ownershipVersion: 'v0', transitionKey: null, nowMs: 0, durationMs: DUR });
        expect(rt.sample(100)).toBeNull();
        expect(rt.settledState).toBe(S0.state);
        rt.commit({ state: S1.state, clip: S1.clip, ownershipVersion: 'v0', transitionKey: 'ignored', nowMs: 100, durationMs: DUR });
        expect(rt.sample(150)).toBeNull(); // same version → ignored
        expect(rt.settledState).toBe(S0.state);
    });

    it('capture animates then settles exactly at duration (T5 tick-bound)', () => {
        const rt = new KineticTransitionRuntime();
        rt.commit({ state: S0.state, clip: S0.clip, ownershipVersion: 'v0', transitionKey: null, nowMs: 0, durationMs: DUR });
        rt.commit({
            state: S1.state, clip: S1.clip, ownershipVersion: 'v1',
            transitionKey: `12:${CAPTURED.id}:${CAPTURED.ownerId}:${NEW_OWNER}`,
            nowMs: 1000, durationMs: DUR, rippleOrigin: RIPPLE, conquestOrigins: CONQUEST_FWD,
        });
        const mid = rt.sample(1000 + DUR / 2);
        expect(mid).not.toBeNull();
        expect(mid!.bubbleCells.length).toBeGreaterThan(0);
        expect(rt.sample(1000 + DUR - 1)).not.toBeNull();
        expect(rt.sample(1000 + DUR)).toBeNull(); // settled on the boundary
        expect(rt.settledState).toBe(S1.state);
    });

    it('null transitionKey snaps with no animation', () => {
        const rt = new KineticTransitionRuntime();
        rt.commit({ state: S0.state, clip: S0.clip, ownershipVersion: 'v0', transitionKey: null, nowMs: 0, durationMs: DUR });
        rt.commit({ state: S1.state, clip: S1.clip, ownershipVersion: 'v1', transitionKey: null, nowMs: 50, durationMs: DUR });
        expect(rt.sample(60)).toBeNull();
        expect(rt.settledState).toBe(S1.state);
    });

    it('T4: mid-flight recapture retargets continuously and settles on the new truth', () => {
        const rt = new KineticTransitionRuntime();
        rt.commit({ state: S0.state, clip: S0.clip, ownershipVersion: 'v0', transitionKey: null, nowMs: 0, durationMs: DUR });
        rt.commit({
            state: S1.state, clip: S1.clip, ownershipVersion: 'v1',
            transitionKey: `12:${CAPTURED.id}:${CAPTURED.ownerId}:${NEW_OWNER}`,
            nowMs: 1000, durationMs: DUR, rippleOrigin: RIPPLE, conquestOrigins: CONQUEST_FWD,
        });
        const before = rt.sample(1000 + 299)!;
        // Recapture: flip back to the original owner mid-flight.
        rt.commit({
            state: S0.state, clip: S0.clip, ownershipVersion: 'v2',
            transitionKey: `13:${CAPTURED.id}:${NEW_OWNER}:${CAPTURED.ownerId}`,
            nowMs: 1000 + 300, durationMs: DUR, rippleOrigin: RIPPLE, conquestOrigins: CONQUEST_REV,
        });
        const after = rt.sample(1000 + 301)!;
        expect(after).not.toBeNull();
        // Continuity: owner areas move only modestly across the retarget instant
        // — NO restart-to-endpoint (that was the 58% jump when the boundary
        // aligned with the old binary-flip point). The residual (~8% of one
        // owner's area on this tiny 6-star fixture) is re-materialization noise:
        // the mid-flight frame is rebuilt into an endpoint state and re-diffed
        // against the new target, which is not bit-for-bit the sampled frame.
        // Acceptable for the rare mid-flight-recapture case; the load-bearing
        // assertions are "not a restart" (bounded) + "settles on the true final".
        const a = ownerAreas(before);
        const b = ownerAreas(after);
        for (const [owner, areaBefore] of a) {
            const areaAfter = b.get(owner) ?? 0;
            expect(
                Math.abs(areaAfter - areaBefore) / Math.max(1, areaBefore),
                `owner ${owner} area jumped across retarget`,
            ).toBeLessThan(0.15);
        }
        // Settles exactly on the ORIGINAL state object (byte-exact truth).
        expect(rt.sample(1000 + 300 + DUR)).toBeNull();
        expect(rt.settledState).toBe(S0.state);
    });

    it('is deterministic across identical runs', () => {
        const run = () => {
            const rt = new KineticTransitionRuntime();
            rt.commit({ state: S0.state, clip: S0.clip, ownershipVersion: 'v0', transitionKey: null, nowMs: 0, durationMs: DUR });
            rt.commit({
                state: S1.state, clip: S1.clip, ownershipVersion: 'v1',
                transitionKey: 'k', nowMs: 0, durationMs: DUR, rippleOrigin: RIPPLE,
            });
            return JSON.stringify(rt.sample(DUR / 2));
        };
        expect(run()).toBe(run());
    });
});
