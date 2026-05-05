import { describe, expect, it } from 'vitest';

import { buildTerritoryGeometryFingerprintCore } from './territoryGeometryFingerprint';

describe('buildTerritoryGeometryFingerprintCore', () => {
    it('uses a truthful power-voronoi prefix instead of stale PVV2 residue', () => {
        const fingerprint = buildTerritoryGeometryFingerprintCore(
            [
                { id: 'star-2', ownerId: 'red' },
                { id: 'star-10', ownerId: 'blue' },
            ],
            {
                starWeight: 75,
                msrPx: 75,
                clusterSplit: false,
                cxEnabled: false,
                cxSpacingPx: 100,
                cxPointCount: 0,
                cxWeight: 1,
                lpMidpointPairEnabled: true,
                lpPairCount: 1,
                lpPairSpacingPx: 75,
                lpPairWeight: 0.5,
                dxEnabled: false,
                dxMaxDistancePx: 250,
                dxWeight: 1,
                chaikinPasses: 0,
            },
        );

        expect(fingerprint.startsWith('power_voronoi:')).toBe(true);
        expect(fingerprint.includes('pvv2:')).toBe(false);
    });
});
