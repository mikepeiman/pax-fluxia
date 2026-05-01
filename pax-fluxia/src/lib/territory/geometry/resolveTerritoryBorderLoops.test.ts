import { describe, expect, it } from 'vitest';
import type { CanonicalGeometrySnapshot } from '../contracts/GeometryContracts';
import { resolveTerritoryBorderLoops } from './resolveTerritoryBorderLoops';

function makeGeometry(
    overrides: Partial<CanonicalGeometrySnapshot>,
): CanonicalGeometrySnapshot {
    return {
        version: 'test',
        sourceMode: 'unified_vector',
        sourceStyle: 'canonical',
        ownershipVersion: 'own:test',
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: [],
        frontierPolylines: [],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map(),
        frontierTopology: {
            version: 'topo:test',
            ownershipVersion: 'own:test',
            worldBounds: { width: 100, height: 100 },
            vertices: new Map(),
            sections: new Map(),
            loops: [],
            sectionsByOwnerPair: new Map(),
            sectionsByVertex: new Map(),
            sectionsByOwner: new Map(),
        },
        shells: [],
        shellLoops: [],
        provenance: {
            derivedFromField: false,
            notes: [],
        },
        diagnostics: {
            topologyReliable: true,
            identityReliable: true,
            closureReliable: true,
            notes: [],
        },
        ...overrides,
    };
}

describe('resolveTerritoryBorderLoops', () => {
    it('prefers shell loops and maps hole loops to outside alignment', () => {
        const geometry = makeGeometry({
            shellLoops: [
                {
                    shellLoopId: 'outer',
                    ownerId: 'blue',
                    points: [
                        [0, 0],
                        [10, 0],
                        [10, 10],
                    ],
                    classification: 'outer',
                    confidence: 1,
                },
                {
                    shellLoopId: 'hole',
                    ownerId: 'blue',
                    points: [
                        [3, 3],
                        [7, 3],
                        [7, 7],
                    ],
                    classification: 'hole',
                    confidence: 1,
                },
            ],
        });

        const loops = resolveTerritoryBorderLoops(geometry);

        expect(loops).toHaveLength(2);
        expect(loops[0]).toMatchObject({
            loopId: 'outer',
            ownerId: 'blue',
            alignment: 1,
        });
        expect(loops[1]).toMatchObject({
            loopId: 'hole',
            ownerId: 'blue',
            alignment: 0,
        });
    });

    it('falls back to territory regions when shell loops are absent', () => {
        const geometry = makeGeometry({
            territoryRegions: [
                {
                    regionId: 'region:red:a',
                    ownerId: 'red',
                    points: [
                        [0, 0],
                        [20, 0],
                        [20, 20],
                    ],
                    confidence: 0.9,
                },
            ],
        });

        const loops = resolveTerritoryBorderLoops(geometry);

        expect(loops).toHaveLength(1);
        expect(loops[0]).toMatchObject({
            loopId: 'region:region:red:a',
            ownerId: 'red',
            alignment: 1,
            confidence: 0.9,
        });
    });
});
