import { describe, expect, it } from 'vitest';
import type {
    FrontierSection,
    FrontierTopology,
} from '../contracts/FrontierTopologyContracts';
import type { SharedPolyline } from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import { buildPowerVoronoiFrontierTopology } from '../families/buildPowerVoronoiFrontierTopology';
import { validateFrontierTopologyInvariants } from './frontierTopologyOracle';

function squareWorldBorderPolylines(): SharedPolyline[] {
    return [
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
}

function splitWorldSharedPolylines(): SharedPolyline[] {
    return [
        {
            ownerPairKey: 'blue|red',
            color: 0,
            points: [
                [50, 0],
                [50, 100],
            ],
        },
    ];
}

function splitWorldBorderPolylines(): SharedPolyline[] {
    return [
        {
            ownerPairKey: 'red|world',
            color: 0,
            points: [
                [0, 0],
                [50, 0],
            ],
        },
        {
            ownerPairKey: 'blue|world',
            color: 0,
            points: [
                [50, 0],
                [100, 0],
            ],
        },
        {
            ownerPairKey: 'blue|world',
            color: 0,
            points: [
                [100, 0],
                [100, 100],
            ],
        },
        {
            ownerPairKey: 'blue|world',
            color: 0,
            points: [
                [100, 100],
                [50, 100],
            ],
        },
        {
            ownerPairKey: 'red|world',
            color: 0,
            points: [
                [50, 100],
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
}

function buildHealthyTopology(): FrontierTopology {
    const result = buildPowerVoronoiFrontierTopology({
        sharedPolylines: [],
        worldBorderPolylines: squareWorldBorderPolylines(),
        ownershipVersion: 'test',
        worldWidth: 100,
        worldHeight: 100,
        fingerprint: 'oracle-square-world-border',
    });

    expect(result.topologyReliable).toBe(true);
    return result.topology;
}

function buildSplitTopology(): FrontierTopology {
    const result = buildPowerVoronoiFrontierTopology({
        sharedPolylines: splitWorldSharedPolylines(),
        worldBorderPolylines: splitWorldBorderPolylines(),
        ownershipVersion: 'test',
        worldWidth: 100,
        worldHeight: 100,
        fingerprint: 'oracle-split-world',
    });

    expect(result.topologyReliable).toBe(true);
    return result.topology;
}

function previousNonEmptyReliability(topology: FrontierTopology): boolean {
    return (
        topology.sections.size > 0 &&
        topology.vertices.size > 0 &&
        topology.loops.length > 0
    );
}

function buildDegenerateSelfLoopTopology(): FrontierTopology {
    return {
        version: 'degenerate:self-loop',
        ownershipVersion: 'test',
        worldBounds: { width: 100, height: 100 },
        vertices: new Map([
            [
                '0,0',
                {
                    id: '0,0',
                    kind: 'world_corner',
                    point: [0, 0],
                    incidentSectionIds: ['section:red|world:0,0:0,0'],
                    ownerIds: ['red', 'world'],
                    semanticKey: 'world:corner:top-left',
                },
            ],
        ]),
        sections: new Map([
            [
                'section:red|world:0,0:0,0',
                {
                    id: 'section:red|world:0,0:0,0',
                    kind: 'world_border',
                    startVertexId: '0,0',
                    endVertexId: '0,0',
                    leftOwnerId: 'red',
                    rightOwnerId: 'world',
                    points: [
                        [0, 0],
                        [0, 0],
                    ],
                    length: 0,
                    ownerPairKey: 'red|world',
                    leftInfluence: {
                        ownerId: 'red',
                        primaryStarId: 'red',
                        primaryScore: 1,
                    },
                    rightInfluence: {
                        ownerId: 'world',
                        primaryStarId: 'world',
                        primaryScore: 1,
                    },
                },
            ],
        ]),
        loops: [
            {
                id: 'loop:red:degenerate',
                ownerId: 'red',
                componentId: 'comp:red:degenerate',
                sectionRefs: [
                    {
                        sectionId: 'section:red|world:0,0:0,0',
                        direction: 'forward',
                    },
                ],
                signedArea: 0,
            },
        ],
        sectionsByOwnerPair: new Map([
            ['red|world', ['section:red|world:0,0:0,0']],
        ]),
        sectionsByVertex: new Map([
            ['0,0', ['section:red|world:0,0:0,0']],
        ]),
        sectionsByOwner: new Map([
            ['red', ['section:red|world:0,0:0,0']],
            ['world', ['section:red|world:0,0:0,0']],
        ]),
    };
}

function appendIndexValue(
    index: ReadonlyMap<string, readonly string[]>,
    key: string,
    value: string,
): Map<string, string[]> {
    const next = new Map<string, string[]>(
        [...index.entries()].map(([entryKey, values]) => [
            entryKey,
            [...values],
        ]),
    );
    next.set(key, [...(next.get(key) ?? []), value]);
    return next;
}

function duplicateFirstSection(topology: FrontierTopology): FrontierTopology {
    const section = [...topology.sections.values()][0]!;
    const duplicateId = `${section.id}:duplicate-physical`;
    const duplicateSection = {
        ...section,
        id: duplicateId,
    };
    const vertices = new Map(topology.vertices);
    for (const vertexId of [section.startVertexId, section.endVertexId]) {
        const vertex = vertices.get(vertexId)!;
        vertices.set(vertexId, {
            ...vertex,
            incidentSectionIds: [...vertex.incidentSectionIds, duplicateId],
        });
    }
    return {
        ...topology,
        vertices,
        sections: new Map([...topology.sections, [duplicateId, duplicateSection]]),
        sectionsByVertex: [section.startVertexId, section.endVertexId].reduce(
            (index, vertexId) => appendIndexValue(index, vertexId, duplicateId),
            topology.sectionsByVertex,
        ),
        sectionsByOwnerPair: appendIndexValue(
            topology.sectionsByOwnerPair,
            section.ownerPairKey,
            duplicateId,
        ),
        sectionsByOwner:
            section.leftOwnerId === section.rightOwnerId
                ? appendIndexValue(
                      topology.sectionsByOwner,
                      section.leftOwnerId,
                      duplicateId,
                  )
                : appendIndexValue(
                      appendIndexValue(
                          topology.sectionsByOwner,
                          section.leftOwnerId,
                          duplicateId,
                      ),
                      section.rightOwnerId,
                      duplicateId,
                  ),
    };
}

function makeSection(params: {
    readonly id: string;
    readonly start: string;
    readonly end: string;
    readonly points: [number, number][];
}): FrontierSection {
    return {
        id: params.id,
        kind: 'world_border',
        startVertexId: params.start,
        endVertexId: params.end,
        leftOwnerId: 'red',
        rightOwnerId: 'world',
        points: params.points,
        length: Math.hypot(
            params.points.at(-1)![0] - params.points[0]![0],
            params.points.at(-1)![1] - params.points[0]![1],
        ),
        ownerPairKey: 'red|world',
        leftInfluence: {
            ownerId: 'red',
            primaryStarId: 'red',
            primaryScore: 1,
        },
        rightInfluence: {
            ownerId: 'world',
            primaryStarId: 'world',
            primaryScore: 1,
        },
    };
}

function buildSelfIntersectingLoopTopology(): FrontierTopology {
    const vertices = new Map([
        [
            'a',
            {
                id: 'a',
                kind: 'world_corner' as const,
                point: [0, 0] as [number, number],
                incidentSectionIds: ['ab', 'da'],
                ownerIds: ['red', 'world'],
                semanticKey: 'a',
            },
        ],
        [
            'b',
            {
                id: 'b',
                kind: 'world_intersection' as const,
                point: [100, 100] as [number, number],
                incidentSectionIds: ['ab', 'bc'],
                ownerIds: ['red', 'world'],
                semanticKey: 'b',
            },
        ],
        [
            'c',
            {
                id: 'c',
                kind: 'world_corner' as const,
                point: [20, 100] as [number, number],
                incidentSectionIds: ['bc', 'cd'],
                ownerIds: ['red', 'world'],
                semanticKey: 'c',
            },
        ],
        [
            'd',
            {
                id: 'd',
                kind: 'world_corner' as const,
                point: [100, 0] as [number, number],
                incidentSectionIds: ['cd', 'da'],
                ownerIds: ['red', 'world'],
                semanticKey: 'd',
            },
        ],
    ]);
    return {
        version: 'self-intersecting-loop',
        ownershipVersion: 'test',
        worldBounds: { width: 100, height: 100 },
        vertices,
        sections: new Map([
            ['ab', makeSection({ id: 'ab', start: 'a', end: 'b', points: [[0, 0], [100, 100]] })],
            ['bc', makeSection({ id: 'bc', start: 'b', end: 'c', points: [[100, 100], [20, 100]] })],
            ['cd', makeSection({ id: 'cd', start: 'c', end: 'd', points: [[20, 100], [100, 0]] })],
            ['da', makeSection({ id: 'da', start: 'd', end: 'a', points: [[100, 0], [0, 0]] })],
        ]),
        loops: [
            {
                id: 'loop:red:self-intersecting',
                ownerId: 'red',
                componentId: 'comp:red:self-intersecting',
                sectionRefs: [
                    { sectionId: 'ab', direction: 'forward' },
                    { sectionId: 'bc', direction: 'forward' },
                    { sectionId: 'cd', direction: 'forward' },
                    { sectionId: 'da', direction: 'forward' },
                ],
                signedArea: -1000,
            },
        ],
        sectionsByOwnerPair: new Map([['red|world', ['ab', 'bc', 'cd', 'da']]]),
        sectionsByVertex: new Map([
            ['a', ['ab', 'da']],
            ['b', ['ab', 'bc']],
            ['c', ['bc', 'cd']],
            ['d', ['cd', 'da']],
        ]),
        sectionsByOwner: new Map([
            ['red', ['ab', 'bc', 'cd', 'da']],
            ['world', ['ab', 'bc', 'cd', 'da']],
        ]),
    };
}

describe('validateFrontierTopologyInvariants', () => {
    it('accepts a healthy closed topology emitted by the Power Voronoi builder', () => {
        const topology = buildHealthyTopology();

        const report = validateFrontierTopologyInvariants(topology);

        expect(report).toEqual({
            ok: true,
            failureCount: 0,
            failures: [],
        });
    });

    it('rejects closed but degenerate self-loop sections that non-empty reliability would accept', () => {
        const topology = buildDegenerateSelfLoopTopology();

        expect(previousNonEmptyReliability(topology)).toBe(true);
        const report = validateFrontierTopologyInvariants(topology);

        expect(report.ok).toBe(false);
        expect(report.failures).toContain(
            'section section:red|world:0,0:0,0: degenerate section start and end vertex are identical',
        );
        expect(report.failures).toContain(
            'section section:red|world:0,0:0,0: non-positive length 0',
        );
    });

    it('detects stale endpoint indexes that non-empty reliability would accept', () => {
        const topology = buildHealthyTopology();
        const section = [...topology.sections.values()][0]!;
        const sectionsByVertex = new Map(topology.sectionsByVertex);
        sectionsByVertex.set(
            section.startVertexId,
            (sectionsByVertex.get(section.startVertexId) ?? []).filter(
                (sectionId) => sectionId !== section.id,
            ),
        );
        const invalidTopology: FrontierTopology = {
            ...topology,
            sectionsByVertex,
        };

        expect(previousNonEmptyReliability(invalidTopology)).toBe(true);
        const report = validateFrontierTopologyInvariants(invalidTopology);

        expect(report.ok).toBe(false);
        expect(report.failures).toContain(
            `section ${section.id}: missing from sectionsByVertex at start ${section.startVertexId}`,
        );
    });

    it('detects loop references that no longer reconstruct a closed point chain', () => {
        const topology = buildHealthyTopology();
        const loop = topology.loops[0]!;
        const invalidTopology: FrontierTopology = {
            ...topology,
            loops: [
                {
                    ...loop,
                    sectionRefs: loop.sectionRefs.slice(0, -1),
                },
            ],
        };

        expect(previousNonEmptyReliability(invalidTopology)).toBe(true);
        const report = validateFrontierTopologyInvariants(invalidTopology);

        expect(report.ok).toBe(false);
        expect(
            report.failures.some((failure) =>
                failure.includes('reconstructed point chain is open'),
            ),
        ).toBe(true);
    });

    it('detects stale loop signedArea values that no longer match the section chain', () => {
        const topology = buildHealthyTopology();
        const loop = topology.loops[0]!;
        const invalidTopology: FrontierTopology = {
            ...topology,
            loops: [
                {
                    ...loop,
                    signedArea: 0,
                },
            ],
        };

        expect(previousNonEmptyReliability(invalidTopology)).toBe(true);
        const report = validateFrontierTopologyInvariants(invalidTopology);

        expect(report.ok).toBe(false);
        expect(
            report.failures.some((failure) =>
                failure.includes('signedArea 0 does not match reconstructed'),
            ),
        ).toBe(true);
    });

    it('detects duplicated loop coverage for sections that should belong to one loop per owner', () => {
        const topology = buildHealthyTopology();
        const loop = topology.loops[0]!;
        const section = topology.sections.get(loop.sectionRefs[0]!.sectionId)!;
        const invalidTopology: FrontierTopology = {
            ...topology,
            loops: [
                loop,
                {
                    ...loop,
                    id: `${loop.id}:duplicate`,
                    componentId: `${loop.componentId}:duplicate`,
                },
            ],
        };

        expect(previousNonEmptyReliability(invalidTopology)).toBe(true);
        const report = validateFrontierTopologyInvariants(invalidTopology);

        expect(report.ok).toBe(false);
        expect(report.failures).toContain(
            `section ${section.id}: loop coverage for owner red is 2, expected 1`,
        );
    });

    it('detects duplicated physical frontier sections even when ids differ', () => {
        const topology = buildHealthyTopology();
        const section = [...topology.sections.values()][0]!;
        const invalidTopology = duplicateFirstSection(topology);

        expect(previousNonEmptyReliability(invalidTopology)).toBe(true);
        const report = validateFrontierTopologyInvariants(invalidTopology);

        expect(report.ok).toBe(false);
        expect(report.failures).toContain(
            `section ${section.id}:duplicate-physical: duplicates physical frontier ${section.id}`,
        );
    });

    it('detects closed loops whose reconstructed point chain self-intersects', () => {
        const topology = buildSelfIntersectingLoopTopology();

        expect(previousNonEmptyReliability(topology)).toBe(true);
        const report = validateFrontierTopologyInvariants(topology);

        expect(report.ok).toBe(false);
        expect(report.failures).toContain(
            'loop loop:red:self-intersecting: reconstructed point chain self-intersects',
        );
    });

    it('detects a shared section missing one owner-side loop', () => {
        const topology = buildSplitTopology();
        const ownerBorder = [...topology.sections.values()].find(
            (section) => section.kind === 'owner_border',
        )!;
        const invalidTopology: FrontierTopology = {
            ...topology,
            loops: topology.loops.filter((loop) => loop.ownerId !== 'blue'),
        };

        expect(previousNonEmptyReliability(invalidTopology)).toBe(true);
        const report = validateFrontierTopologyInvariants(invalidTopology);

        expect(report.ok).toBe(false);
        expect(report.failures).toContain(
            `section ${ownerBorder.id}: loop coverage for owner blue is 0, expected 1`,
        );
    });

    it('detects owner and owner-pair index entries that point at the wrong section', () => {
        const topology = buildHealthyTopology();
        const section = [...topology.sections.values()][0]!;
        const sectionsByOwner = new Map(topology.sectionsByOwner);
        const sectionsByOwnerPair = new Map(topology.sectionsByOwnerPair);
        sectionsByOwner.set('blue', [section.id]);
        sectionsByOwnerPair.set('blue|green', [section.id]);
        const invalidTopology: FrontierTopology = {
            ...topology,
            sectionsByOwner,
            sectionsByOwnerPair,
        };

        expect(previousNonEmptyReliability(invalidTopology)).toBe(true);
        const report = validateFrontierTopologyInvariants(invalidTopology);

        expect(report.ok).toBe(false);
        expect(report.failures).toContain(
            `sectionsByOwner blue: section ${section.id} does not include owner`,
        );
        expect(report.failures).toContain(
            `sectionsByOwnerPair blue|green: section ${section.id} belongs to red|world`,
        );
    });
});
