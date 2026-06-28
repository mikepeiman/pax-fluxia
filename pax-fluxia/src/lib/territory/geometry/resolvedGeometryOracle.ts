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

function normalizedPhysicalPointChain(
    points: ReadonlyArray<readonly [number, number]>,
): string {
    const forward = points.map(physicalPointKey).join('>');
    const reverse = [...points].reverse().map(physicalPointKey).join('>');
    return forward < reverse ? forward : reverse;
}

function physicalPolylineKey(
    kind: 'frontier' | 'world',
    polyline: ResolvedFrontierPolyline,
): string {
    return `${kind}:${polyline.ownerPairKey}:${normalizedPhysicalPointChain(polyline.points)}`;
}

function physicalPolylineGeometryKey(
    kind: 'frontier' | 'world',
    polyline: ResolvedFrontierPolyline,
): string {
    return `${kind}:${normalizedPhysicalPointChain(polyline.points)}`;
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
    const seenBySemanticKey = new Map<string, string>();
    const seenByGeometryKey = new Map<string, ResolvedFrontierPolyline>();
    for (const polyline of polylines) {
        const semanticKey = physicalPolylineKey(kind, polyline);
        const existing = seenBySemanticKey.get(semanticKey);
        if (existing) {
            fail(`${kind} ${polyline.frontierId}: duplicates physical chain ${existing}`);
        } else {
            seenBySemanticKey.set(semanticKey, polyline.frontierId);
            const geometryKey = physicalPolylineGeometryKey(kind, polyline);
            const existingGeometry = seenByGeometryKey.get(geometryKey);
            if (existingGeometry) {
                fail(
                    `${kind} ${polyline.frontierId}: duplicates physical chain ${existingGeometry.frontierId} with ownerPairKey ${polyline.ownerPairKey} != ${existingGeometry.ownerPairKey}`,
                );
            } else {
                seenByGeometryKey.set(geometryKey, polyline);
            }
        }
    }
}

function polylinePointsMatch(
    a: ReadonlyArray<readonly [number, number]>,
    b: ReadonlyArray<readonly [number, number]>,
): boolean {
    if (a.length !== b.length) return false;
    return a.every((point, index) => pointsMatch(point, b[index]!));
}

function validateSharedFrontierMap(
    geometry: ResolvedGeometrySnapshot,
    fail: (message: string) => void,
): void {
    const frontierById = new Map(
        geometry.frontierPolylines.map((polyline) => [
            polyline.frontierId,
            polyline,
        ]),
    );
    const mappedFrontierIds = new Map<string, string>();

    for (const [ownerPairKey, polylines] of geometry.sharedFrontierMap) {
        checkNoDuplicateIds(
            polylines.map((polyline) => polyline.frontierId),
            `sharedFrontierMap ${ownerPairKey}`,
            fail,
        );
        for (const polyline of polylines) {
            const existingBucket = mappedFrontierIds.get(polyline.frontierId);
            if (existingBucket && existingBucket !== ownerPairKey) {
                fail(
                    `sharedFrontierMap ${ownerPairKey}: frontier ${polyline.frontierId} also appears in bucket ${existingBucket}`,
                );
            }
            mappedFrontierIds.set(polyline.frontierId, ownerPairKey);

            if (polyline.ownerPairKey !== ownerPairKey) {
                fail(
                    `sharedFrontierMap ${ownerPairKey}: frontier ${polyline.frontierId} ownerPairKey ${polyline.ownerPairKey} does not match bucket`,
                );
            }

            const canonical = frontierById.get(polyline.frontierId);
            if (!canonical) {
                fail(
                    `sharedFrontierMap ${ownerPairKey}: frontier ${polyline.frontierId} is not present in frontierPolylines`,
                );
                continue;
            }
            if (canonical.ownerPairKey !== polyline.ownerPairKey) {
                fail(
                    `sharedFrontierMap ${ownerPairKey}: frontier ${polyline.frontierId} ownerPairKey ${polyline.ownerPairKey} does not match frontierPolylines ownerPairKey ${canonical.ownerPairKey}`,
                );
            }
            if (canonical.ownerA !== polyline.ownerA || canonical.ownerB !== polyline.ownerB) {
                fail(
                    `sharedFrontierMap ${ownerPairKey}: frontier ${polyline.frontierId} owners do not match frontierPolylines`,
                );
            }
            if (!polylinePointsMatch(canonical.points, polyline.points)) {
                fail(
                    `sharedFrontierMap ${ownerPairKey}: frontier ${polyline.frontierId} geometry does not match frontierPolylines`,
                );
            }
        }
    }

    for (const polyline of geometry.frontierPolylines) {
        const bucket = geometry.sharedFrontierMap.get(polyline.ownerPairKey);
        const isMapped = bucket?.some(
            (candidate) => candidate.frontierId === polyline.frontierId,
        ) ?? false;
        if (!isMapped) {
            fail(
                `frontierPolylines ${polyline.frontierId}: missing from sharedFrontierMap bucket ${polyline.ownerPairKey}`,
            );
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
    validateSharedFrontierMap(geometry, fail);

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
