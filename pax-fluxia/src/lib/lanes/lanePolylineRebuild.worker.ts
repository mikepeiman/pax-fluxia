/// <reference lib="webworker" />

import { attachLaneWaypointsToConnections, type MapConnection } from '@pax/common/mapgen';
import type {
    LanePolylineRebuildWorkerRequest,
    LanePolylineRebuildWorkerResponse,
} from './lanePolylineRebuildWorkerTypes';

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.addEventListener(
    'message',
    (event: MessageEvent<LanePolylineRebuildWorkerRequest>) => {
        const request = event.data;
        const startedAt = performance.now();

        const connections: MapConnection[] = request.connections.map((connection) => ({
            sourceId: connection.sourceId,
            targetId: connection.targetId,
            distance: 0,
        }));

        attachLaneWaypointsToConnections(
            request.nodes,
            connections,
            request.mode,
            Math.max(0, request.clearancePx),
        );

        const response: LanePolylineRebuildWorkerResponse = {
            requestId: request.requestId,
            elapsedMs: performance.now() - startedAt,
            connections,
        };
        workerScope.postMessage(response);
    },
);
