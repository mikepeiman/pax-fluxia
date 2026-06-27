import type { StarState } from '$lib/types/game.types';
import type {
    ResolvedFrontierPolyline,
    ResolvedGeometryOracleResult,
    ResolvedGeometrySnapshot,
    TerritoryRegionShape,
} from '../contracts/GeometryContracts';
import { pointInPolygon } from './geometryUtils';

const DEFAULT_MAX_FAILURES = 50;
const POINT_EPSILON_PX = 0.02;

export interface ResolvedGeometryOracleOptions {
    readonly stars?: ReadonlyArray<StarState>;
    readonly maxFailures?: number;
}

function physicalPointKey(point: readonly [number, number]): string {
    return `${Math.round(point[0] / POINT_EPSILON_PX)}:${Math.round(point[1] / POINT_EPSILON_PX)}`;
}

function physicalPolylineKey(
    kind: 'frontier' | 'world',
    polyline: ResolvedFrontierPolyline,
): string {
    const forward = polyline.points.map(physicalPointKey).join('>');
    const reverse = [...polyline.points].reverse().map(physicalPointKey).join('>');
    return `${kind}:${polyline.ownerPairKey}:${
        forward < reverse ? forward : reverse
    }`;
}

function pointsMatch(
    a: readonly [number, number],
    b: readonly [number, number],
): boolean {
    return (
        Math.abs(a[0] - b[0]) <= POINT_EPSILON_PX &&
        Math.abs(a[1] - b[1]) <= POINT_EPSILON_PX
    );
}

function cross(
    origin: readonly [number, number],
    a: readonly [number, number],
    b: readonly [number, number],
): number {
    return (a[0] - origin[0]) * (b[1] - origin[1]) -
        (a[1] - origin[1]) * (b[0] - origin[0]);
}

function pointOnSegment(
    point: readonly [number, number],
    a: readonly [number, number],
    b: readonly [number, number],
): boolean {
    return (
        Math.min(a[0], b[0]) - POINT_EPSILON_PX <= point[0] &&
        point[0] <= Math.max(a[0], b[0]) + POINT_EPSILON_PX &&
        Math.min(a[1], b[1]) - POINT_EPSILON_PX <= point[1] &&
        point[1] <= Math.max(a[1], b[1]) + POINT_EPSILON_PX
    );
}

function segmentsIntersect(
    a: readonly [number, number],
    b: readonly [number, number],
    c: readonly [number, number],
    d: readonly [number, number],
): boolean {
    const d1 = cross(c, d, a);
    const d2 = cross(c, d, b);
    const d3 = cross(a, b, c);
    const d4 = cross(a, b, d);
    if (
        ((d1 > POINT_EPSILON_PX && d2 < -POINT_EPSILON_PX) ||
            (d1 < -POINT_EPSILON_PX && d2 > POINT_EPSILON_PX)) &&
        ((d3 > POINT_EPSILON_PX && d4 < -POINT_EPSILON_PX) ||
            (d3 < -POINT_EPSILON_PX && d4 > POINT_EPSILON_PX))
    ) {
        return true;
    }
    if (Math.abs(d1) <= POINT_EPSILON_PX && pointOnSegment(a, c, d)) return true;
    if (Math.abs(d2) <= POINT_EPSILON_PX && pointOnSegment(b, c, d)) return true;
    if (Math.abs(d3) <= POINT_EPSILON_PX && pointOnSegment(c, a, b)) return true;
    if (Math.abs(d4) <= POINT_EPSILON_PX && pointOnSegment(d, a, b)) return true;
    return false;
}

function hasSelfIntersection(points: ReadonlyArray<[number, number]>): boolean {
    const ring =
        points.length >= 2 && pointsMatch(points[0]!, points[points.length - 1]!)
            ? points.slice(0, -1)
            : points;
    const n = ring.length;
    if (n < 4) return false;
    for (let i = 0; i < n; i++) {
        const a = ring[i]!;
        const b = ring[(i + 1) % n]!;
        for (let j = i + 1; j < n; j++) {
            if (j === i + 1 || (i === 0 && j === n - 1)) continue;
            const c = ring[j]!;
            const d = ring[(j + 1) % n]!;
            if (segmentsIntersect(a, b, c, d)) return true;
        }
    }
    return false;
}

