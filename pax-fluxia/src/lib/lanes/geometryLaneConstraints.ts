import {
    buildLaneAwareConnections,
    type LaneConstraintStatus,
    type LanePathKind,
    type MapConnection,
} from '@pax/common/mapgen';
import type { StarConnection, StarState } from '$lib/types/game.types';
import { edgeKey, normalizeLaneWaypointsForStorage } from './lanePolylineCache';

const EPSILON = 1e-6;
const CLEARANCE_EPSILON_PX = 0.25;

type LanePolyline = [number, number][];

interface StarPoint {
    id: string;
    x: number;
    y: number;
}

interface ResolvedLane {
    sourceId: string;
    targetId: string;
    distance: number;
    laneWaypoints: LanePolyline;
    lanePathKind: LanePathKind;
    laneConstraintStatus: LaneConstraintStatus;
}

export interface GeometryLaneConstraintStats {
    straightCount: number;
    preservedExistingCount: number;
    adjustedCount: number;
    fallbackAdjustedCount: number;
    unsatisfiedCount: number;
}

export interface GeometryLaneConstraintResolution {
    connections: StarConnection[];
    stats: GeometryLaneConstraintStats;
    resolver: (sourceId: string, targetId: string) => LanePolyline | undefined;
}

function clonePoint(point: readonly [number, number]): [number, number] {
    return [point[0], point[1]];
}

function clonePolyline(
    polyline: ReadonlyArray<readonly [number, number]>,
): LanePolyline {
    const out: LanePolyline = [];
    for (const point of polyline) {
        if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) continue;
        const prev = out[out.length - 1];
        if (
            prev &&
            Math.hypot(prev[0] - point[0], prev[1] - point[1]) <= EPSILON
        ) {
            continue;
        }
        out.push(clonePoint(point));
    }
    return out;
}

function pointSegmentDistance(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
): number {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq <= EPSILON) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    const qx = ax + dx * t;
    const qy = ay + dy * t;
    return Math.hypot(px - qx, py - qy);
}

export function measureLaneMarginPx(params: {
    polyline: ReadonlyArray<readonly [number, number]>;
    stars: ReadonlyArray<StarState>;
    sourceId: string;
    targetId: string;
}): number {
    if (params.polyline.length < 2) return Infinity;
    let minDistance = Infinity;
    for (const star of params.stars) {
        if (star.id === params.sourceId || star.id === params.targetId) continue;
        for (let i = 1; i < params.polyline.length; i++) {
            const a = params.polyline[i - 1];
            const b = params.polyline[i];
            const dist = pointSegmentDistance(
                star.x,
                star.y,
                a[0],
                a[1],
                b[0],
                b[1],
            );
            if (dist < minDistance) minDistance = dist;
        }
    }
    return minDistance;
}

function satisfiesLaneMargin(params: {
    polyline: ReadonlyArray<readonly [number, number]>;
    stars: ReadonlyArray<StarState>;
    sourceId: string;
    targetId: string;
    laneMarginPx: number;
}): boolean {
    if (params.laneMarginPx <= 0) return params.polyline.length >= 2;
    return (
        measureLaneMarginPx(params) + CLEARANCE_EPSILON_PX >=
        params.laneMarginPx
    );
}

function normalizeConnectionKey(connection: {
    sourceId: string;
    targetId: string;
}): { sourceId: string; targetId: string; key: string } {
    const sourceId =
        connection.sourceId <= connection.targetId
            ? connection.sourceId
            : connection.targetId;
    const targetId =
        connection.sourceId <= connection.targetId
            ? connection.targetId
            : connection.sourceId;
    return { sourceId, targetId, key: edgeKey(sourceId, targetId) };
}

function straightPolyline(a: StarPoint, b: StarPoint): LanePolyline {
    return [
        [a.x, a.y],
        [b.x, b.y],
    ];
}

