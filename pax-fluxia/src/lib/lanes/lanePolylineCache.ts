// ============================================================================
// Runtime cache of lane polylines per undirected edge (canonical id order).
// Filled from mapgen results or rebuilt when links / clearance / mode change.
// ============================================================================

import { attachLaneWaypointsToConnections, type MapLaneMode } from '@pax/common/mapgen';
import type { MapConnection } from '@pax/common/mapgen';
import { log } from '$lib/utils/logger';

const cache = new Map<string, [number, number][]>();

interface LaneEndpointPoint {
    x: number;
    y: number;
}

// Fix-engagement diagnostic: proves at runtime whether the storage-canonicalization
// fix is loaded AND actually reversing non-canonical input. Fires once per process.
// If nothing logs, the fix never sees non-canonical input (map is too small or
// dev server is stale). If "reversed" logs, fix is engaged and working.
let __storageFixDiagFired = false;
function logStorageFixEngagement(sourceId: string, targetId: string, reversed: boolean): void {
    if (__storageFixDiagFired) return;
    __storageFixDiagFired = true;
    log.sys('LaneCache', 'first write diagnostic', {
        firstEdgeWritten: { sourceId, targetId },
        nonCanonicalInput: sourceId > targetId,
        reversedAtStorage: reversed,
        note: reversed
            ? 'Fix ENGAGED: non-canonical input reversed to canonical storage.'
            : 'First write was canonical; fix will engage if non-canonical input arrives.',
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

export function canonicalizeLaneWaypointsForStorage(
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
    __storageFixDiagFired = false;
}

export function canonicalUniConnections(
    connections: Iterable<{ sourceId: string; targetId: string }>,
): { sourceId: string; targetId: string }[] {
    const seen = new Set<string>();
    const out: { sourceId: string; targetId: string }[] = [];
    for (const c of connections) {
        const a = c.sourceId <= c.targetId ? c.sourceId : c.targetId;
        const b = c.sourceId <= c.targetId ? c.targetId : c.sourceId;
        const k = `${a}|${b}`;
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ sourceId: a, targetId: b });
    }
    return out;
}

export function seedLanePolylineCacheFromMapGen(
    conns: Array<{ sourceId: string; targetId: string; laneWaypoints?: [number, number][] }>,
): void {
    cache.clear();
    for (const c of conns) {
        if (c.laneWaypoints && c.laneWaypoints.length >= 2) {
            // Storage contract: waypoints are always kept in canonical (sourceId <= targetId)
            // direction so `getDirectedLanePolyline` can rely on storage-direction == key-direction.
            // Mapgen (`buildLaneAwareConnections`) can emit non-canonical sourceId>targetId pairs
            // because it iterates node pairs by array index, not id. Normalize here to canonical storage.
            const waypoints = canonicalizeLaneWaypointsForStorage(
                c.sourceId,
                c.targetId,
                c.laneWaypoints,
            );
            const reversed = c.sourceId > c.targetId;
            logStorageFixEngagement(c.sourceId, c.targetId, reversed);
            cache.set(edgeKey(c.sourceId, c.targetId), waypoints);
        }
    }
}

export function rebuildLanePolylineCache(
    nodes: Array<{ id: string; x: number; y: number }>,
    uniConnections: Array<{ sourceId: string; targetId: string }>,
    mode: MapLaneMode,
    /** Lane margin: minimum distance from sampled centerline to non-endpoint stars. */
    laneObstacleClearancePx: number,
): MapConnection[] {
    cache.clear();
    if (nodes.length < 2 || uniConnections.length === 0) return [];

    const conns: MapConnection[] = uniConnections.map((c) => ({
        sourceId: c.sourceId,
        targetId: c.targetId,
        distance: 0,
    }));
    attachLaneWaypointsToConnections(nodes, conns, mode, Math.max(0, laneObstacleClearancePx));
    for (const c of conns) {
        if (c.laneWaypoints && c.laneWaypoints.length >= 2) {
            // See seedLanePolylineCacheFromMapGen: normalize waypoint direction to the canonical
            // edge key so downstream directed readers behave correctly regardless of solver order.
            const waypoints = canonicalizeLaneWaypointsForStorage(
                c.sourceId,
                c.targetId,
                c.laneWaypoints,
            );
            const reversed = c.sourceId > c.targetId;
            logStorageFixEngagement(c.sourceId, c.targetId, reversed);
            cache.set(edgeKey(c.sourceId, c.targetId), waypoints);
        }
    }
    return conns;
}

export function getLanePolyline(sourceId: string, targetId: string): [number, number][] | undefined {
    return cache.get(edgeKey(sourceId, targetId));
}

export function getDirectedLanePolyline(
    sourceId: string,
    targetId: string,
): [number, number][] | undefined {
    const poly = cache.get(edgeKey(sourceId, targetId));
    if (!poly || poly.length < 2) return poly;
    if (sourceId <= targetId) return poly;
    return poly
        .slice()
        .reverse()
        .map((point) => [point[0], point[1]] as [number, number]);
}
