import { describe, expect, it } from 'vitest';
import type { CanonicalGeometrySnapshot } from '../contracts/GeometryContracts';
import { resolveConstraintAlignedTerritoryGeometry } from './resolveConstraintAlignedTerritoryGeometry';

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

describe('resolveConstraintAlignedTerritoryGeometry', () => {
    it('moves inter-owner frontiers to the midpoint between owner-side MSR displacements', () => {
        const geometry = makeGeometry({
            frontierPolylines: [
                {
                    frontierId: 'f:red|blue:0',
                    ownerA: 'red',
                    ownerB: 'blue',
                    ownerPairKey: 'red|blue',
                    points: [[25, 50]],
                    confidence: 1,
                },
            ],
        });

        const resolved = resolveConstraintAlignedTerritoryGeometry({
            geometry,
            stars: [
                { id: 'r', x: 20, y: 50, ownerId: 'red' } as any,
                { id: 'b', x: 50, y: 50, ownerId: 'blue' } as any,
            ],
            requestedMarginPx: 10,
        });

        expect(resolved.appliedMarginPx).toBe(10);
        expect(resolved.frontierPolylines[0]).toMatchObject({
            kind: 'inter_owner',
            ownerPairKey: 'red|blue',
        });
        expect(resolved.frontierPolylines[0]?.points[0]?.[0]).toBeCloseTo(27.5);
    });

    it('moves world borders to the owner-side constrained fill edge', () => {
        const geometry = makeGeometry({
            worldBorderPolylines: [
                {
                    frontierId: 'world:red|world:0',
                    ownerA: 'red',
                    ownerB: 'world',
                    ownerPairKey: 'red|world',
                    points: [[15, 50]],
                    confidence: 1,
                },
            ],
        });

        const resolved = resolveConstraintAlignedTerritoryGeometry({
            geometry,
            stars: [{ id: 'r', x: 20, y: 50, ownerId: 'red' } as any],
            requestedMarginPx: 10,
        });

        expect(resolved.worldBorderPolylines[0]).toMatchObject({
            kind: 'world',
            ownerPairKey: 'red|world',
        });
        expect(resolved.worldBorderPolylines[0]?.points[0]?.[0]).toBeCloseTo(10);
    });

    it('resolves a multi-owner junction to one shared point across incident borders', () => {
        const geometry = makeGeometry({
            frontierPolylines: [
                {
                    frontierId: 'f:green|blue:0',
                    ownerA: 'blue',
                    ownerB: 'green',
                    ownerPairKey: 'blue|green',
                    points: [
                        [10, 5],
                        [10, 10],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'f:blue|purple:0',
                    ownerA: 'blue',
                    ownerB: 'purple',
                    ownerPairKey: 'blue|purple',
                    points: [
                        [10, 10],
                        [5, 15],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'f:green|purple:0',
                    ownerA: 'green',
                    ownerB: 'purple',
                    ownerPairKey: 'green|purple',
                    points: [
                        [10, 10],
                        [15, 15],
                    ],
                    confidence: 1,
                },
            ],
        });

        const resolved = resolveConstraintAlignedTerritoryGeometry({
            geometry,
            stars: [
                { id: 'g', x: 4, y: 6, ownerId: 'green' } as any,
                { id: 'b', x: 16, y: 6, ownerId: 'blue' } as any,
                { id: 'p', x: 10, y: 18, ownerId: 'purple' } as any,
            ],
            requestedMarginPx: 8,
        });

        const junction = resolved.junctions.find(
            (entry) =>
                entry.ownerIds.length === 3 &&
                entry.ownerIds.includes('blue') &&
                entry.ownerIds.includes('green') &&
                entry.ownerIds.includes('purple'),
        );
        expect(junction).toBeDefined();
        const resolvedPoint = junction!.point;
        expect(resolved.frontierPolylines[0]?.points.at(-1)).toEqual(resolvedPoint);
        expect(resolved.frontierPolylines[1]?.points[0]).toEqual(resolvedPoint);
        expect(resolved.frontierPolylines[2]?.points[0]).toEqual(resolvedPoint);
    });

    it('rebuilds resolved fills from the adjusted frontier set', () => {
        const geometry = makeGeometry({
            frontierPolylines: [
                {
                    frontierId: 'f:red|blue:0',
                    ownerA: 'blue',
                    ownerB: 'red',
                    ownerPairKey: 'blue|red',
                    points: [
                        [5, 0],
                        [5, 10],
                    ],
                    confidence: 1,
                },
            ],
            worldBorderPolylines: [
                {
                    frontierId: 'w:red:0',
                    ownerA: 'red',
                    ownerB: 'world',
                    ownerPairKey: 'red|world',
                    points: [
                        [0, 0],
                        [5, 0],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:red:1',
                    ownerA: 'red',
                    ownerB: 'world',
                    ownerPairKey: 'red|world',
                    points: [
                        [5, 10],
                        [0, 10],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:red:2',
                    ownerA: 'red',
                    ownerB: 'world',
                    ownerPairKey: 'red|world',
                    points: [
                        [0, 10],
                        [0, 0],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:blue:0',
                    ownerA: 'blue',
                    ownerB: 'world',
                    ownerPairKey: 'blue|world',
                    points: [
                        [5, 0],
                        [10, 0],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:blue:1',
                    ownerA: 'blue',
                    ownerB: 'world',
                    ownerPairKey: 'blue|world',
                    points: [
                        [10, 0],
                        [10, 10],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:blue:2',
                    ownerA: 'blue',
                    ownerB: 'world',
                    ownerPairKey: 'blue|world',
                    points: [
                        [10, 10],
                        [5, 10],
                    ],
                    confidence: 1,
                },
            ],
        });

        const resolved = resolveConstraintAlignedTerritoryGeometry({
            geometry,
            stars: [
                { id: 'r', x: 2, y: 5, ownerId: 'red' } as any,
                { id: 'b', x: 8, y: 5, ownerId: 'blue' } as any,
            ],
            requestedMarginPx: 2,
        });

        expect(resolved.territoryRegions).toHaveLength(2);
        const owners = resolved.territoryRegions.map((region) => region.ownerId).sort();
        expect(owners).toEqual(['blue', 'red']);
    });

    it('assembles visible owner-pair borders from the resolved fill boundary', () => {
        const geometry = makeGeometry({
            frontierPolylines: [
                {
                    frontierId: 'f:red|blue:0',
                    ownerA: 'blue',
                    ownerB: 'red',
                    ownerPairKey: 'blue|red',
                    points: [
                        [5, 0],
                        [5, 5],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'f:red|blue:1',
                    ownerA: 'blue',
                    ownerB: 'red',
                    ownerPairKey: 'blue|red',
                    points: [
                        [5, 5],
                        [5, 10],
                    ],
                    confidence: 1,
                },
            ],
            worldBorderPolylines: [
                {
                    frontierId: 'w:red:0',
                    ownerA: 'red',
                    ownerB: 'world',
                    ownerPairKey: 'red|world',
                    points: [
                        [0, 0],
                        [5, 0],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:red:1',
                    ownerA: 'red',
                    ownerB: 'world',
                    ownerPairKey: 'red|world',
                    points: [
                        [5, 10],
                        [0, 10],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:red:2',
                    ownerA: 'red',
                    ownerB: 'world',
                    ownerPairKey: 'red|world',
                    points: [
                        [0, 10],
                        [0, 0],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:blue:0',
                    ownerA: 'blue',
                    ownerB: 'world',
                    ownerPairKey: 'blue|world',
                    points: [
                        [5, 0],
                        [10, 0],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:blue:1',
                    ownerA: 'blue',
                    ownerB: 'world',
                    ownerPairKey: 'blue|world',
                    points: [
                        [10, 0],
                        [10, 10],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:blue:2',
                    ownerA: 'blue',
                    ownerB: 'world',
                    ownerPairKey: 'blue|world',
                    points: [
                        [10, 10],
                        [5, 10],
                    ],
                    confidence: 1,
                },
            ],
        });

        const resolved = resolveConstraintAlignedTerritoryGeometry({
            geometry,
            stars: [
                { id: 'r', x: 2, y: 5, ownerId: 'red' } as any,
                { id: 'b', x: 8, y: 5, ownerId: 'blue' } as any,
            ],
            requestedMarginPx: 0,
        });

        expect(resolved.displayFrontierPolylines).toHaveLength(1);
        expect(resolved.displayFrontierPolylines[0]?.ownerPairKey).toBe('blue|red');
        expect(resolved.displayFrontierPolylines[0]?.points).toEqual([
            [5, 0],
            [5, 5],
            [5, 10],
        ]);
    });

    it('drops spur frontier fragments that are not part of any accepted territory loop', () => {
        const geometry = makeGeometry({
            frontierPolylines: [
                {
                    frontierId: 'f:red|blue:0',
                    ownerA: 'red',
                    ownerB: 'blue',
                    ownerPairKey: 'red|blue',
                    points: [
                        [5, 0],
                        [5, 10],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'f:green|orange:spur',
                    ownerA: 'green',
                    ownerB: 'orange',
                    ownerPairKey: 'green|orange',
                    points: [
                        [30, 30],
                        [34, 34],
                    ],
                    confidence: 1,
                },
            ],
            worldBorderPolylines: [
                {
                    frontierId: 'w:red:0',
                    ownerA: 'red',
                    ownerB: 'world',
                    ownerPairKey: 'red|world',
                    points: [
                        [0, 0],
                        [5, 0],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:red:1',
                    ownerA: 'red',
                    ownerB: 'world',
                    ownerPairKey: 'red|world',
                    points: [
                        [5, 10],
                        [0, 10],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:red:2',
                    ownerA: 'red',
                    ownerB: 'world',
                    ownerPairKey: 'red|world',
                    points: [
                        [0, 10],
                        [0, 0],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:blue:0',
                    ownerA: 'blue',
                    ownerB: 'world',
                    ownerPairKey: 'blue|world',
                    points: [
                        [5, 0],
                        [10, 0],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:blue:1',
                    ownerA: 'blue',
                    ownerB: 'world',
                    ownerPairKey: 'blue|world',
                    points: [
                        [10, 0],
                        [10, 10],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:blue:2',
                    ownerA: 'blue',
                    ownerB: 'world',
                    ownerPairKey: 'blue|world',
                    points: [
                        [10, 10],
                        [5, 10],
                    ],
                    confidence: 1,
                },
            ],
        });

        const resolved = resolveConstraintAlignedTerritoryGeometry({
            geometry,
            stars: [
                { id: 'r', x: 2, y: 5, ownerId: 'red' } as any,
                { id: 'b', x: 8, y: 5, ownerId: 'blue' } as any,
                { id: 'g', x: 28, y: 32, ownerId: 'green' } as any,
                { id: 'o', x: 36, y: 36, ownerId: 'orange' } as any,
            ],
            requestedMarginPx: 0,
        });

        expect(
            resolved.frontierPolylines.map((polyline) => polyline.ownerPairKey).sort(),
        ).toEqual(['red|blue']);
        expect(
            resolved.frontierPolylines.some(
                (polyline) => polyline.ownerPairKey === 'green|orange',
            ),
        ).toBe(false);
        expect(
            resolved.displayFrontierPolylines.map((polyline) => polyline.ownerPairKey).sort(),
        ).toEqual(['blue|red']);
        expect(
            resolved.displayFrontierPolylines.some(
                (polyline) => polyline.ownerPairKey === 'green|orange',
            ),
        ).toBe(false);
    });

    it('can ignore owner-local territory loops and rebuild from shared frontiers', () => {
        const geometry = makeGeometry({
            territoryRegions: [
                {
                    regionId: 'red',
                    ownerId: 'red',
                    points: [
                        [0, 0],
                        [4, 0],
                        [4, 10],
                        [0, 10],
                    ],
                    confidence: 1,
                },
                {
                    regionId: 'blue',
                    ownerId: 'blue',
                    points: [
                        [4, 0],
                        [10, 0],
                        [10, 10],
                        [4, 10],
                    ],
                    confidence: 1,
                },
            ],
            frontierPolylines: [
                {
                    frontierId: 'f:red|blue:0',
                    ownerA: 'blue',
                    ownerB: 'red',
                    ownerPairKey: 'blue|red',
                    points: [
                        [5, 0],
                        [5, 10],
                    ],
                    confidence: 1,
                },
            ],
            worldBorderPolylines: [
                {
                    frontierId: 'w:red:0',
                    ownerA: 'red',
                    ownerB: 'world',
                    ownerPairKey: 'red|world',
                    points: [
                        [0, 0],
                        [5, 0],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:red:1',
                    ownerA: 'red',
                    ownerB: 'world',
                    ownerPairKey: 'red|world',
                    points: [
                        [5, 10],
                        [0, 10],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:red:2',
                    ownerA: 'red',
                    ownerB: 'world',
                    ownerPairKey: 'red|world',
                    points: [
                        [0, 10],
                        [0, 0],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:blue:0',
                    ownerA: 'blue',
                    ownerB: 'world',
                    ownerPairKey: 'blue|world',
                    points: [
                        [5, 0],
                        [10, 0],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:blue:1',
                    ownerA: 'blue',
                    ownerB: 'world',
                    ownerPairKey: 'blue|world',
                    points: [
                        [10, 0],
                        [10, 10],
                    ],
                    confidence: 1,
                },
                {
                    frontierId: 'w:blue:2',
                    ownerA: 'blue',
                    ownerB: 'world',
                    ownerPairKey: 'blue|world',
                    points: [
                        [10, 10],
                        [5, 10],
                    ],
                    confidence: 1,
                },
            ],
        });

        const fromRegions = resolveConstraintAlignedTerritoryGeometry({
            geometry,
            stars: [
                { id: 'r', x: 2, y: 5, ownerId: 'red' } as any,
                { id: 'b', x: 8, y: 5, ownerId: 'blue' } as any,
            ],
            requestedMarginPx: 0,
        });
        const fromSharedFrontiers = resolveConstraintAlignedTerritoryGeometry({
            geometry,
            stars: [
                { id: 'r', x: 2, y: 5, ownerId: 'red' } as any,
                { id: 'b', x: 8, y: 5, ownerId: 'blue' } as any,
            ],
            requestedMarginPx: 0,
            preferSharedBoundaryResolution: true,
        });

        expect(fromRegions.displayFrontierPolylines[0]?.points).toEqual([
            [4, 0],
            [4, 10],
        ]);
        expect(fromSharedFrontiers.displayFrontierPolylines[0]?.points).toEqual([
            [5, 0],
            [5, 10],
        ]);
    });
});
