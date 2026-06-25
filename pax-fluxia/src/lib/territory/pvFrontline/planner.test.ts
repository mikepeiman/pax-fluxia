import { describe, expect, it } from 'vitest';
import type { GeometrySnapshot } from '../contracts/GeometryContracts';
import type { FrontierSection, FrontierTopology, FrontierVertex } from '../contracts/FrontierTopologyContracts';
import { buildPowerVoronoiFrontlineRuntime } from './planner';
import { samplePowerVoronoiFrontlineTransition } from './sampler';
import {
    buildTestGeometry,
    buildTestOwnership,
    TEST_CONQUEST_EVENT,
    TEST_TUNABLES,
} from './testFixtures';

type Vec2 = [number, number];

interface MinimalSectionDef {
    id: string;
    startVertexId: string;
    endVertexId: string;
    points: Vec2[];
    ownerPairKey?: string;
    leftOwnerId?: string;
    rightOwnerId?: string;
}

function buildMinimalTopology(
    version: string,
    vertexPoints: Record<string, Vec2>,
    sections: readonly MinimalSectionDef[],
    vertexKinds: Partial<Record<string, FrontierVertex['kind']>> = {},
): FrontierTopology {
    const vertices = new Map<string, FrontierVertex>(
        Object.entries(vertexPoints).map(([id, point]) => [
            id,
            {
                id,
                kind: vertexKinds[id] ?? 'world_corner',
                point,
                incidentSectionIds: [],
                ownerIds: ['red', 'blue', 'green'],
            },
        ]),
    );
    const builtSections = new Map<string, FrontierSection>(
        sections.map((section) => {
            const ownerPairKey = section.ownerPairKey ?? 'blue|red';
            const [ownerA, ownerB] = ownerPairKey.split('|');
            const leftOwnerId = section.leftOwnerId ?? ownerB ?? 'red';
            const rightOwnerId = section.rightOwnerId ?? ownerA ?? 'blue';
            return [
                section.id,
                {
                    id: section.id,
                    kind: 'owner_border',
                    startVertexId: section.startVertexId,
                    endVertexId: section.endVertexId,
                    leftOwnerId,
                    rightOwnerId,
                    points: section.points,
                    length: section.points.length,
                    ownerPairKey,
                    leftInfluence: {
                        ownerId: leftOwnerId,
                        primaryStarId: `${leftOwnerId}-star`,
                        primaryScore: 1,
                    },
                    rightInfluence: {
                        ownerId: rightOwnerId,
                        primaryStarId: `${rightOwnerId}-star`,
                        primaryScore: 1,
                    },
                },
            ];
        }),
    );

    const sectionsByVertex = new Map<string, string[]>();
    const sectionsByOwnerPair = new Map<string, string[]>();
    const sectionsByOwner = new Map<string, string[]>();
    for (const section of sections) {
        const startBucket = sectionsByVertex.get(section.startVertexId) ?? [];
        startBucket.push(section.id);
        sectionsByVertex.set(section.startVertexId, startBucket);
        const endBucket = sectionsByVertex.get(section.endVertexId) ?? [];
        endBucket.push(section.id);
        sectionsByVertex.set(section.endVertexId, endBucket);

        const builtSection = builtSections.get(section.id)!;
        const ownerPairBucket = sectionsByOwnerPair.get(builtSection.ownerPairKey) ?? [];
        ownerPairBucket.push(section.id);
        sectionsByOwnerPair.set(builtSection.ownerPairKey, ownerPairBucket);
        for (const ownerId of [builtSection.leftOwnerId, builtSection.rightOwnerId]) {
            const ownerBucket = sectionsByOwner.get(ownerId) ?? [];
            ownerBucket.push(section.id);
            sectionsByOwner.set(ownerId, ownerBucket);
        }
    }
    for (const [vertexId, incidentSectionIds] of sectionsByVertex) {
        const vertex = vertices.get(vertexId);
        if (vertex) {
            vertex.incidentSectionIds = [...incidentSectionIds];
        }
    }

    return {
        version,
        ownershipVersion: `ownership:${version}`,
        worldBounds: { width: 10, height: 10 },
        vertices,
        sections: builtSections,
        loops: [],
        sectionsByOwnerPair,
        sectionsByVertex,
        sectionsByOwner,
    };
}