function checkNoDuplicateIds(
    ids: readonly string[],
    context: string,
    fail: (message: string) => void,
): void {
    const seen = new Set<string>();
    for (const id of ids) {
        if (seen.has(id)) {
            fail(`${context}: duplicate id ${id}`);
        }
        seen.add(id);
    }
}

function validatePhysicalPolylineDuplicates(
    kind: 'frontier' | 'world',
    polylines: readonly ResolvedFrontierPolyline[],
    fail: (message: string) => void,
): void {
    const seen = new Map<string, string>();
    for (const polyline of polylines) {
        const key = physicalPolylineKey(kind, polyline);
        const existing = seen.get(key);
        if (existing) {
            fail(`${kind} ${polyline.frontierId}: duplicates physical chain ${existing}`);
        } else {
            seen.set(key, polyline.frontierId);
        }
    }
}

function validateRegionShape(
    region: TerritoryRegionShape,
    fail: (message: string) => void,
): void {
    if (region.points.length < 3) {
        fail(`region ${region.regionId}: fewer than three points`);
    }
    if (hasSelfIntersection(region.points)) {
        fail(`region ${region.regionId}: polygon self-intersects`);
    }
    checkNoDuplicateIds(
        region.anchorStarIds ?? [],
        `region ${region.regionId} anchorStarIds`,
        fail,
    );
}

export function validateResolvedGeometrySnapshotInvariants(
    geometry: ResolvedGeometrySnapshot,
    options: ResolvedGeometryOracleOptions = {},
): ResolvedGeometryOracleResult {
    const maxFailures = options.maxFailures ?? DEFAULT_MAX_FAILURES;
    const failures: string[] = [];
    let failureCount = 0;

    function fail(message: string): void {
        failureCount += 1;
        if (failures.length < maxFailures) {
            failures.push(message);
        }
    }

    checkNoDuplicateIds(
        geometry.territoryRegions.map((region) => region.regionId),
        'territoryRegions',
        fail,
    );
    checkNoDuplicateIds(
        geometry.frontierPolylines.map((polyline) => polyline.frontierId),
        'frontierPolylines',
        fail,
    );
    checkNoDuplicateIds(
        geometry.worldBorderPolylines.map((polyline) => polyline.frontierId),
        'worldBorderPolylines',
        fail,
    );

    validatePhysicalPolylineDuplicates('frontier', geometry.frontierPolylines, fail);
    validatePhysicalPolylineDuplicates('world', geometry.worldBorderPolylines, fail);

    const starById = new Map((options.stars ?? []).map((star) => [star.id, star]));
    for (const region of geometry.territoryRegions) {
        validateRegionShape(region, fail);
        for (const starId of region.anchorStarIds ?? []) {
            const star = starById.get(starId);
            if (!star) {
                fail(`region ${region.regionId}: missing anchor star ${starId}`);
                continue;
            }
            if (star.ownerId !== undefined && star.ownerId !== region.ownerId) {
                fail(
                    `region ${region.regionId}: anchor star ${starId} owner ${star.ownerId} != region owner ${region.ownerId}`,
                );
            }
            if (!pointInPolygon(star.x, star.y, region.points)) {
                fail(`region ${region.regionId}: anchor star ${starId} is outside region`);
            }
        }
    }

    if (options.stars) {
        for (const star of options.stars) {
            if (!star.ownerId) continue;
            const containingRegions = geometry.territoryRegions.filter(
                (region) =>
                    region.ownerId === star.ownerId &&
                    pointInPolygon(star.x, star.y, region.points),
            );
            if (containingRegions.length !== 1) {
                fail(
                    `star ${star.id}: contained by ${containingRegions.length} ${star.ownerId} region(s), expected 1`,
                );
            }
        }
    }

    if (failureCount > failures.length) {
        failures.push(
            `resolved geometry oracle truncated ${
                failureCount - failures.length
            } additional failure(s)`,
        );
    }

    return {
        ok: failureCount === 0,
        failureCount,
        failures,
    };
}
