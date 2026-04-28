import type { Connection } from '@pax/common';
import type { LaneConstraintStatus, LanePathKind } from '@pax/common/mapgen';
import {
    canonicalizeLaneWaypointsForStorage,
    seedLanePolylineCacheFromMapGen,
} from '$lib/lanes/lanePolylineCache';

type LanePointLike = [number, number] | { x: number; y: number };

export interface LaneConnectionLike {
    sourceId: string;
    targetId: string;
    distance: number;
    laneWaypoints?: unknown;
    lanePathKind?: unknown;
    laneConstraintStatus?: unknown;
}

export interface LaneEndpointLike {
    id: string;
    x: number;
    y: number;
}

export function normalizeLanePathKind(value?: unknown): LanePathKind | undefined {
    return value === 'straight' || value === 'angular' || value === 'curved' ? value : undefined;
}

export function normalizeLaneConstraintStatus(value?: unknown): LaneConstraintStatus | undefined {
    switch (value) {
        case 'straight_ok':
        case 'reshaped_ok_angular':
        case 'reshaped_ok_curved':
        case 'constraint_unsatisfied_authored':
        case 'removed_for_constraint':
        case 'connectivity_restore':
            return value;
        default:
            return undefined;
    }
}

function isLanePointObject(value: unknown): value is { x: number; y: number } {
    return !!value
        && typeof value === 'object'
        && 'x' in value
        && 'y' in value
        && typeof (value as { x: unknown }).x === 'number'
        && typeof (value as { y: unknown }).y === 'number';
}

export function normalizeLaneWaypoints(points?: unknown): [number, number][] | undefined {
    if (!points || typeof (points as Iterable<unknown>)[Symbol.iterator] !== 'function') {
        return undefined;
    }

    const normalized = Array.from(points as Iterable<unknown>, (point) => {
        if (Array.isArray(point) && point.length >= 2) {
            return [Number(point[0]), Number(point[1])] as [number, number];
        }
        if (isLanePointObject(point)) {
            return [point.x, point.y] as [number, number];
        }
        return undefined;
    }).filter((point): point is [number, number] => Array.isArray(point));

    return normalized.length >= 2 ? normalized : undefined;
}

export function toLaneAwareConnection(connection: LaneConnectionLike): Connection {
    return {
        sourceId: connection.sourceId,
        targetId: connection.targetId,
        distance: connection.distance,
        laneWaypoints: normalizeLaneWaypoints(connection.laneWaypoints),
        lanePathKind: normalizeLanePathKind(connection.lanePathKind),
        laneConstraintStatus: normalizeLaneConstraintStatus(connection.laneConstraintStatus),
    };
}

export function toLaneAwareConnections(connections: Iterable<LaneConnectionLike>): Connection[] {
    return Array.from(connections, toLaneAwareConnection);
}

function buildLaneEndpointMap(
    endpoints?: Iterable<LaneEndpointLike>,
): Map<string, { x: number; y: number }> | null {
    if (!endpoints) return null;
    const entries = Array.from(endpoints, (endpoint) => [
        endpoint.id,
        { x: endpoint.x, y: endpoint.y },
    ] as const);
    return entries.length > 0 ? new Map(entries) : null;
}

export function seedLaneCacheFromConnections(
    connections: Iterable<LaneConnectionLike>,
    endpoints?: Iterable<LaneEndpointLike>,
): Connection[] {
    const normalized = toLaneAwareConnections(connections);
    const endpointMap = buildLaneEndpointMap(endpoints);
    const cacheSeedConnections = endpointMap
        ? normalized.map((connection) => {
              if (!connection.laneWaypoints || connection.laneWaypoints.length < 2) {
                  return connection;
              }
              const source = endpointMap.get(connection.sourceId);
              const target = endpointMap.get(connection.targetId);
              if (!source || !target) {
                  return connection;
              }
              return {
                  ...connection,
                  laneWaypoints: canonicalizeLaneWaypointsForStorage(
                      connection.sourceId,
                      connection.targetId,
                      connection.laneWaypoints,
                      { source, target },
                  ),
              };
          })
        : normalized;
    seedLanePolylineCacheFromMapGen(cacheSeedConnections);
    return normalized;
}