function directedFromNormalizedStorage(
    sourceId: string,
    targetId: string,
    polyline: LanePolyline,
): LanePolyline {
    const directed =
        sourceId <= targetId ? polyline : [...polyline].reverse();
    return directed.map(clonePoint);
}

function normalizeExistingWaypoints(params: {
    connection: StarConnection;
    source: StarPoint;
    target: StarPoint;
}): LanePolyline | null {
    const raw = params.connection.laneWaypoints;
    if (!raw || raw.length < 2) return null;
    const cleaned = clonePolyline(raw);
    if (cleaned.length < 2) return null;
    return normalizeLaneWaypointsForStorage(
        params.connection.sourceId,
        params.connection.targetId,
        cleaned,
        {
            source: params.source,
            target: params.target,
        },
    );
}

function buildFallbackAdjustedLane(params: {
    source: StarPoint;
    target: StarPoint;
    stars: ReadonlyArray<StarState>;
    laneMarginPx: number;
}): {
    polyline: LanePolyline;
    lanePathKind: LanePathKind;
    laneConstraintStatus: LaneConstraintStatus;
} {
    const straight = straightPolyline(params.source, params.target);
    const dx = params.target.x - params.source.x;
    const dy = params.target.y - params.source.y;
    const len = Math.hypot(dx, dy);
    if (len <= EPSILON || params.laneMarginPx <= 0) {
        return {
            polyline: straight,
            lanePathKind: 'straight',
            laneConstraintStatus: 'straight_ok',
        };
    }

    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const blockers = params.stars
        .filter(
            (star) =>
                star.id !== params.source.id && star.id !== params.target.id,
        )
        .map((star) => {
            const relX = star.x - params.source.x;
            const relY = star.y - params.source.y;
            const projected = relX * ux + relY * uy;
            const signed = relX * nx + relY * ny;
            const distance = pointSegmentDistance(
                star.x,
                star.y,
                params.source.x,
                params.source.y,
                params.target.x,
                params.target.y,
            );
            return { projected, signed, distance };
        })
        .filter(
            (blocker) =>
                blocker.projected > EPSILON &&
                blocker.projected < len - EPSILON &&
                blocker.distance + CLEARANCE_EPSILON_PX < params.laneMarginPx,
        )
        .sort((a, b) => {
            if (a.projected !== b.projected) return a.projected - b.projected;
            return a.signed - b.signed;
        });

    if (blockers.length === 0) {
        return {
            polyline: straight,
            lanePathKind: 'straight',
            laneConstraintStatus: 'straight_ok',
        };
    }

    const minProjected = blockers[0].projected;
    const maxProjected = blockers[blockers.length - 1].projected;
    const pad = Math.max(12, params.laneMarginPx * 0.75);
    const startProjected = Math.max(0, minProjected - pad);
    const endProjected = Math.min(len, maxProjected + pad);
    const positiveOffset = Math.max(
        params.laneMarginPx + 1,
        ...blockers.map((blocker) => blocker.signed + params.laneMarginPx + 1),
    );
    const negativeOffset = Math.min(
        -(params.laneMarginPx + 1),
        ...blockers.map((blocker) => blocker.signed - params.laneMarginPx - 1),
    );

    let bestPolyline = straight;
    let bestClearance = measureLaneMarginPx({
        polyline: straight,
        stars: params.stars,
        sourceId: params.source.id,
        targetId: params.target.id,
    });

    const baseCandidates = [positiveOffset, negativeOffset].sort((a, b) => {
        const absDelta = Math.abs(a) - Math.abs(b);
        if (Math.abs(absDelta) > EPSILON) return absDelta;
        return a - b;
    });

    for (const factor of [1, 1.35, 1.8, 2.5, 3.5, 5, 7]) {
        for (const baseOffset of baseCandidates) {
            const offset = baseOffset * factor;
            const startX = params.source.x + ux * startProjected + nx * offset;
            const startY = params.source.y + uy * startProjected + ny * offset;
            const endX = params.source.x + ux * endProjected + nx * offset;
            const endY = params.source.y + uy * endProjected + ny * offset;
            const candidate = clonePolyline([
                [params.source.x, params.source.y],
                [startX, startY],
                [endX, endY],
                [params.target.x, params.target.y],
            ]);
            const clearance = measureLaneMarginPx({
                polyline: candidate,
                stars: params.stars,
                sourceId: params.source.id,
                targetId: params.target.id,
            });
            if (clearance > bestClearance) {
                bestClearance = clearance;
                bestPolyline = candidate;
            }
            if (clearance + CLEARANCE_EPSILON_PX >= params.laneMarginPx) {
                return {
                    polyline: candidate,
                    lanePathKind: 'angular',
                    laneConstraintStatus: 'reshaped_ok_angular',
                };
            }
        }
    }

    return {
        polyline: bestPolyline,
        lanePathKind: bestPolyline.length > 2 ? 'angular' : 'straight',
        laneConstraintStatus: 'constraint_unsatisfied_authored',
    };
}

