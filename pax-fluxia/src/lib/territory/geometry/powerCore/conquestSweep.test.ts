/**
 * conquestSweep.test.ts — the conquest SWEEP (spec: incoming owner's SOLID
 * region grows across the captured cell as its shape changes; no color blend).
 * Asserts: a 'conquest' ramp is built when an attack origin is supplied; the
 * incoming owner's total area grows monotonically through the morph while the
 * outgoing owner's shrinks; every rendered cell is single-owner.
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
import type { KineticEndpointState } from './kineticTypes';
import type { PowerCell, Point } from './powerCoreTypes';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..', '..', '..');
const FIXTURE = 'cross_owner_midpoint_corridor';

function load() {
    const raw = JSON.parse(
        readFileSync(path.join(REPO_ROOT, 'common', 'resources', 'fixture-maps', `${FIXTURE}.json`), 'utf-8'),
    ) as { stars: StarState[]; connections: StarConnection[] };
    let maxX = 0, maxY = 0;
    for (const s of raw.stars) { if (s.x > maxX) maxX = s.x; if (s.y > maxY) maxY = s.y; }
    return { stars: raw.stars, connections: raw.connections, w: maxX + 200, h: maxY + 200 };
}

const MAP = load();

function endpoint(overrides: Record<string, string>): { state: KineticEndpointState; clip: [number, number][] } {
    const stars = MAP.stars.map((s) => (overrides[s.id] ? ({ ...s, ownerId: overrides[s.id] } as StarState) : s));
    const config = buildPowerVoronoi0319Settings({
        lanes: MAP.connections, worldWidth: MAP.w, worldHeight: MAP.h,
        configSource: GAME_CONFIG as unknown as Record<string, unknown>,
    });
    const r = computePowerCoreEndpoint({ stars, connections: MAP.connections, config });
    if ('kind' in r) throw new Error(r.message);
    return { state: { sites: r.sites, cells: r.cells }, clip: r.clip };
}

// Capture star-0 (human-player) → ai-1; attacker = star-1 (ai-1, adjacent).
const CAPTURED = 'star-0';
const OLD_OWNER = 'human-player';
const NEW_OWNER = 'ai-1';
const ATTACKER = MAP.stars.find((s) => s.id === 'star-1')!;

const S0 = endpoint({});
const S1 = endpoint({ [CAPTURED]: NEW_OWNER });
const CONQUEST_ORIGINS = new Map([[CAPTURED, { x: ATTACKER.x, y: ATTACKER.y }]]);

function polyArea(pts: readonly Point[]): number {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i]!;
        const [bx, by] = pts[(i + 1) % pts.length]!;
        a += ax * by - bx * ay;
    }
    return Math.abs(a / 2);
}

function ownerArea(cells: readonly PowerCell[], owner: string): number {
    let sum = 0;
    for (const c of cells) if (c.ownerId === owner) sum += polyArea(c.points);
    return sum;
}

describe('conquest sweep', () => {
    const bubble = buildTransitionBubble({ s0: S0.state, s1: S1.state, conquestOrigins: CONQUEST_ORIGINS });

    it('builds a conquest ramp for the captured star', () => {
        const ramp = bubble.ramps.find((r) => r.kind === 'conquest');
        expect(ramp).toBeTruthy();
        expect(ramp!.starId).toBe(CAPTURED);
        expect(ramp!.ownerA).toBe(OLD_OWNER);
        expect(ramp!.ownerB).toBe(NEW_OWNER);
        expect(Math.hypot(ramp!.attackDirX!, ramp!.attackDirY!)).toBeCloseTo(1, 3);
        expect(ramp!.cellRadius!).toBeGreaterThan(0);
    });

    it('grows the incoming owner + shrinks the outgoing, monotonically, all solid cells', () => {
        const qs = [0.15, 0.35, 0.55, 0.75, 0.9];
        let prevNew = -Infinity;
        let prevOld = Infinity;
        for (const q of qs) {
            const frame = sampleKineticFrame({ bubble, p: q, clip: S0.clip });
            const all = [...frame.frozenCells, ...frame.bubbleCells];
            // Every cell is exactly one owner (no blend) — a cell can't be two.
            for (const c of all) expect(typeof c.ownerId).toBe('string');
            // Both owners are represented in the captured region during the sweep.
            const newArea = ownerArea(all, NEW_OWNER);
            const oldArea = ownerArea(all, OLD_OWNER);
            expect(newArea).toBeGreaterThan(prevNew); // incoming grows
            expect(oldArea).toBeLessThan(prevOld);    // outgoing shrinks
            prevNew = newArea;
            prevOld = oldArea;
        }
    });

    it('endpoints are exact (snap to S0 / S1 cells)', () => {
        expect(sampleKineticFrame({ bubble, p: 0, clip: S0.clip }).bubbleCells).toBe(bubble.bubbleCells0);
        expect(sampleKineticFrame({ bubble, p: 1, clip: S0.clip }).bubbleCells).toBe(bubble.bubbleCells1);
    });

    it('sweep covers the FULL captured cell — no early finish, no end pop', () => {
        // The 2026-07-03 defect: the sweep boundary travelled only HALF the
        // cell, finished early, and the far strip POPPED at settle. Lock the
        // fix: the new-owner share of the captured cell must go ~0 → ~1 across
        // the morph, strictly increasing, with both parts present mid-sweep.
        const capturedShare = (p: number): { share: number; parts: number } => {
            const frame = sampleKineticFrame({ bubble, p, clip: S0.clip });
            const parts = frame.bubbleCells.filter((c) => c.siteId === CAPTURED);
            let total = 0;
            let newArea = 0;
            for (const part of parts) {
                const a = polyArea(part.points);
                total += a;
                if (part.ownerId === NEW_OWNER) newArea += a;
            }
            expect(total).toBeGreaterThan(0);
            return { share: newArea / total, parts: parts.length };
        };
        const early = capturedShare(0.1);
        const mid = capturedShare(0.5);
        const late = capturedShare(0.9);
        const nearEnd = capturedShare(0.98);
        expect(early.share).toBeLessThan(0.25); // starts near zero
        expect(mid.parts).toBe(2); // both owners visible mid-sweep
        expect(mid.share).toBeGreaterThan(early.share);
        expect(late.share).toBeGreaterThan(mid.share);
        expect(late.share).toBeGreaterThan(0.75); // reaches the far side
        expect(nearEnd.share).toBeGreaterThan(0.95); // no residual strip at settle
    });
});
