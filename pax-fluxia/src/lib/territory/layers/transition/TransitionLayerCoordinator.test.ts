import { describe, expect, it } from 'vitest';
import type { TransitionSnapshot } from '../../contracts/TransitionContracts';
import { TransitionLayerCoordinator } from './TransitionLayerCoordinator';
import {
    buildTestGeometry,
    buildTestOwnership,
    TEST_PV_FRONTLINE_SELECTION,
    TEST_TUNABLES,
} from '../../pvFrontline/testFixtures';

function buildStaticSnapshot(geometryVersion: string): TransitionSnapshot {
    return {
        geometryVersion,
        envelope: null,
        fillFrame: { regions: [] },
        borderFrame: { frontiers: [] },
    };
}

describe('TransitionLayerCoordinator', () => {
    it('builds and samples a PV frontline transition from paired PRE/POST geometry', () => {
        const coordinator = new TransitionLayerCoordinator();
        const preGeometry = buildTestGeometry('pre', [[0, 0], [5, 5], [10, 10]]);
        const postGeometry = buildTestGeometry('post', [[0, 0], [4, 6], [10, 10]]);
        const previousOwnership = buildTestOwnership('ownership:pre');
        const nextOwnership = buildTestOwnership('ownership:post');

        const result = coordinator.compute({
            nowMs: 100,
            tunables: TEST_TUNABLES,
            selection: TEST_PV_FRONTLINE_SELECTION,
            ownership: nextOwnership,
            previousOwnership,
            geometry: postGeometry,
            previousGeometry: preGeometry,
            previousTransition: buildStaticSnapshot(preGeometry.version),
            activeFillPlan: null,
            activeFrontPlan: null,
            activePvFrontlineTransition: null,
            resolvedPowerVoronoiPair: {
                preGeometry,
                postGeometry,
                previousOwnership,
                nextOwnership,
            },
            transitionPrevTopology: null,
        });

        expect(result.activePvFrontlineTransition?.plan.kind).toBe(
            'power_voronoi_runtime',
        );
        expect(result.activePvFrontlineTransition?.plan.fronts).toHaveLength(1);
        expect(
            result.activePvFrontlineTransition?.diagnostics.transitionPlanningStage.summary,
        ).toMatchObject({
            transitionFrontCount: 1,
            transitionPairCount: 1,
        });
        expect(
            result.activePvFrontlineTransition?.diagnostics.frameEvaluationStage.sampledFrames[0],
        ).toMatchObject({
            progress: 0,
            matchesPreGeometry: true,
            matchesPostGeometry: false,
        });
        expect(result.activeFrontPlan).toBe(
            result.activePvFrontlineTransition?.activeFrontPlan,
        );
        expect(result.transitionPrevTopology).toBe(preGeometry.frontierTopology);
        expect(result.snapshot.envelope?.transitionId).toBe('transition:100');
        expect(result.snapshot.fillFrame.regions).toHaveLength(2);
    });

    it('cancels an active PV frontline transition when geometry retunes without a new conquest', () => {
        const coordinator = new TransitionLayerCoordinator();
        const preGeometry = buildTestGeometry('pre', [[0, 0], [5, 5], [10, 10]]);
        const postGeometry = buildTestGeometry('post', [[0, 0], [4, 6], [10, 10]]);
        const retunedGeometry = buildTestGeometry('retuned', [[0, 0], [3, 7], [10, 10]]);
        const previousOwnership = buildTestOwnership('ownership:pre');
        const conquestOwnership = buildTestOwnership('ownership:post');

        const started = coordinator.compute({
            nowMs: 100,
            tunables: TEST_TUNABLES,
            selection: TEST_PV_FRONTLINE_SELECTION,
            ownership: conquestOwnership,
            previousOwnership,
            geometry: postGeometry,
            previousGeometry: preGeometry,
            previousTransition: buildStaticSnapshot(preGeometry.version),
            activeFillPlan: null,
            activeFrontPlan: null,
            activePvFrontlineTransition: null,
            resolvedPowerVoronoiPair: {
                preGeometry,
                postGeometry,
                previousOwnership,
                nextOwnership: conquestOwnership,
            },
            transitionPrevTopology: null,
        });

        const steadyOwnership = buildTestOwnership('ownership:steady', []);
        const cancelled = coordinator.compute({
            nowMs: 220,
            tunables: {
                ...TEST_TUNABLES,
                frontierResolution: TEST_TUNABLES.frontierResolution + 2,
            },
            selection: TEST_PV_FRONTLINE_SELECTION,
            ownership: steadyOwnership,
            previousOwnership: conquestOwnership,
            geometry: retunedGeometry,
            previousGeometry: postGeometry,
            previousTransition: started.snapshot,
            activeFillPlan: started.activeFillPlan,
            activeFrontPlan: started.activeFrontPlan,
            activePvFrontlineTransition: started.activePvFrontlineTransition,
            resolvedPowerVoronoiPair: null,
            transitionPrevTopology: started.transitionPrevTopology,
        });

        expect(started.snapshot.envelope).not.toBeNull();
        expect(cancelled.snapshot.envelope).toBeNull();
        expect(cancelled.activePvFrontlineTransition).toBeNull();
        expect(cancelled.activeFrontPlan).toBeNull();
        expect(cancelled.transitionPrevTopology).toBeNull();
        expect(cancelled.snapshot.fillFrame.regions).toHaveLength(2);
    });
});