function buildMinimalGeometry(topology: FrontierTopology): GeometrySnapshot {
    const frontierPolylines = [...topology.sections.values()].map((section) => ({
        frontierId: section.id,
        ownerA: section.rightOwnerId,
        ownerB: section.leftOwnerId,
        ownerPairKey: section.ownerPairKey,
        points: section.points,
        confidence: 1,
    }));
    const sharedFrontierMap = new Map<string, typeof frontierPolylines>();
    for (const polyline of frontierPolylines) {
        const bucket = sharedFrontierMap.get(polyline.ownerPairKey) ?? [];
        bucket.push(polyline);
        sharedFrontierMap.set(polyline.ownerPairKey, bucket);
    }
    return {
        version: topology.version,
        sourceMode: 'resolved_power_voronoi',
        sourceStyle: 'vector',
        ownershipVersion: topology.ownershipVersion,
        geometryFamily: 'vector-native',
        sourceMethod: 'power_voronoi',
        territoryRegions: [],
        frontierPolylines,
        worldBorderPolylines: [],
        sharedFrontierMap,
        frontierTopology: topology,
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
}

function withMarkerRegions(geometry: GeometrySnapshot, markerX: number): GeometrySnapshot {
    return {
        ...geometry,
        territoryRegions: [
            {
                regionId: `${geometry.version}:red-region`,
                ownerId: 'red',
                points: [
                    [markerX, 0],
                    [markerX + 1, 0],
                    [markerX, 1],
                ],
                confidence: 1,
            },
            {
                regionId: `${geometry.version}:blue-region`,
                ownerId: 'blue',
                points: [
                    [markerX, 2],
                    [markerX + 1, 2],
                    [markerX, 3],
                ],
                confidence: 1,
            },
        ],
    };
}

function expectFrameMatchesGeometry(
    frame: { regions: readonly { ownerId: string; points: readonly Vec2[] }[] },
    geometry: GeometrySnapshot,
): void {
    expect(frame.regions).toEqual(
        geometry.territoryRegions.map((region) => ({
            ownerId: region.ownerId,
            points: region.points,
        })),
    );
}

function expectPointCloseTo(actual: Vec2, expected: Vec2): void {
    expect(actual[0]).toBeCloseTo(expected[0], 6);
    expect(actual[1]).toBeCloseTo(expected[1], 6);
}

describe('buildPowerVoronoiFrontlineRuntime', () => {
    it('builds a canonical PV runtime with typed diagnostics and a local front plan', () => {
        const runtime = buildPowerVoronoiFrontlineRuntime({
            preGeometry: buildTestGeometry('pre', [[0, 0], [5, 5], [10, 10]]),
            postGeometry: buildTestGeometry('post', [[0, 0], [4, 6], [10, 10]]),
            previousOwnership: buildTestOwnership('ownership:pre'),
            nextOwnership: buildTestOwnership('ownership:post'),
            tunables: TEST_TUNABLES,
        });

        expect(runtime.plan.kind).toBe('power_voronoi_runtime');
        expect(runtime.plan.fronts).toHaveLength(1);
        expect(runtime.diagnostics.kind).toBe('power_voronoi_runtime');
        expect(runtime.diagnostics.bundleId).toBe(
            'pv-bundle:ownership:post:pv-frontline:pre:post',
        );
        expect(runtime.diagnostics.ownershipStage.stageId).toBe(
            'pv-frontline:pre:post:ownership',
        );
        expect(runtime.diagnostics.geometryStage.stageId).toBe(
            'pv-frontline:pre:post:geometry',
        );
        expect(runtime.diagnostics.transitionPlanningStage.stageId).toBe(
            'pv-frontline:pre:post:transition_planning',
        );
        expect(runtime.diagnostics.frameEvaluationStage.stageId).toBe(
            'pv-frontline:pre:post:frame_evaluation',
        );
        expect(runtime.diagnostics.geometryStage.preGeometry.version).toBe('pre');
        expect(runtime.diagnostics.ownershipStage.tunables).toEqual(TEST_TUNABLES);
        expect(runtime.diagnostics.geometryStage.tunables).toEqual(TEST_TUNABLES);
        expect(runtime.diagnostics.transitionPlanningStage.tunables).toEqual(
            TEST_TUNABLES,
        );
        expect(runtime.diagnostics.frameEvaluationStage.tunables).toEqual(
            TEST_TUNABLES,
        );
        expect(runtime.diagnostics.transitionPlanningStage.transitionPlan.planId).toBe(
            runtime.plan.planId,
        );
    });

    it('samples exact PRE and POST endpoints through the canonical PV sampler', () => {
        const preGeometry = buildTestGeometry('pre', [[0, 0], [5, 5], [10, 10]]);
        const postGeometry = buildTestGeometry('post', [[0, 0], [4, 6], [10, 10]]);
        const runtime = buildPowerVoronoiFrontlineRuntime({
            preGeometry,
            postGeometry,
            previousOwnership: buildTestOwnership('ownership:pre'),
            nextOwnership: buildTestOwnership('ownership:post'),
            tunables: TEST_TUNABLES,
        });

        const preFrame = samplePowerVoronoiFrontlineTransition(runtime, 0);
        const postFrame = samplePowerVoronoiFrontlineTransition(runtime, 1);

        expect(preFrame.regions).toHaveLength(2);
        expect(postFrame.regions).toHaveLength(2);
        expect(runtime.diagnostics.frameEvaluationStage.sampledFrames).toHaveLength(2);
        expect(runtime.diagnostics.frameEvaluationStage.currentFrame).toEqual(postFrame);
        expect(
            runtime.diagnostics.frameEvaluationStage.sampledFrames[0],
        ).toMatchObject({
            progress: 0,
            regions: 2,
            matchesPreGeometry: true,
            matchesPostGeometry: false,
        });
        expect(
            runtime.diagnostics.frameEvaluationStage.sampledFrames[1],
        ).toMatchObject({
            progress: 1,
            regions: 2,
            matchesPreGeometry: false,
            matchesPostGeometry: true,
        });
        expect(runtime.diagnostics.frameEvaluationStage.summary).toEqual({
            sampledFrameCount: 2,
            lastProgress: 1,
            lastFrontlineCount: 1,
        });
        expect(preFrame.regions[0]?.ownerId).toBe('red');
        expect(postFrame.regions[0]?.ownerId).toBe('red');
    });

    it('samples adjacent moving 3-way fronts with one shared midpoint junction coordinate', () => {
        const previousGeometry = withMarkerRegions(
            buildMinimalGeometry(
                buildMinimalTopology(
                    'moving-junction-pre',
                    {
                        a: [0, 0],
                        b: [10, 0],
                        c: [5, 10],
                        j: [5, 5],
                    },
                    [
                        {
                            id: 'front-ja',
                            startVertexId: 'j',
                            endVertexId: 'a',
                            ownerPairKey: 'blue|red',
                            points: [[5, 5], [3, 4], [0, 0]],
                        },
                        {
                            id: 'front-jb',
                            startVertexId: 'j',
                            endVertexId: 'b',
                            ownerPairKey: 'blue|green',
                            points: [[5, 5], [7, 4], [10, 0]],
                        },
                        {
                            id: 'front-jc',
                            startVertexId: 'j',
                            endVertexId: 'c',
                            ownerPairKey: 'green|red',
                            points: [[5, 5], [5, 8], [5, 10]],
                        },
                    ],
                    { j: 'junction_3way' },
                ),
            ),
            20,
        );
        const nextGeometry = withMarkerRegions(
            buildMinimalGeometry(
                buildMinimalTopology(
                    'moving-junction-post',
                    {
                        a: [0, 0],
                        b: [10, 0],
                        c: [5, 10],
                        j: [6, 5],
                    },
                    [
                        {
                            id: 'front-ja',
                            startVertexId: 'j',
                            endVertexId: 'a',
                            ownerPairKey: 'blue|red',
                            points: [[6, 5], [3.5, 4.5], [0, 0]],
                        },
                        {
                            id: 'front-jb',
                            startVertexId: 'j',
                            endVertexId: 'b',
                            ownerPairKey: 'blue|green',
                            points: [[6, 5], [7.5, 4.25], [10, 0]],
                        },
                        {
                            id: 'front-jc',
                            startVertexId: 'j',
                            endVertexId: 'c',
                            ownerPairKey: 'green|red',
                            points: [[6, 5], [5.5, 8], [5, 10]],
                        },
                    ],
                    { j: 'junction_3way' },
                ),
            ),
            40,
        );
        const runtime = buildPowerVoronoiFrontlineRuntime({
            preGeometry: previousGeometry,
            postGeometry: nextGeometry,
            previousOwnership: buildTestOwnership('ownership:pre'),
            nextOwnership: buildTestOwnership('ownership:post'),
            tunables: TEST_TUNABLES,
        });

        const preFrame = samplePowerVoronoiFrontlineTransition(runtime, 0);
        const midpointFrame = samplePowerVoronoiFrontlineTransition(runtime, 0.5);
        const postFrame = samplePowerVoronoiFrontlineTransition(runtime, 1);

        expect(runtime.plan.fronts).toHaveLength(3);
        expectFrameMatchesGeometry(preFrame, previousGeometry);
        expectFrameMatchesGeometry(postFrame, nextGeometry);
        expect(midpointFrame.regions.every((region) =>
            region.points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)),
        )).toBe(true);

        const midpointSample = runtime.diagnostics.frameEvaluationStage.sampledFrames[1];
        expect(midpointSample).toMatchObject({
            progress: 0.5,
            matchesPreGeometry: false,
        });
        expect(midpointSample?.transientFrontlines).toHaveLength(3);
        for (const transientFrontline of midpointSample?.transientFrontlines ?? []) {
            expect(transientFrontline.points.length).toBeGreaterThan(1);
            for (const [x, y] of transientFrontline.points) {
                expect(Number.isFinite(x)).toBe(true);
                expect(Number.isFinite(y)).toBe(true);
            }
        }

        const sharedJunction = midpointSample?.sharedJunctionConsistency.find(
            (candidate) => candidate.vertexId === 'j',
        );
        expect(sharedJunction).toMatchObject({
            vertexId: 'j',
            kind: 'junction_3way',
            sampleCount: 3,
            finite: true,
            consistent: true,
        });
        expectPointCloseTo(sharedJunction!.referencePoint, [5.5, 5]);
        expect(sharedJunction!.maxDistance).toBeCloseTo(0, 6);
        expect(sharedJunction!.samples.map((sample) => sample.frontId).sort()).toEqual(
            runtime.plan.fronts.map((front) => front.frontId).sort(),
        );
        for (const sample of sharedJunction!.samples) {
            expectPointCloseTo(sample.point, [5.5, 5]);
        }
    });

    it('records explicit 1to2 and 2to1 split modes for local frontier-chain changes', () => {
        const oneChain = buildMinimalGeometry(
            buildMinimalTopology(
                'one-chain',
                {
                    a: [0, 0],
                    b: [10, 10],
                },
                [
                    {
                        id: 'frontier-a',
                        startVertexId: 'a',
                        endVertexId: 'b',
                        points: [[0, 0], [5, 5], [10, 10]],
                    },
                ],
            ),
        );
        const twoChains = buildMinimalGeometry(
            buildMinimalTopology(
                'two-chains',
                {
                    a: [0, 0],
                    b: [10, 10],
                },
                [
                    {
                        id: 'frontier-a',
                        startVertexId: 'a',
                        endVertexId: 'b',
                        points: [[0, 0], [3, 4], [10, 10]],
                    },
                    {
                        id: 'frontier-b',
                        startVertexId: 'a',
                        endVertexId: 'b',
                        points: [[0, 0], [7, 6], [10, 10]],
                    },
                ],
            ),
        );

        const splitRuntime = buildPowerVoronoiFrontlineRuntime({
            preGeometry: oneChain,
            postGeometry: twoChains,
            previousOwnership: buildTestOwnership('ownership:pre', []),
            nextOwnership: buildTestOwnership('ownership:post'),
            tunables: TEST_TUNABLES,
        });
        const mergeRuntime = buildPowerVoronoiFrontlineRuntime({
            preGeometry: twoChains,
            postGeometry: oneChain,
            previousOwnership: buildTestOwnership('ownership:pre'),
            nextOwnership: buildTestOwnership('ownership:post'),
            tunables: TEST_TUNABLES,
        });

        expect(splitRuntime.plan.fronts).toHaveLength(1);
        expect(splitRuntime.plan.fronts[0]?.splitMode).toBe('1to2');
        expect(splitRuntime.plan.fronts[0]?.transitionPairs).toHaveLength(2);
        expect(mergeRuntime.plan.fronts).toHaveLength(1);
        expect(mergeRuntime.plan.fronts[0]?.splitMode).toBe('2to1');
        expect(mergeRuntime.plan.fronts[0]?.transitionPairs).toHaveLength(2);
    });

    it('reports unsupported branch counts as named transition diagnostics', () => {
        const previousGeometry = buildMinimalGeometry(
            buildMinimalTopology(
                'unsupported-pre',
                {
                    a: [0, 0],
                    b: [10, 10],
                },
                [
                    {
                        id: 'frontier-pre-a',
                        startVertexId: 'a',
                        endVertexId: 'b',
                        points: [[0, 0], [3, 4], [10, 10]],
                    },
                    {
                        id: 'frontier-pre-b',
                        startVertexId: 'a',
                        endVertexId: 'b',
                        points: [[0, 0], [7, 6], [10, 10]],
                    },
                ],
            ),
        );
        const nextGeometry = buildMinimalGeometry(
            buildMinimalTopology(
                'unsupported-post',
                {
                    a: [0, 0],
                    b: [10, 10],
                },
                [
                    {
                        id: 'frontier-post-a',
                        startVertexId: 'a',
                        endVertexId: 'b',
                        points: [[0, 0], [2, 5], [10, 10]],
                    },
                    {
                        id: 'frontier-post-b',
                        startVertexId: 'a',
                        endVertexId: 'b',
                        points: [[0, 0], [8, 5], [10, 10]],
                    },
                ],
            ),
        );

        const runtime = buildPowerVoronoiFrontlineRuntime({
            preGeometry: previousGeometry,
            postGeometry: nextGeometry,
            previousOwnership: buildTestOwnership('ownership:pre'),
            nextOwnership: buildTestOwnership('ownership:post'),
            tunables: TEST_TUNABLES,
        });

        expect(runtime.plan.fronts).toHaveLength(0);
        expect(runtime.diagnostics.transitionPlanningStage.unsupportedFronts).toEqual([
            expect.objectContaining({
                ownerPairKey: 'blue|red',
                anchorStartId: 'a',
                anchorEndId: 'b',
                preChainCount: 2,
                postChainCount: 2,
                attemptedSplitMode: '2to2',
                reason: 'unsupported_branch_count',
                fallback: 'unsupported_front_skipped',
            }),
        ]);
        expect(runtime.diagnostics.transitionPlanningStage.summary).toMatchObject({
            transitionFrontCount: 0,
            unsupportedFrontCount: 1,
            unsupportedSplitModes: ['2to2'],
        });
    });

    it('plans disjoint changed fronts independently within one transition envelope', () => {
        const previousGeometry = buildMinimalGeometry(
            buildMinimalTopology(
                'disjoint-pre',
                {
                    a: [0, 0],
                    b: [10, 10],
                    c: [20, 0],
                    d: [30, 10],
                },
                [
                    {
                        id: 'frontier-ab',
                        startVertexId: 'a',
                        endVertexId: 'b',
                        points: [[0, 0], [5, 5], [10, 10]],
                    },
                    {
                        id: 'frontier-cd',
                        startVertexId: 'c',
                        endVertexId: 'd',
                        points: [[20, 0], [25, 5], [30, 10]],
                    },
                ],
            ),
        );
        const nextGeometry = buildMinimalGeometry(
            buildMinimalTopology(
                'disjoint-post',
                {
                    a: [0, 0],
                    b: [10, 10],
                    c: [20, 0],
                    d: [30, 10],
                },
                [
                    {
                        id: 'frontier-ab',
                        startVertexId: 'a',
                        endVertexId: 'b',
                        points: [[0, 0], [4, 6], [10, 10]],
                    },
                    {
                        id: 'frontier-cd',
                        startVertexId: 'c',
                        endVertexId: 'd',
                        points: [[20, 0], [26, 4], [30, 10]],
                    },
                ],
            ),
        );

        const runtime = buildPowerVoronoiFrontlineRuntime({
            preGeometry: previousGeometry,
            postGeometry: nextGeometry,
            previousOwnership: buildTestOwnership('ownership:pre', []),
            nextOwnership: buildTestOwnership('ownership:post', [
                TEST_CONQUEST_EVENT,
                {
                    starId: 'gamma',
                    previousOwner: 'blue',
                    newOwner: 'red',
                    atMs: 110,
                },
            ]),
            tunables: TEST_TUNABLES,
        });

        expect(runtime.plan.fronts).toHaveLength(2);
        expect(runtime.diagnostics.ownershipStage.summary.conquestCount).toBe(2);
        expect(runtime.diagnostics.transitionPlanningStage.summary).toMatchObject({
            transitionFrontCount: 2,
            transitionPairCount: 2,
        });
    });
});
