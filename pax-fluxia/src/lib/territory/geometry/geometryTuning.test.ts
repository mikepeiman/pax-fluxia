import { describe, expect, it } from 'vitest';
import type { StarState } from '$lib/types/game.types';
import { buildTerritoryGeometryFingerprint } from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import {
    buildTerritoryGeneratorSettingsFromTunables,
    type TerritoryGeometryTunables,
} from './geometryTuning';

const BASE_TUNABLES: TerritoryGeometryTunables = {
    geometrySmoothingPasses: 2,
    frontierResolution: 5,
    boundaryPad: 50,
    boundaryEps: 6,
    starMargin: 45,
    corridorEnabled: true,
    corridorSpacing: 60,
    corridorCount: 0,
    corridorWeight: 0.5,
    cxContestMidpointVstars: true,
    cxContestPairCount: 1,
    cxContestPairWeight: 0.5,
    disconnectEnabled: false,
    disconnectDistance: 400,
    disconnectWeight: 0.3,
    clusterSplitThreshold: 0,
};

const STARS = [
    {
        id: 's:1',
        ownerId: 'A',
        x: 100,
        y: 100,
    },
    {
        id: 's:2',
        ownerId: 'B',
        x: 200,
        y: 200,
    },
] as const satisfies ReadonlyArray<Partial<StarState>>;

describe('geometry tuning helpers', () => {
    it('propagates contested-lane pair knobs into generator settings', () => {
        const settings = buildTerritoryGeneratorSettingsFromTunables({
            world: { width: 1920, height: 1080 },
            tunables: {
                ...BASE_TUNABLES,
                frontierResolution: 12,
                boundaryPad: 44,
                boundaryEps: 8,
                cxContestMidpointVstars: false,
                cxContestPairCount: 3,
                cxContestPairWeight: 0.75,
            },
        });

        expect(settings.frontierResolution).toBe(12);
        expect(settings.boundaryPad).toBe(44);
        expect(settings.boundaryEps).toBe(8);
        expect(settings.cxContestMidpointVstars).toBe(false);
        expect(settings.cxContestPairCount).toBe(3);
        expect(settings.cxContestPairWeight).toBe(0.75);
    });

    it('invalidates the geometry fingerprint when CP or boundary/frontier knobs change', () => {
        const base = buildTerritoryGeneratorSettingsFromTunables({
            world: { width: 1920, height: 1080 },
            tunables: BASE_TUNABLES,
        });
        const changed = buildTerritoryGeneratorSettingsFromTunables({
            world: { width: 1920, height: 1080 },
            tunables: {
                ...BASE_TUNABLES,
                cxContestPairCount: 2,
                cxContestPairWeight: 0.8,
                frontierResolution: 11,
                boundaryPad: 64,
                boundaryEps: 10,
            },
        });

        expect(
            buildTerritoryGeometryFingerprint(
                STARS as unknown as StarState[],
                changed,
            ),
        ).not.toBe(
            buildTerritoryGeometryFingerprint(
                STARS as unknown as StarState[],
                base,
            ),
        );
    });
});