function mapLaneAwareResults(params: {
    stars: ReadonlyArray<StarState>;
    connections: ReadonlyArray<StarConnection>;
    laneMarginPx: number;
}): Map<string, ResolvedLane> {
    const starMap = new Map(params.stars.map((star) => [star.id, star]));
    const preferredByKey = new Map<string, MapConnection>();
    for (const connection of params.connections) {
        const { sourceId, targetId, key } = normalizeConnectionKey(connection);
        const source = starMap.get(sourceId);
        const target = starMap.get(targetId);
        if (!source || !target || preferredByKey.has(key)) continue;
        preferredByKey.set(key, {
            sourceId,
            targetId,
            distance:
                connection.distance ??
                Math.hypot(target.x - source.x, target.y - source.y),
        });
    }

    const nodes = [...params.stars]
        .map((star) => ({ id: star.id, x: star.x, y: star.y }))
        .sort((a, b) => a.id.localeCompare(b.id));
    const solved = buildLaneAwareConnections(
        nodes,
        [...preferredByKey.values()].sort((a, b) => {
            const ak = edgeKey(a.sourceId, a.targetId);
            const bk = edgeKey(b.sourceId, b.targetId);
            return ak.localeCompare(bk);
        }),
        [],
        'curved',
        Math.max(0, params.laneMarginPx),
        1,
        'curved',
        { buildMode: 'preserve_authored' },
    );

    const out = new Map<string, ResolvedLane>();
    for (const connection of solved) {
        const { sourceId, targetId, key } = normalizeConnectionKey(connection);
        const source = starMap.get(sourceId);
        const target = starMap.get(targetId);
        if (!source || !target) continue;
        const rawPolyline =
            connection.laneWaypoints && connection.laneWaypoints.length >= 2
                ? connection.laneWaypoints
                : straightPolyline(source, target);
        const polyline = normalizeLaneWaypointsForStorage(
            sourceId,
            targetId,
            rawPolyline,
            { source, target },
        );
        out.set(key, {
            sourceId,
            targetId,
            distance:
                connection.distance ?? Math.hypot(target.x - source.x, target.y - source.y),
            laneWaypoints: polyline,
            lanePathKind: connection.lanePathKind ?? 'curved',
            laneConstraintStatus:
                connection.laneConstraintStatus ?? 'reshaped_ok_curved',
        });
    }
    return out;
}

