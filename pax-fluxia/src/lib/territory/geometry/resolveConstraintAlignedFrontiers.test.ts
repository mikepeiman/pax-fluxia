import { describe, expect, it } from 'vitest';
import type { CanonicalGeometrySnapshot } from '../contracts/GeometryContracts';
import { resolveConstraintAlignedFrontiers } from './resolveConstraintAlignedFrontiers';

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

describe('resolveConstraintAlignedFrontiers', () => {
    it('moves inter-owner frontiers to the midpoint between owner-side MSR displacements', () => {
        const geometry = makeGeometry({
            frontierPolylines: [
                {
                    frontierId: 'f:red|blue:0',
                    ownerA: 'red',
                    ownerB: 'blue',
                    ownerPairKey: 'red|blue',
                    points: [[5, 0]],
                    confidence: 1,
                },
            ],
        });

        const resolved = resolveConstraintAlignedFrontiers({
            geometry,
            stars: [
                { id: 'r', x: 0, y: 0, ownerId: 'red' } as any,
                { id: 'b', x: 30, y: 0, ownerId: 'blue' } as any,
            ],
            requestedMarginPx: 10,
        });

        expect(resolved.appliedMarginPx).toBe(10);
        expect(resolved.frontierPolylines[0]).toMatchObject({
            kind: 'inter_owner',
            ownerPairKey: 'red|blue',
        });
        expect(resolved.frontierPolylines[0]?.points[0]?.[0]).toBeCloseTo(7.5);
    });

    it('moves world borders to the owner-side constrained fill edge', () => {
        const geometry = makeGeometry({
            worldBorderPolylines: [
                {
                    frontierId: 'world:red|world:0',
                    ownerA: 'red',
                    ownerB: '__world__',
                    ownerPairKey: 'red|world',
                    points: [[5, 0]],
                    confidence: 1,
                },
            ],
        });

        const resolved = resolveConstraintAlignedFrontiers({
            geometry,
            stars: [{ id: 'r', x: 0, y: 0, ownerId: 'red' } as any],
            requestedMarginPx: 10,
        });

        expect(resolved.worldBorderPolylines[0]).toMatchObject({
            kind: 'world',
            ownerPairKey: 'red|world',
        });
        expect(resolved.worldBorderPolylines[0]?.points[0]?.[0]).toBeCloseTo(10);
    });
});
