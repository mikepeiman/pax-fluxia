import { describe, expect, it } from 'vitest';
import { inflateGridGradientWorkerGeometry } from './gridGradientPlanWorkerTypes';

describe('inflateGridGradientWorkerGeometry', () => {
    it('marks omitted worker topology unreliable instead of fabricating provenance', () => {
        const snapshot = inflateGridGradientWorkerGeometry({
            version: 'worker-test',
            territoryRegions: [
                {
                    regionId: 'region:A',
                    ownerId: 'A',
                    points: [
                        [0, 0],
                        [10, 0],
                        [10, 10],
                        [0, 10],
                    ],
                    confidence: 1,
                },
            ],
        });

        expect(snapshot.territoryRegions).toHaveLength(1);
        expect(snapshot.frontierTopology.sections.size).toBe(0);
        expect(snapshot.frontierTopology.vertices.size).toBe(0);
        expect(snapshot.frontierTopology.loops).toEqual([]);
        expect(snapshot.diagnostics.topologyReliable).toBe(false);
        expect(snapshot.diagnostics.identityReliable).toBe(false);
        expect(snapshot.diagnostics.closureReliable).toBe(false);
        expect(snapshot.diagnostics.notes).toContain(
            'grid-gradient-worker-minimal-topology-omitted',
        );
        expect(snapshot.provenance.notes).toContain('grid-gradient-worker-minimal');
    });
});
