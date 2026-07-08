/**
 * deferredEndpointConsistency.test — the conquest-frame spike fix's safety
 * invariant: the CHEAP endpoint committed on the conquest frame
 * (computePowerCoreEndpointForFamily) must be BYTE-IDENTICAL to the endpoint
 * the deferred full snapshot build surfaces via collectEndpoint. If they ever
 * diverged, the morph's S1 would differ from the settled snapshot (a PRE|POST
 * desync at settle). Also locks the bridge's needsCommit fingerprint guard.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '$lib/config/game.config';
import type { StarConnection, StarState } from '$lib/types/game.types';
import {
    buildPerimeterFieldRenderFamilyGeometry,
    computePowerCoreEndpointForFamily,
} from './buildFamilyGeometry';
import type { PowerCoreEndpointComputation } from '../geometry/powerCore/buildPowerCoreAuthoritySnapshot';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..', '..');

function load() {
    const raw = JSON.parse(
        readFileSync(
            path.join(REPO_ROOT, 'common', 'resources', 'fixture-maps', 'cross_owner_midpoint_corridor.json'),
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

describe('deferred endpoint consistency (conquest-frame spike fix)', () => {
    const MAP = load();
    const configSource = GAME_CONFIG as unknown as Record<string, unknown>;

    it('light endpoint === the snapshot build collectEndpoint endpoint (byte-identical)', () => {
        const stars = MAP.stars.map((s) =>
            s.id === 'star-0' ? ({ ...s, ownerId: 'ai-1' } as StarState) : s,
        );
        const light = computePowerCoreEndpointForFamily({
            stars,
            lanes: MAP.connections,
            worldWidth: MAP.w,
            worldHeight: MAP.h,
            configSource,
        });
        expect(light).not.toBeNull();

        let collected: PowerCoreEndpointComputation | null = null;
        buildPerimeterFieldRenderFamilyGeometry({
            stars,
            lanes: MAP.connections,
            worldWidth: MAP.w,
            worldHeight: MAP.h,
            nowMs: 0,
            geometrySource: 'power_core',
            configSource,
            collectEndpoint: (endpoint) => {
                collected = endpoint;
            },
        });
        expect(collected).not.toBeNull();

        // Byte-identical sites, cells, and clip — the morph's S1 IS the settled
        // snapshot's endpoint; no drift, no desync at settle.
        expect(JSON.stringify(light!.sites)).toBe(JSON.stringify(collected!.sites));
        expect(JSON.stringify(light!.cells)).toBe(JSON.stringify(collected!.cells));
        expect(JSON.stringify(light!.clip)).toBe(JSON.stringify(collected!.clip));
    });
});
