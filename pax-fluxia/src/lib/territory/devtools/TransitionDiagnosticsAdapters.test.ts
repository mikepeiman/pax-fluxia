import { describe, expect, it } from 'vitest';
import type { TransitionDebugBundle } from './TransitionSnapshotRecorder';
import { resolveTransitionDiagnosticsExportAdapter } from './TransitionDiagnosticsAdapters';

const TEST_CONQUEST_EVENT = {
    tick: 7,
    starId: 'beta',
    previousOwner: 'red',
    newOwner: 'blue',
} as const;

const TEST_SELECTION = {
    ownershipMode: 'star_ownership_snapshot',
    geometryMode: 'canonical_power_voronoi',
    fillTransitionMode: 'pv_frontline',
    borderTransitionMode: 'off',
    styleMode: 'canonical',
} as const;

function buildMockTopology(version: string) {
    return {
        version,
        ownershipVersion: `ownership:${version}`,
        worldBounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        vertices: new Map([
            ['v0', { id: 'v0', point: [0, 0], kind: 'world_corner' }],
            ['v1', { id: 'v1', point: [10, 10], kind: 'world_corner' }],
        ]),
        sections: new Map([
            [
                's0',
                {
                    id: 's0',
                    kind: 'frontier',
                    startVertexId: 'v0',
                    endVertexId: 'v1',
                    leftOwnerId: 'red',
                    rightOwnerId: 'blue',
                    ownerPairKey: 'blue|red',
                    length: 14.14,
                    points: [
                        [0, 0],
                        [5, 5],
                        [10, 10],
                    ],
                    leftInfluence: 1,
                    rightInfluence: 1,
                },
            ],
        ]),
        loops: [
            {
                id: 'loop:alpha',
                ownerId: 'blue',
                componentId: 'component:alpha',
                sectionRefs: ['s0'],
                signedArea: 50,
            },
        ],
        sectionsByOwnerPair: new Map([['blue|red', ['s0']]]),
    } as any;
}

function buildMockGeometry(version: string) {
    const topology = buildMockTopology(version);
    return {
        version,
        sourceMode: 'canonical_power_voronoi',
        sourceStyle: 'canonical',
        ownershipVersion: `ownership:${version}`,
        geometryFamily: 'canonical',
        sourceMethod: 'test',
        territoryRegions: [
            {
                regionId: `region:${version}`,
                ownerId: 'blue',
                starIds: ['alpha', 'beta'],
                confidence: 1,
                points: [
                    [0, 0],
                    [10, 0],
                    [10, 10],
                ],
            },
        ],
        frontierPolylines: [
            {
                frontierId: `frontier:${version}`,
                ownerPairKey: 'blue|red',
                ownerA: 'blue',
                ownerB: 'red',
                confidence: 1,
                closed: false,
                points: [
                    [0, 0],
                    [5, 5],
                    [10, 10],
                ],
            },
        ],
        worldBorderPolylines: [],
        sharedFrontierMap: new Map<string, unknown[]>(),
        frontierTopology: topology,
        shells: [
            {
                shellId: `shell:${version}`,
                ownerId: 'blue',
                starIds: ['alpha', 'beta'],
                area: 100,
                absArea: 100,
                confidence: 1,
                points: [
                    [0, 0],
                    [10, 0],
                    [10, 10],
                ],
                holeLoopIds: [],
            },
        ],
        shellLoops: [
            {
                shellLoopId: `shell-loop:${version}`,
                shellId: `shell:${version}`,
                ownerId: 'blue',
                starIds: ['alpha', 'beta'],
                classification: 'outer',
                confidence: 1,
                points: [
                    [0, 0],
                    [10, 0],
                    [10, 10],
                ],
            },
        ],
        provenance: null,
        diagnostics: {},
    } as any;
}

function buildMockOwnership(version: string) {
    return {
        version,
        conquestEvents: [TEST_CONQUEST_EVENT],
        starOwners: new Map([
            ['alpha', 'red'],
            ['beta', 'blue'],
        ]),
    } as any;
}

