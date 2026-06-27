import { describe, expect, it } from 'vitest';
import type { StarState } from '$lib/types/game.types';
import type { ResolvedGeometrySnapshot } from '../contracts/GeometryContracts';
import { validateResolvedGeometrySnapshotInvariants } from './resolvedGeometryOracle';

const TEST_STARS = [
    { id: 'red-star', ownerId: 'red', x: 5, y: 5 } as StarState,
    { id: 'blue-star', ownerId: 'blue', x: 15, y: 5 } as StarState,
];

function makeSnapshot(
    overrides: Partial<ResolvedGeometrySnapshot> = {},
): ResolvedGeometrySnapshot {
    const snapshot: ResolvedGeometrySnapshot = {
        version: 'geometry:test',
        sourceMode: 'unified_vector',
        sourceStyle: 'vector',
        ownershipVersion: 'ownership:test',
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: [
            {
                regionId: 'region:red',
                ownerId: 'red',
                starIds: ['red-star'],
                anchorStarIds: ['red-star'],
                points: [
                    [0, 0],
                    [10, 0],
                    [10, 10],
                    [0, 10],
                    [0, 0],
                ],
                confidence: 1,
            },
            {
                regionId: 'region:blue',
                ownerId: 'blue',
                starIds: ['blue-star'],
                anchorStarIds: ['blue-star'],
                points: [
                    [10, 0],
                    [20, 0],
                    [20, 10],
                    [10, 10],
                    [10, 0],
                ],
                confidence: 1,
            },
        ],
        frontierPolylines: [
            {
                frontierId: 'frontier:red-blue',
                ownerA: 'blue',
                ownerB: 'red',
                ownerPairKey: 'blue|red',
                points: [
                    [10, 0],
                    [10, 10],
                ],
                confidence: 1,
            },
        ],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map(),
        frontierTopology: {
            version: 'topology:test',
            ownershipVersion: 'ownership:test',
            worldBounds: { width: 20, height: 10 },
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
    };
    return {
        ...snapshot,
        ...overrides,
    };
}

describe('validateResolvedGeometrySnapshotInvariants', () => {
    it('accepts a resolved split snapshot with contained anchor stars', () => {
        const report = validateResolvedGeometrySnapshotInvariants(makeSnapshot(), {
            stars: TEST_STARS,
        });

        expect(report).toEqual({
            ok: true,
            failureCount: 0,
            failures: [],
        });
    });

    it('detects duplicate physical frontier chains even when frontier ids differ', () => {
        const base = makeSnapshot();
        const duplicate = {
            ...base.frontierPolylines[0]!,
            frontierId: 'frontier:red-blue:duplicate',
            points: [...base.frontierPolylines[0]!.points].reverse(),
        };
        const report = validateResolvedGeometrySnapshotInvariants(
            makeSnapshot({
                frontierPolylines: [...base.frontierPolylines, duplicate],
            }),
            { stars: TEST_STARS },
        );

        expect(report.ok).toBe(false);
        expect(report.failures).toContain(
            'frontier frontier:red-blue:duplicate: duplicates physical chain frontier:red-blue',
        );
    });

    it('detects anchor stars outside their claimed region', () => {
        const report = validateResolvedGeometrySnapshotInvariants(makeSnapshot(), {
            stars: [
                { id: 'red-star', ownerId: 'red', x: 15, y: 5 } as StarState,
                TEST_STARS[1]!,
            ],
        });

        expect(report.ok).toBe(false);
        expect(report.failures).toContain(
            'region region:red: anchor star red-star is outside region',
        );
        expect(report.failures).toContain(
            'star red-star: contained by 0 red region(s), expected 1',
        );
    });

    it('detects self-intersecting region polygons', () => {
        const base = makeSnapshot();
        const report = validateResolvedGeometrySnapshotInvariants(
            makeSnapshot({
                territoryRegions: [
                    {
                        ...base.territoryRegions[0]!,
                        points: [
                            [0, 0],
                            [10, 10],
                            [2, 10],
                            [10, 0],
                            [0, 0],
                        ],
                    },
                    base.territoryRegions[1]!,
                ],
            }),
            { stars: TEST_STARS },
        );

        expect(report.ok).toBe(false);
        expect(report.failures).toContain('region region:red: polygon self-intersects');
    });
});
