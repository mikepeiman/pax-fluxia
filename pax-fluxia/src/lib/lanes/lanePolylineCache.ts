// ============================================================================
// Runtime cache of lane polylines per undirected edge (normalized id order).
// Filled from mapgen results or rebuilt when links, clearance, or mode change.
// ============================================================================

import {
    attachLaneWaypointsToConnections,
    type MapLaneMode,
    type MapConnection,
} from '@pax/common/mapgen';
import { log } from '../utils/logger';

const cache = new Map<string, [number, number][]>();

interface LaneEndpointPoint {
    x: number;
    y: number;
}

// Fix-engagement diagnostic: proves at runtime whether the storage normalization
// fix is loaded and actually reversing reversed-order input. Fires once per process.
// If nothing logs, the fix never sees reversed-order input (map is too small or
// dev server is stale). If "reversed" logs, the fix is engaged and working.
let storageFixDiagFired = false;

function logStorageFixEngagement(sourceId: string, targetId: string, reversed: boolean): void {
    if (storageFixDiagFired) return;
    storageFixDiagFired = true;
    log.sys('LaneCache', 'first write diagnostic', {
        firstEdgeWritten: { sourceId, targetId },
        nonNormalizedInput: sourceId > targetId,
        reversedAtStorage: reversed,
        note: reversed
            ? 'Fix ENGAGED: reversed-order input reversed to normalized storage.'
            : 'First write already matched normalized order; the fix will engage if reversed-order input arrives.',
    });
}

export function edgeKey(a: string, b: string): string {
    return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

export function waypointsNeedReverseForEndpoints(
    waypoints: ReadonlyArray<readonly [number, number]>,
    source: LaneEndpointPoint,
    target: LaneEndpointPoint,
): boolean {
    if (waypoints.length < 2) return false;

    const first = waypoints[0];
    const last = waypoints[waypoints.length - 1];
    const firstToSource = Math.hypot(first[0] - source.x, first[1] - source.y);
    const firstToTarget = Math.hypot(first[0] - target.x, first[1] - target.y);
    const lastToSource = Math.hypot(last[0] - source.x, last[1] - source.y);
    const lastToTarget = Math.hypot(last[0] - target.x, last[1] - target.y);

    return firstToTarget < firstToSource || lastToSource < lastToTarget;
}

export function normalizeLaneWaypointsForStorage(
    sourceId: string,
    targetId: string,
    waypoints: ReadonlyArray<readonly [number, number]>,
    endpoints?: {
        source: LaneEndpointPoint;
        target: LaneEndpointPoint;
    },
): [number, number][] {
    const sourceOrdered = waypoints.map((point) => [point[0], point[1]] as [number, number]);
    const correctedSourceOrdered =
        endpoints && waypointsNeedReverseForEndpoints(sourceOrdered, endpoints.source, endpoints.target)
            ? sourceOrdered.slice().reverse()
            : sourceOrdered;

    if (sourceId <= targetId) {
        return correctedSourceOrdered;
    }

    return correctedSourceOrdered.slice().reverse();
}

export function clearLanePolylineCache(): void {
    cache.clear();
    storageFixDiagFired = false;
}

export function normalizedUniConnections(
    connections: Iterable<{ sourceId: string; targetId: string }>,
): { sourceId: string; targetId: string }[] {
    const seen = new Set<string>();
    const out: { sourceId: string; targetId: string }[] = [];

    for (const connection of connections) {
        const sourceId = connection.sourceId <= connection.targetId ? connection.sourceId : connection.targetId;
        const targetId = connection.sourceId <= connection.targetId ? connection.targetId : connection.sourceId;
        const key = `${sourceId}|${targetId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ sourceId, targetId });
    }

    return out;
}

export function seedLanePolylineCacheFromMapGen(
    connections: ReadonlyArray<{
        sourceId: string;
        targetId: string;
        laneWaypoints?: readonly [number, number][];
    }>,
): void {
    cache.clear();

    for (const connection of connections) {
        if (connection.laneWaypoints && connection.laneWaypoints.length >= 2) {
            // Storage contract: waypoints are always kept in normalized
            // (sourceId <= targetId) direction so getDirectedLanePolyline can
            // rely on storage-direction == key-direction.
            const waypoints = normalizeLaneWaypointsForStorage(
                connection.sourceId,
                connection.targetId,
                connection.laneWaypoints,
            );
            const reversed = connection.sourceId > connection.targetId;
            logStorageFixEngagement(connection.sourceId, connection.targetId, reversed);
            cache.set(edgeKey(connection.sourceId, connection.targetId), waypoints);
        }
    }
}

export function rebuildLanePolylineCache(
    nodes: Array<{ id: string; x: number; y: number }>,
    uniConnections: Array<{ sourceId: string; targetId: string }>,
    mode: MapLaneMode,
    // Lane margin: minimum distance from sampled centerline to non-endpoint stars.
    laneObstacleClearancePx: number,
): MapConnection[] {
    cache.clear();
    if (nodes.length < 2 || uniConnections.length === 0) return [];

    const connections: MapConnection[] = uniConnections.map((connection) => ({
        sourceId: connection.sourceId,
        targetId: connection.targetId,
        distance: 0,
    }));

    attachLaneWaypointsToConnections(
        nodes,
        connections,
        mode,
        Math.max(0, laneObstacleClearancePx),
    );

    for (const connection of connections) {
        if (connection.laneWaypoints && connection.laneWaypoints.length >= 2) {
            const waypoints = normalizeLaneWaypointsForStorage(
                connection.sourceId,
                connection.targetId,
                connection.laneWaypoints,
            );
            const reversed = connection.sourceId > connection.targetId;
            logStorageFixEngagement(connection.sourceId, connection.targetId, reversed);
            cache.set(edgeKey(connection.sourceId, connection.targetId), waypoints);
        }
    }

    return connections;
}

export function getLanePolyline(sourceId: string, targetId: string): [number, number][] | undefined {
    return cache.get(edgeKey(sourceId, targetId));
}

export function getDirectedLanePolyline(
    sourceId: string,
    targetId: string,
): [number, number][] | undefined {
    const polyline = cache.get(edgeKey(sourceId, targetId));
    if (!polyline || polyline.length < 2) return polyline;
    if (sourceId <= targetId) return polyline;

    return polyline
        .slice()
        .reverse()
        .map((point) => [point[0], point[1]] as [number, number]);
}
