import { describe, expect, it } from 'vitest';
import type { TransitionDebugBundle } from './TransitionSnapshotRecorder';
import { resolveTransitionDiagnosticsExportAdapter } from './TransitionDiagnosticsAdapters';
import { buildPowerVoronoiFrontlineRuntime } from '../pvFrontline/planner';
import { samplePowerVoronoiFrontlineTransition } from '../pvFrontline/sampler';
import {
    buildTestGeometry,
    buildTestOwnership,
    TEST_CONQUEST_EVENT,
    TEST_PV_FRONTLINE_SELECTION,
    TEST_TUNABLES,
} from '../pvFrontline/testFixtures';

function buildBundle(): TransitionDebugBundle {
    const previousGeometry = buildTestGeometry('pre', [[0, 0], [5, 5], [10, 10]]);
    const nextGeometry = buildTestGeometry('post', [[0, 0], [4, 6], [10, 10]]);
    const previousOwnership = buildTestOwnership('ownership:pre', []);
    const nextOwnership = buildTestOwnership('ownership:post', [TEST_CONQUEST_EVENT]);
    const runtime = buildPowerVoronoiFrontlineRuntime({
        preGeometry: previousGeometry,
        postGeometry: nextGeometry,
        previousOwnership,
        nextOwnership,
        tunables: TEST_TUNABLES,
    });
    samplePowerVoronoiFrontlineTransition(runtime, 0);
    samplePowerVoronoiFrontlineTransition(runtime, 1);

    return {
        id: 'bundle:runtime-pv',
        timestamp: '2026-04-27T22:00:00.000Z',
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
            selection: TEST_PV_FRONTLINE_SELECTION,
            nowMs: 100,
            starPositions: new Map([
                ['alpha', { x: 1, y: 1 }],
                ['beta', { x: 9, y: 9 }],
            ]),
            worldWidth: 10,
            worldHeight: 10,
            extraDiagnostics: runtime.diagnostics,
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
        extraDiagnostics: runtime.diagnostics,
        meta: {
            timestamp: '2026-04-27T22:00:00.000Z',
            tick: 1,
            transitionId: 'transition:100',
            conquestEvents: [TEST_CONQUEST_EVENT],
            prevOwnershipVersion: previousOwnership.version,
            nextOwnershipVersion: nextOwnership.version,
            prevGeometryFingerprint: previousGeometry.version,
            nextGeometryFingerprint: nextGeometry.version,
            modes: {
                geometry: 'resolved_power_voronoi',
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
    it('routes resolved PV diagnostics through the runtime export adapter', () => {
        const bundle = buildBundle();
        const adapter = resolveTransitionDiagnosticsExportAdapter(bundle.extraDiagnostics);

        expect(adapter?.kind).toBe('power_voronoi_runtime');

        const exportData = adapter?.buildData(bundle, []);
        expect(exportData?.exportKind).toBe('power_voronoi_runtime');
        expect(exportData?.previousGeometry).not.toBeNull();
        expect(exportData?.nextGeometry).not.toBeNull();
        expect(exportData?.previousTopology).not.toBeNull();
        expect(exportData?.nextTopology).not.toBeNull();
        expect(exportData?.starPositions).toEqual({
            alpha: { x: 1, y: 1 },
            beta: { x: 9, y: 9 },
        });
        expect(exportData?.captureDiagnostics).toMatchObject({
            kind: 'power_voronoi_runtime',
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
});