export function resolveGeometryLaneConstraints(params: {
    stars: ReadonlyArray<StarState>;
    connections: ReadonlyArray<StarConnection>;
    laneMarginPx: number;
}): GeometryLaneConstraintResolution {
    const laneMarginPx = Math.max(0, params.laneMarginPx);
    const starMap = new Map(params.stars.map((star) => [star.id, star]));
    const laneAwareByKey = mapLaneAwareResults({
        stars: params.stars,
        connections: params.connections,
        laneMarginPx,
    });
    const normalizedByKey = new Map<string, ResolvedLane>();
    const stats: GeometryLaneConstraintStats = {
        straightCount: 0,
        preservedExistingCount: 0,
        adjustedCount: 0,
        fallbackAdjustedCount: 0,
        unsatisfiedCount: 0,
    };

    for (const connection of params.connections) {
        const { sourceId, targetId, key } = normalizeConnectionKey(connection);
        if (normalizedByKey.has(key)) continue;
        const source = starMap.get(sourceId);
        const target = starMap.get(targetId);
        if (!source || !target) continue;

        const straight = straightPolyline(source, target);
        const existing = normalizeExistingWaypoints({
            connection,
            source: connection.sourceId === sourceId ? source : target,
            target: connection.targetId === targetId ? target : source,
        });
        if (
            existing &&
            satisfiesLaneMargin({
                polyline: existing,
                stars: params.stars,
                sourceId,
                targetId,
                laneMarginPx,
            })
        ) {
            normalizedByKey.set(key, {
                sourceId,
                targetId,
                distance:
                    connection.distance ??
                    Math.hypot(target.x - source.x, target.y - source.y),
                laneWaypoints: existing,
                lanePathKind: connection.lanePathKind ?? 'curved',
                laneConstraintStatus:
                    connection.laneConstraintStatus ?? 'reshaped_ok_curved',
            });
            stats.preservedExistingCount++;
            continue;
        }

        const laneAware = laneAwareByKey.get(key);
        if (
            laneAware &&
            laneAware.laneConstraintStatus !== 'constraint_unsatisfied_authored' &&
            satisfiesLaneMargin({
                polyline: laneAware.laneWaypoints,
                stars: params.stars,
                sourceId,
                targetId,
                laneMarginPx,
            })
        ) {
            normalizedByKey.set(key, laneAware);
            if (laneAware.lanePathKind === 'straight') stats.straightCount++;
            else stats.adjustedCount++;
            continue;
        }

        if (
            satisfiesLaneMargin({
                polyline: straight,
                stars: params.stars,
                sourceId,
                targetId,
                laneMarginPx,
            })
        ) {
            normalizedByKey.set(key, {
                sourceId,
                targetId,
                distance:
                    connection.distance ??
                    Math.hypot(target.x - source.x, target.y - source.y),
                laneWaypoints: straight,
                lanePathKind: 'straight',
                laneConstraintStatus: 'straight_ok',
            });
            stats.straightCount++;
            continue;
        }

        const fallback = buildFallbackAdjustedLane({
            source,
            target,
            stars: params.stars,
            laneMarginPx,
        });
        normalizedByKey.set(key, {
            sourceId,
            targetId,
            distance:
                connection.distance ?? Math.hypot(target.x - source.x, target.y - source.y),
            laneWaypoints: fallback.polyline,
            lanePathKind: fallback.lanePathKind,
            laneConstraintStatus: fallback.laneConstraintStatus,
        });
        if (fallback.laneConstraintStatus === 'constraint_unsatisfied_authored') {
            stats.unsatisfiedCount++;
        } else {
            stats.fallbackAdjustedCount++;
        }
    }

    const adjustedConnections = params.connections.map((connection) => {
        const { key } = normalizeConnectionKey(connection);
        const resolved = normalizedByKey.get(key);
        if (!resolved) return { ...connection };
        return {
            ...connection,
            laneWaypoints: directedFromNormalizedStorage(
                connection.sourceId,
                connection.targetId,
                resolved.laneWaypoints,
            ),
            lanePathKind: resolved.lanePathKind,
            laneConstraintStatus: resolved.laneConstraintStatus,
        };
    });

    return {
        connections: adjustedConnections,
        stats,
        resolver: (sourceId: string, targetId: string) => {
            const resolved = normalizedByKey.get(edgeKey(sourceId, targetId));
            if (!resolved) return undefined;
            return directedFromNormalizedStorage(
                sourceId,
                targetId,
                resolved.laneWaypoints,
            );
        },
    };
}
