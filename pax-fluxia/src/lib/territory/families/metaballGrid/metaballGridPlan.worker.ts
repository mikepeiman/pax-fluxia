/// <reference lib="webworker" />

import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
import { buildGridClassification } from './buildGridClassification';
import { planGridWave } from './planGridWave';
import type {
    MetaballGridPlanWorkerRequest,
    MetaballGridPlanWorkerResponse,
} from './metaballGridPlanWorkerTypes';

const workerScope = self as DedicatedWorkerGlobalScope;

function buildStarPositionResolver(
    starPositions: readonly { id: string; x: number; y: number }[],
): (starId: string) => { x: number; y: number } | null {
    const byId = new Map<string, { x: number; y: number }>();
    for (let i = 0; i < starPositions.length; i++) {
        const star = starPositions[i]!;
        byId.set(star.id, { x: star.x, y: star.y });
    }
    return (starId: string) => byId.get(starId) ?? null;
}

workerScope.onmessage = (event: MessageEvent<MetaballGridPlanWorkerRequest>) => {
    const request = event.data;
    const resolveStarPosition = buildStarPositionResolver(request.starPositions);
    const prevGeometry = {
        territoryRegions: request.prevRegions,
    } as CanonicalGeometrySnapshot;
    const nextGeometry = request.sameSnapshot
        ? prevGeometry
        : ({
              territoryRegions: request.nextRegions,
          } as CanonicalGeometrySnapshot);
    const nextOwnedStars = request.sameSnapshot
        ? request.prevOwnedStars
        : request.nextOwnedStars;

    const classificationStartMs = performance.now();
    const classification = buildGridClassification({
        world: request.world,
        spacingPx: request.spacingPx,
        originMode: request.originMode,
        prevGeometry,
        nextGeometry,
        conquestEvents: request.conquestEvents,
        resolveStarPosition,
        prevOwnedStars: request.prevOwnedStars,
        nextOwnedStars,
        maxCells: request.maxCells,
        distribution: request.distribution,
        positionJitter: request.positionJitter,
    });
    const classificationBuildMs = performance.now() - classificationStartMs;

    const wavePlanStartMs = performance.now();
    const wavePlan = planGridWave({
        classification,
        seeding: request.waveSeeding,
        geometry: request.waveGeometry,
        adjacency: request.adjacency,
        conquestEvents: request.conquestEvents,
        resolveStarPosition,
    });
    const wavePlanBuildMs = performance.now() - wavePlanStartMs;

    const response: MetaballGridPlanWorkerResponse = {
        requestId: request.requestId,
        planKey: request.planKey,
        classification,
        wavePlan,
        classificationBuildMs,
        wavePlanBuildMs,
        planBuildMs: classificationBuildMs + wavePlanBuildMs,
    };
    workerScope.postMessage(response);
};