function buildBundle(extraDiagnostics: unknown): TransitionDebugBundle {
    const previousGeometry = buildMockGeometry('pre');
    const nextGeometry = buildMockGeometry('post');
    const previousOwnership = buildMockOwnership('ownership:pre');
    const nextOwnership = buildMockOwnership('ownership:post');

    return {
        id: 'bundle:test',
        timestamp: '2026-05-04T12:00:00.000Z',
        conquestEvents: [TEST_CONQUEST_EVENT],
        context: {
            conquestEvents: [TEST_CONQUEST_EVENT],
            previousGeometry,
            nextGeometry,
            previousOwnership,
            nextOwnership,
            transition: {
                geometryVersion: nextGeometry.version,
                envelope: null,
                fillFrame: { regions: [] },
                borderFrame: { frontiers: [] },
            },
            fillPlan: null,
            activeFrontPlan: null,
            prevFrontierTopology: previousGeometry.frontierTopology,
            nextFrontierTopology: nextGeometry.frontierTopology,
            selection: TEST_SELECTION,
            nowMs: 100,
            starPositions: new Map([
                ['alpha', { x: 1, y: 1 }],
                ['beta', { x: 9, y: 9 }],
            ]),
            worldWidth: 10,
            worldHeight: 10,
            extraDiagnostics,
        },
        prevCanvas: null,
        nextCanvas: null,
        frontierDiff: {
            drifted: [],
            staticPolylines: [],
            appearedKeyOrSegment: [],
            removedKeyOrSegment: [],
        },
        starPositions: new Map([
            ['alpha', { x: 1, y: 1 }],
            ['beta', { x: 9, y: 9 }],
        ]),
        transitionFrames: null,
        extraDiagnostics,
        meta: {
            timestamp: '2026-05-04T12:00:00.000Z',
            tick: 1,
            transitionId: 'transition:100',
            conquestEvents: [TEST_CONQUEST_EVENT],
            prevOwnershipVersion: previousOwnership.version,
            nextOwnershipVersion: nextOwnership.version,
            prevGeometryFingerprint: previousGeometry.version,
            nextGeometryFingerprint: nextGeometry.version,
            modes: {
                geometry: 'canonical_power_voronoi',
                fillTransition: 'pv_frontline',
                borderTransition: 'off',
            },
            polylineDiffSemantics: 'test',
            changeSummary: {
                polylineDriftedCount: 0,
                polylineStaticCount: 0,
                polylineKeyOrSegmentAppearedCount: 0,
                polylineKeyOrSegmentRemovedCount: 0,
                affectedTerritoryCount: 2,
            },
            files: [],
        },
    };
}

