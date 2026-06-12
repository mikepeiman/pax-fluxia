/// <reference lib="webworker" />

import {
    buildGridGradientPlanFromParts,
} from './plan';
import {
    inflateGridGradientWorkerGeometry,
    type GridGradientPlanWorkerRequest,
    type GridGradientPlanWorkerResponse,
} from './gridGradientPlanWorkerTypes';
import type { GridGradientOwnerGrid } from './typedClassification';

const workerScope = self as DedicatedWorkerGlobalScope;
const ownerGridCache = new Map<string, GridGradientOwnerGrid>();

workerScope.onmessage = (event: MessageEvent<GridGradientPlanWorkerRequest>) => {
    const request = event.data;
    const startMs = performance.now();
    const plan = buildGridGradientPlanFromParts({
        world: request.world,
        stars: request.stars,
        prevGeometry: inflateGridGradientWorkerGeometry(request.prevGeometry),
        geometry: inflateGridGradientWorkerGeometry(request.geometry),
        settings: request.settings,
        planKey: request.planKey,
        activeTransition: request.activeTransition,
        ownerGridCache,
    });
    const response: GridGradientPlanWorkerResponse = {
        requestId: request.requestId,
        planKey: request.planKey,
        plan,
        workerBuildMs: performance.now() - startMs,
    };
    workerScope.postMessage(response);
};
