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
}

function buildMinimalTopology(
    version: string,
    vertexPoints: Record<string, Vec2>,
    sections: readonly MinimalSectionDef[],
): FrontierTopology {
    const vertices = new Map<string, FrontierVertex>(
        Object.entries(vertexPoints).map(([id, point]) => [
            id,
            {
                id,
                kind: 'world_corner',
                point,
                incidentSectionIds: [],
                ownerIds: ['red', 'blue'],
            },
        ]),
    );
    const builtSections = new Map<string, FrontierSection>(
        sections.map((section) => [
            section.id,
            {
                id: section.id,
                kind: 'owner_border',
                startVertexId: section.startVertexId,
                endVertexId: section.endVertexId,
                leftOwnerId: 'red',
                rightOwnerId: 'blue',
                points: section.points,
                length: section.points.length,
                ownerPairKey: 'blue|red',
                leftInfluence: {
                    ownerId: 'red',
                    primaryStarId: 'red-star',
                    primaryScore: 1,
                },
                rightInfluence: {
                    ownerId: 'blue',
                    primaryStarId: 'blue-star',
                    primaryScore: 1,
                },
            },
        ]),
    );

    const sectionsByVertex = new Map<string, string[]>();
    for (const section of sections) {
        const startBucket = sectionsByVertex.get(section.startVertexId) ?? [];
        startBucket.push(section.id);
        sectionsByVertex.set(section.startVertexId, startBucket);
        const endBucket = sectionsByVertex.get(section.endVertexId) ?? [];
        endBucket.push(section.id);
        sectionsByVertex.set(section.endVertexId, endBucket);
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
        sectionsByOwnerPair: new Map([['blue|red', sections.map((section) => section.id)]]),
        sectionsByVertex,
        sectionsByOwner: new Map([
            ['red', sections.map((section) => section.id)],
            ['blue', sections.map((section) => section.id)],
        ]),
    };
}

function buildMinimalGeometry(topology: FrontierTopology): GeometrySnapshot {
    const frontierPolylines = [...topology.sections.values()].map((section) => ({
        frontierId: section.id,
        ownerA: 'blue',
        ownerB: 'red',
        ownerPairKey: section.ownerPairKey,
        points: section.points,
        confidence: 1,
    }));
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
        sharedFrontierMap: new Map([['blue|red', frontierPolylines]]),
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