describe('resolveTransitionDiagnosticsExportAdapter', () => {
    it('routes canonical PV diagnostics through the canonical export adapter', () => {
        const bundle = buildBundle({
            kind: 'power_voronoi_canonical',
            bundleId: 'bundle:canonical',
            modeId: 'power_voronoi_canonical',
            planId: 'pv-frontline:pre:post',
            ownershipStage: {
                stageId: 'O01',
                summary: {
                    conquestCount: 1,
                },
                previousOwnership: {
                    version: 'ownership:pre',
                },
                nextOwnership: {
                    version: 'ownership:post',
                },
            },
            geometryStage: {
                stageId: 'G01',
                summary: {},
                preGeometry: {
                    version: 'pre',
                },
                postGeometry: {
                    version: 'post',
                },
            },
            transitionPlanningStage: {
                stageId: 'T01',
                summary: {
                    transitionFrontCount: 1,
                },
                transitionPlan: {
                    fronts: [{ frontId: 'front:1' }],
                    unaffectedLoopIds: [],
                },
            },
            frameEvaluationStage: {
                stageId: 'F01',
                summary: {
                    sampledFrameCount: 2,
                    lastProgress: 1,
                    lastFrontlineCount: 1,
                },
                sampledFrames: [
                    {
                        sampleId: 'sample:0',
                        progress: 0,
                        regions: 1,
                        transientFrontlines: [],
                        matchesPreGeometry: true,
                        matchesPostGeometry: false,
                    },
                    {
                        sampleId: 'sample:1',
                        progress: 1,
                        regions: 1,
                        transientFrontlines: [{ frontId: 'front:1' }],
                        matchesPreGeometry: false,
                        matchesPostGeometry: true,
                    },
                ],
            },
        });

        const adapter = resolveTransitionDiagnosticsExportAdapter(
            bundle.extraDiagnostics,
        );
        expect(adapter?.kind).toBe('power_voronoi_canonical');

        const exportData = adapter?.buildData(bundle, []);
        expect(exportData?.exportKind).toBe('power_voronoi_canonical');
        expect(exportData?.previousGeometry).not.toBeNull();
        expect(exportData?.nextGeometry).not.toBeNull();
        expect(exportData?.previousTopology).not.toBeNull();
        expect(exportData?.nextTopology).not.toBeNull();
        expect(exportData?.starPositions).toEqual({
            alpha: { x: 1, y: 1 },
            beta: { x: 9, y: 9 },
        });
        expect(exportData?.captureDiagnostics).toMatchObject({
            kind: 'power_voronoi_canonical',
            planId: 'pv-frontline:pre:post',
            ownershipStage: {
                previousOwnershipVersion: 'ownership:pre',
                nextOwnershipVersion: 'ownership:post',
                summary: {
                    conquestCount: 1,
                },
            },
            geometryStage: {
                preGeometryVersion: 'pre',
                postGeometryVersion: 'post',
            },
            transitionPlanningStage: {
                summary: {
                    transitionFrontCount: 1,
                },
                unaffectedLoopIds: [],
            },
            frameEvaluationStage: {
                summary: {
                    sampledFrameCount: 2,
                    lastProgress: 1,
                    lastFrontlineCount: 1,
                },
                lastSample: {
                    progress: 1,
                    matchesPostGeometry: true,
                },
            },
        });
    });

    it('routes active-front live capture diagnostics through the active-front export adapter', () => {
        const bundle = buildBundle({
            kind: 'active_front_live_capture',
            activeFrontDebug: {
                evaluation: 'snap_no_fronts',
                pathUsed: 'pv_frontline',
                transitionActive: true,
                transitionSelected: true,
                topologyPathSelected: true,
                hasNewConquests: true,
                hasGeometryDelta: true,
                topologyAvailable: {
                    planPrev: true,
                    next: true,
                    samplePrev: true,
                },
                frontCount: 0,
                collapseTargetCount: 0,
                sampledProgress: 0.5,
                planSummary: {
                    classification: 'snap_no_fronts',
                    stableAnchorCount: 6,
                    prevChainCount: 4,
                    nextChainCount: 4,
                    pairCount: 4,
                    plannedPairCount: 0,
                    skippedTopologyGapCount: 1,
                    skippedUnsupportedSplitCount: 0,
                    skippedNoChangeSpanCount: 3,
                    frontCount: 0,
                    activeSectionCount: 0,
                    collapseTargetCount: 0,
                },
            },
            activeFrontPlan: {
                diagnostics: {
                    summary: {
                        classification: 'snap_no_fronts',
                    },
                },
            },
        });

        const adapter = resolveTransitionDiagnosticsExportAdapter(
            bundle.extraDiagnostics,
        );
        expect(adapter?.kind).toBe('active_front_live_capture');

        const exportData = adapter?.buildData(bundle, []);
        expect(exportData?.exportKind).toBe('active_front_live_capture');
        expect(exportData?.captureDiagnostics).toMatchObject({
            kind: 'active_front_live_capture',
            activeFrontDebug: {
                evaluation: 'snap_no_fronts',
                frontCount: 0,
            },
        });
    });
});
