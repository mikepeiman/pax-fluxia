// ============================================================================
// Runtime cache of lane polylines per undirected edge (canonical id order).
// Filled from mapgen results or rebuilt when links / clearance / mode change.
// ============================================================================

import { attachLaneWaypointsToConnections, type MapLaneMode } from '@pax/common/mapgen';
import type { MapConnection } from '@pax/common/mapgen';

const cache = new Map<string, [number, number][]>();

export function edgeKey(a: string, b: string): string {
    return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

export function clearLanePolylineCache(): void {
    cache.clear();
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
            cache.set(edgeKey(c.sourceId, c.targetId), c.laneWaypoints.map((p) => [p[0], p[1]]));
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
            cache.set(edgeKey(c.sourceId, c.targetId), c.laneWaypoints.map((p) => [p[0], p[1]]));
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
