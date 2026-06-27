import { describe, expect, it } from 'vitest';
import type {
    ResolvedGeometrySnapshot,
    TerritoryRegionShape,
} from '../../contracts/GeometryContracts';
import type {
    FrontierSection,
    FrontierTopology,
    FrontierVertex,
    RegionLoop,
} from '../../contracts/FrontierTopologyContracts';
import {
    dehydrateGridGradientWorkerGeometry,
    inflateGridGradientWorkerGeometry,
} from './gridGradientPlanWorkerTypes';

const SQUARE_SECTION_IDS = [
    'section:A|world:top',
    'section:A|world:right',
    'section:A|world:bottom',
    'section:A|world:left',
] as const;

function makeRegion(): TerritoryRegionShape {
    return {
        regionId: 'region:A',
        ownerId: 'A',
        points: [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
        ],
        confidence: 1,
    };
}

function makeVertex(
    id: string,
    point: [number, number],
    incidentSectionIds: string[],
    semanticKey: string,
): FrontierVertex {
    return {
        id,
        kind: 'world_corner',
        point,
        incidentSectionIds,
        ownerIds: ['A', 'world'],
        semanticKey,
    };
}

function makeSection(params: {
    readonly id: string;
    readonly startVertexId: string;
    readonly endVertexId: string;
    readonly points: [number, number][];
}): FrontierSection {
    return {
        id: params.id,
        kind: 'world_border',
        startVertexId: params.startVertexId,
        endVertexId: params.endVertexId,
        leftOwnerId: 'A',
        rightOwnerId: 'world',
        points: params.points,
        length: 10,
        ownerPairKey: 'A|world',
        leftInfluence: {
            ownerId: 'A',
            primaryStarId: 'star:A',
            primaryScore: 1,
        },
        rightInfluence: {
            ownerId: 'world',
            primaryStarId: 'world',
            primaryScore: 1,
        },
    };
}

function makeSquareTopology(): FrontierTopology {
    const vertices = new Map<string, FrontierVertex>([
        [
            'v:top-left',
            makeVertex(
                'v:top-left',
                [0, 0],
                ['section:A|world:top', 'section:A|world:left'],
                'world:corner:top-left',
            ),
        ],
        [
            'v:top-right',
            makeVertex(
                'v:top-right',
                [10, 0],
                ['section:A|world:top', 'section:A|world:right'],
                'world:corner:top-right',
            ),
        ],
        [
            'v:bottom-right',
            makeVertex(
                'v:bottom-right',
                [10, 10],
                ['section:A|world:right', 'section:A|world:bottom'],
                'world:corner:bottom-right',
            ),
        ],
        [
            'v:bottom-left',
            makeVertex(
                'v:bottom-left',
                [0, 10],
                ['section:A|world:bottom', 'section:A|world:left'],
                'world:corner:bottom-left',
            ),
        ],
    ]);
    const sections = new Map<string, FrontierSection>(
        [
            makeSection({
                id: 'section:A|world:top',
                startVertexId: 'v:top-left',
                endVertexId: 'v:top-right',
                points: [
                    [0, 0],
                    [10, 0],
                ],
            }),
            makeSection({
                id: 'section:A|world:right',
                startVertexId: 'v:top-right',
                endVertexId: 'v:bottom-right',
                points: [
                    [10, 0],
                    [10, 10],
                ],
            }),
            makeSection({
                id: 'section:A|world:bottom',
                startVertexId: 'v:bottom-right',
                endVertexId: 'v:bottom-left',
                points: [
                    [10, 10],
                    [0, 10],
                ],
            }),
            makeSection({
                id: 'section:A|world:left',
                startVertexId: 'v:bottom-left',
                endVertexId: 'v:top-left',
                points: [
                    [0, 10],
                    [0, 0],
                ],
            }),
        ].map((section) => [section.id, section]),
    );
    const loop: RegionLoop = {
        id: 'loop:A:outer',
        ownerId: 'A',
        componentId: 'component:A:0',
        sectionRefs: SQUARE_SECTION_IDS.map((sectionId) => ({
            sectionId,
            direction: 'forward',
        })),
        signedArea: 100,
    };

    return {
        version: 'topology:square:A',
        ownershipVersion: 'ownership:square:A',
        worldBounds: { width: 10, height: 10 },
        vertices,
        sections,
        loops: [loop],
        sectionsByOwnerPair: new Map([['A|world', [...SQUARE_SECTION_IDS]]]),
        sectionsByVertex: new Map([
            ['v:top-left', ['section:A|world:top', 'section:A|world:left']],
            ['v:top-right', ['section:A|world:top', 'section:A|world:right']],
            ['v:bottom-right', ['section:A|world:right', 'section:A|world:bottom']],
            ['v:bottom-left', ['section:A|world:bottom', 'section:A|world:left']],
        ]),
        sectionsByOwner: new Map([
            ['A', [...SQUARE_SECTION_IDS]],
            ['world', [...SQUARE_SECTION_IDS]],
        ]),
    };
}

