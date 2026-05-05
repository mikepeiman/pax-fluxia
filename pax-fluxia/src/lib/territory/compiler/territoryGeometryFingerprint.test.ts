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
                starMargin: 75,
                clusterSplit: false,
                corridorEnabled: false,
                corridorSpacing: 100,
                cxCount: 0,
                cxWeight: 1,
                disconnectEnabled: false,
                disconnectDistance: 250,
                dxWeight: 1,
                chaikinPasses: 0,
            },
        );

        expect(fingerprint.startsWith('power_voronoi:')).toBe(true);
        expect(fingerprint.includes('pvv2:')).toBe(false);
    });
});
