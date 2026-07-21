/**
 * kineticRuntimeBridge.test.ts — K2c: the GameCanvas↔runtime glue.
 * Ownership-fingerprint commit guard, snap vs animate, reset-on-disable,
 * diagnostics. Module singleton → reset between cases.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarConnection, StarState } from '$lib/types/game.types';
import type { ConquestEvent } from '@pax/common';
import { computePowerCoreEndpoint } from './buildPowerCoreAuthoritySnapshot';
import { buildPowerVoronoi0319Settings } from '../../families/buildFamilyGeometry';
import type { RenderFamilyActiveTransition } from '../../families/RenderFamilyTypes';
import {
    commitKineticEndpoint,
    getActiveKineticFrame,
    getKineticDiagnostics,
    getKineticRenderCells,
    resetKineticRuntimeBridge,
    sampleKineticForFrame,
} from './kineticRuntimeBridge';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..', '..', '..');
const FIXTURE = 'cross_owner_midpoint_corridor';

function load(): { stars: StarState[]; connections: StarConnection[]; w: number; h: number } {
    const raw = JSON.parse(
        readFileSync(path.join(REPO_ROOT, 'common', 'resources', 'fixture-maps', `${FIXTURE}.json`), 'utf-8'),
    ) as { stars: StarState[]; connections: StarConnection[] };
    let maxX = 0, maxY = 0;
    for (const s of raw.stars) { if (s.x > maxX) maxX = s.x; if (s.y > maxY) maxY = s.y; }
    return { stars: raw.stars, connections: raw.connections, w: maxX + 200, h: maxY + 200 };
}

const MAP = load();
const CAPTURED = MAP.stars.find((s) => s.ownerId)!;
const NEW_OWNER = [...new Set(MAP.stars.filter((s) => s.ownerId).map((s) => s.ownerId!))]
    .find((o) => o !== CAPTURED.ownerId)!;

function endpoint(overrides: Record<string, string>) {
    const stars = MAP.stars.map((s) =>
        overrides[s.id] ? ({ ...s, ownerId: overrides[s.id] } as StarState) : s,
    );
    const config = buildPowerVoronoi0319Settings({
        lanes: MAP.connections, worldWidth: MAP.w, worldHeight: MAP.h,
        configSource: GAME_CONFIG as unknown as Record<string, unknown>,
    });
    const result = computePowerCoreEndpoint({ stars, connections: MAP.connections, config });
    if ('kind' in result) throw new Error(result.message);
    return { endpoint: result, stars };
}

const S0 = endpoint({});
const S1 = endpoint({ [CAPTURED.id]: NEW_OWNER });

function captureSession(): RenderFamilyActiveTransition {
    const event = {
        tick: 12, starId: CAPTURED.id,
        previousOwner: CAPTURED.ownerId, newOwner: NEW_OWNER,
    } as unknown as ConquestEvent;
    return {
        sessionKey: `tick:12:12:${CAPTURED.id}:${CAPTURED.ownerId}:${NEW_OWNER}`,
        conquestEvents: [event], events: [],
        startedAtMs: 0, durationMs: 600, progress: 0, rawProgress: 0,
    };
}

const DUR = 600;

describe('kineticRuntimeBridge', () => {
    beforeEach(() => resetKineticRuntimeBridge());

    it('disabled sampling returns null and holds no runtime', () => {
        commitKineticEndpoint({ endpoint: S0.endpoint, stars: S0.stars, activeTransition: null, nowMs: 0, durationMs: DUR });
        expect(sampleKineticForFrame(100, false)).toBeNull();
        expect(getKineticDiagnostics().kineticActive).toBe(false);
    });

    it('initial snap commit (null key) settles with no morph', () => {
        commitKineticEndpoint({ endpoint: S0.endpoint, stars: S0.stars, activeTransition: null, nowMs: 0, durationMs: DUR });
        expect(sampleKineticForFrame(50, true)).toBeNull();
        expect(getKineticDiagnostics().kineticActiveKey).toBeNull();
    });

    it('capture commit animates, exposes frame + diagnostics, then settles', () => {
        commitKineticEndpoint({ endpoint: S0.endpoint, stars: S0.stars, activeTransition: null, nowMs: 0, durationMs: DUR });
        const session = captureSession();
        commitKineticEndpoint({ endpoint: S1.endpoint, stars: S1.stars, activeTransition: session, nowMs: 1000, durationMs: DUR });
        const mid = sampleKineticForFrame(1000 + DUR / 2, true);
        expect(mid).not.toBeNull();
        expect(mid!.bubbleCells.length).toBeGreaterThan(0);
        const diag = getKineticDiagnostics();
        expect(diag.kineticActive).toBe(true);
        expect(diag.kineticActiveKey).toBe(session.sessionKey);
        expect(getActiveKineticFrame()).toBe(mid);
        expect(sampleKineticForFrame(1000 + DUR, true)).toBeNull(); // settled
        expect(getKineticDiagnostics().kineticActive).toBe(false);
    });

    it('ownership fingerprint guards duplicate commits (no re-arm)', () => {
        commitKineticEndpoint({ endpoint: S0.endpoint, stars: S0.stars, activeTransition: null, nowMs: 0, durationMs: DUR });
        const session = captureSession();
        commitKineticEndpoint({ endpoint: S1.endpoint, stars: S1.stars, activeTransition: session, nowMs: 1000, durationMs: DUR });
        // Same S1 ownership again mid-flight — must NOT restart the morph.
        commitKineticEndpoint({ endpoint: S1.endpoint, stars: S1.stars, activeTransition: session, nowMs: 1000 + DUR / 2, durationMs: DUR });
        // Original window still governs: settles at the ORIGINAL start + DUR.
        expect(sampleKineticForFrame(1000 + DUR - 1, true)).not.toBeNull();
        expect(sampleKineticForFrame(1000 + DUR, true)).toBeNull();
    });

    it('topology-only retune refreshes the settled anchor (issue #1)', () => {
        // Idle snap with the default topology.
        commitKineticEndpoint({ endpoint: S0.endpoint, stars: S0.stars, activeTransition: null, nowMs: 0, durationMs: DUR });
        const before = getKineticRenderCells();
        expect(before).toBe(S0.endpoint.cells);

        // SAME ownership, RETUNED topology (star margin + world-clip pad both
        // moved) → a different diagram. Pre-fix, the ownership-only gate
        // early-returned here and the morph anchor stayed stale.
        const savedMsr = GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN;
        const savedPad = GAME_CONFIG.CHAIKIN_BOUNDARY_PAD;
        GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN = savedMsr + 25;
        GAME_CONFIG.CHAIKIN_BOUNDARY_PAD = savedPad + 80;
        let retuned: ReturnType<typeof endpoint>;
        try {
            retuned = endpoint({});
        } finally {
            GAME_CONFIG.MODIFIED_VORONOI_STAR_MARGIN = savedMsr;
            GAME_CONFIG.CHAIKIN_BOUNDARY_PAD = savedPad;
        }
        commitKineticEndpoint({ endpoint: retuned.endpoint, stars: retuned.stars, activeTransition: null, nowMs: 10, durationMs: DUR });

        // Anchor now reflects the retuned topology, not the stale S0 geometry.
        expect(getKineticRenderCells()).toBe(retuned.endpoint.cells);
        expect(getKineticRenderCells()).not.toBe(before);
    });

    it('unchanged endpoint does not re-settle (gate stays idempotent)', () => {
        commitKineticEndpoint({ endpoint: S0.endpoint, stars: S0.stars, activeTransition: null, nowMs: 0, durationMs: DUR });
        const first = getKineticRenderCells();
        // Identical ownership AND topology → no-op; the anchor must be untouched.
        commitKineticEndpoint({ endpoint: S0.endpoint, stars: S0.stars, activeTransition: null, nowMs: 5, durationMs: DUR });
        expect(getKineticRenderCells()).toBe(first);
    });

    it('reset clears all state', () => {
        commitKineticEndpoint({ endpoint: S0.endpoint, stars: S0.stars, activeTransition: null, nowMs: 0, durationMs: DUR });
        const session = captureSession();
        commitKineticEndpoint({ endpoint: S1.endpoint, stars: S1.stars, activeTransition: session, nowMs: 0, durationMs: DUR });
        sampleKineticForFrame(DUR / 2, true);
        resetKineticRuntimeBridge();
        expect(getKineticDiagnostics().kineticActive).toBe(false);
        expect(getActiveKineticFrame()).toBeNull();
        expect(getKineticDiagnostics().kineticFramesSampled).toBe(0);
    });
});