function makeReliableSnapshot(): ResolvedGeometrySnapshot {
    const topology = makeSquareTopology();
    return {
        version: 'geometry:square:A',
        sourceMode: 'unified_vector',
        sourceStyle: 'vector',
        ownershipVersion: topology.ownershipVersion,
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: [makeRegion()],
        frontierPolylines: [],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map(),
        frontierTopology: topology,
        shells: [],
        shellLoops: [],
        provenance: {
            derivedFromField: false,
            notes: ['reliable-square-fixture'],
        },
        diagnostics: {
            topologyReliable: true,
            identityReliable: true,
            closureReliable: true,
            notes: ['source-diagnostic-note'],
        },
    };
}

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

    it('transports reliable topology through the worker geometry payload', () => {
        const source = makeReliableSnapshot();
        const workerGeometry = dehydrateGridGradientWorkerGeometry(source);

        expect(workerGeometry.frontierTopology).not.toBeNull();
        expect(workerGeometry.diagnostics).toMatchObject({
            topologyReliable: true,
            identityReliable: true,
            closureReliable: true,
        });
        expect(
            workerGeometry.frontierTopology?.sections.map((section) => section.id),
        ).toEqual(SQUARE_SECTION_IDS);

        const inflated = inflateGridGradientWorkerGeometry(workerGeometry);

        expect(inflated.territoryRegions).toEqual(source.territoryRegions);
        expect(inflated.diagnostics.topologyReliable).toBe(true);
        expect(inflated.diagnostics.identityReliable).toBe(true);
        expect(inflated.diagnostics.closureReliable).toBe(true);
        expect(inflated.diagnostics.notes).toContain(
            'grid-gradient-worker-topology-transported',
        );
        expect(inflated.diagnostics.notes).toContain('source-diagnostic-note');
        expect(inflated.provenance.notes).toContain(
            'grid-gradient-worker-topology-transported',
        );
        expect(inflated.frontierTopology.version).toBe(source.frontierTopology.version);
        expect([...inflated.frontierTopology.sections.keys()]).toEqual(
            SQUARE_SECTION_IDS,
        );
        expect(
            inflated.frontierTopology.sectionsByOwnerPair.get('A|world'),
        ).toEqual(SQUARE_SECTION_IDS);
        expect(inflated.frontierTopology.sectionsByOwner.get('A')).toEqual(
            SQUARE_SECTION_IDS,
        );
        expect(inflated.frontierTopology.vertices.get('v:top-left')).toMatchObject({
            point: [0, 0],
            semanticKey: 'world:corner:top-left',
        });
        expect(
            inflated.frontierTopology.sections.get('section:A|world:top'),
        ).toMatchObject({
            ownerPairKey: 'A|world',
            startVertexId: 'v:top-left',
            endVertexId: 'v:top-right',
            points: [
                [0, 0],
                [10, 0],
            ],
        });
        expect(inflated.frontierTopology.loops[0]?.sectionRefs).toEqual(
            SQUARE_SECTION_IDS.map((sectionId) => ({
                sectionId,
                direction: 'forward',
            })),
        );
    });

    it('omits topology when any source reliability flag is false', () => {
        const source = makeReliableSnapshot();
        const workerGeometry = dehydrateGridGradientWorkerGeometry({
            ...source,
            diagnostics: {
                ...source.diagnostics,
                identityReliable: false,
            },
        });

        expect(workerGeometry.frontierTopology).toBeNull();

        const inflated = inflateGridGradientWorkerGeometry(workerGeometry);

        expect(inflated.frontierTopology.sections.size).toBe(0);
        expect(inflated.diagnostics.topologyReliable).toBe(false);
        expect(inflated.diagnostics.identityReliable).toBe(false);
        expect(inflated.diagnostics.closureReliable).toBe(false);
        expect(inflated.diagnostics.notes).toContain(
            'grid-gradient-worker-minimal-topology-omitted',
        );
    });

    it('omits topology and preserves the resolved-geometry oracle when the oracle fails', () => {
        const source = makeReliableSnapshot();
        const workerGeometry = dehydrateGridGradientWorkerGeometry({
            ...source,
            diagnostics: {
                ...source.diagnostics,
                resolvedGeometryOracle: {
                    ok: false,
                    failureCount: 1,
                    failures: ['duplicate physical frontier'],
                },
            },
        });

        expect(workerGeometry.frontierTopology).toBeNull();
        expect(workerGeometry.diagnostics?.resolvedGeometryOracle).toMatchObject({
            ok: false,
            failureCount: 1,
            failures: ['duplicate physical frontier'],
        });

        const inflated = inflateGridGradientWorkerGeometry(workerGeometry);

        expect(inflated.frontierTopology.sections.size).toBe(0);
        expect(inflated.diagnostics.topologyReliable).toBe(false);
        expect(inflated.diagnostics.identityReliable).toBe(false);
        expect(inflated.diagnostics.closureReliable).toBe(false);
        expect(inflated.diagnostics.resolvedGeometryOracle).toMatchObject({
            ok: false,
            failures: ['duplicate physical frontier'],
        });
        expect(inflated.diagnostics.notes).toContain(
            'grid-gradient-worker-minimal-topology-omitted',
        );
    });
});
