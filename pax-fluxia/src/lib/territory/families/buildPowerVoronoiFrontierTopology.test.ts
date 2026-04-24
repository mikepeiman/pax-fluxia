import { describe, expect, it } from 'vitest';
import type { SharedPolyline } from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import { buildPowerVoronoiFrontierTopology } from './buildPowerVoronoiFrontierTopology';

describe('buildPowerVoronoiFrontierTopology', () => {
    it('builds a reliable owner-world loop from closed world-border polylines', () => {
        const worldBorderPolylines: SharedPolyline[] = [
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [0, 0],
                    [100, 0],
                ],
            },
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [100, 0],
                    [100, 100],
                ],
            },
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [100, 100],
                    [0, 100],
                ],
            },
            {
                ownerPairKey: 'red|world',
                color: 0,
                points: [
                    [0, 100],
                    [0, 0],
                ],
            },
        ];

        const result = buildPowerVoronoiFrontierTopology({
            sharedPolylines: [],
            worldBorderPolylines,
            ownershipVersion: 'test',
            worldWidth: 100,
            worldHeight: 100,
            fingerprint: 'square-world-border',
        });

        expect(result.topologyReliable).toBe(true);
        expect(result.notes).toEqual([]);
        expect(result.topology.sections.size).toBe(4);
        expect(result.topology.vertices.size).toBe(4);
        expect(result.topology.loops).toHaveLength(1);
        expect(result.topology.loops[0]?.ownerId).toBe('red');
        expect(
            [...result.topology.sections.values()].every(
                (section) => section.ownerPairKey === 'red|world',
            ),
        ).toBe(true);
    });
});
