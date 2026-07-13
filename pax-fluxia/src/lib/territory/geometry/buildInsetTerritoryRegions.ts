import type { TerritoryRegionShape } from '../contracts/GeometryContracts';
import { polygonArea } from './kernel';
import { pointInPolygon, polygonCentroid } from './geometryUtils';

const DEFAULT_SAMPLE_SPACING_PX = 8;
const MIN_SAMPLE_SPACING_PX = 6;
const MIN_DISTANCE_EPS = 0.25;
const MIN_AREA_EPS = 1;
const MIN_PERIMETER_EPS = 0.01;

export interface BuildInsetTerritoryRegionsParams {
    readonly territoryRegions: ReadonlyArray<TerritoryRegionShape>;
    readonly insetPx: number;
    readonly sampleSpacingPx?: number;
}

function normalizeVector(x: number, y: number): { x: number; y: number } {
    const length = Math.hypot(x, y);
    if (length <= 1e-6) return { x: 0, y: 0 };
    return { x: x / length, y: y / length };
}

function normalizeRing(
    points: ReadonlyArray<[number, number]>,
): [number, number][] {
    if (points.length === 0) return [];
    const ring = points.map(([x, y]) => [x, y] as [number, number]);
    if (ring.length < 2) return ring;
    const first = ring[0]!;
    const last = ring[ring.length - 1]!;
    if (first[0] === last[0] && first[1] === last[1]) {
        ring.pop();
    }
    return ring;
}

function polygonPerimeter(points: ReadonlyArray<[number, number]>): number {
    if (points.length < 2) return 0;
    let total = 0;
    for (let index = 0; index < points.length; index++) {
        const [ax, ay] = points[index]!;
        const [bx, by] = points[(index + 1) % points.length]!;
        total += Math.hypot(bx - ax, by - ay);
    }
    return total;
}

function interpolateAlongClosedRing(
    points: ReadonlyArray<[number, number]>,
    targetDistance: number,
): { point: [number, number]; tangent: { x: number; y: number } } {
    if (points.length === 0) {
        return { point: [0, 0], tangent: { x: 0, y: 0 } };
    }
    if (points.length === 1) {
        return { point: points[0]!, tangent: { x: 0, y: 0 } };
    }

    const perimeter = polygonPerimeter(points);
    if (perimeter <= MIN_PERIMETER_EPS) {
        return {
            point: points[0]!,
            tangent: normalizeVector(
                points[1]![0] - points[0]![0],
                points[1]![1] - points[0]![1],
            ),
        };
    }

    let remaining = targetDistance % perimeter;
    if (remaining < 0) remaining += perimeter;

    for (let index = 0; index < points.length; index++) {
        const [ax, ay] = points[index]!;
        const [bx, by] = points[(index + 1) % points.length]!;
        const dx = bx - ax;
        const dy = by - ay;
        const length = Math.hypot(dx, dy);
        if (length <= MIN_PERIMETER_EPS) continue;
        if (remaining < length) {
            const t = remaining / length;
            return {
                point: [ax + dx * t, ay + dy * t],
                tangent: normalizeVector(dx, dy),
            };
        }
        remaining -= length;
    }

    const [ax, ay] = points[points.length - 1]!;
    const [bx, by] = points[0]!;
    return {
        point: [bx, by],
        tangent: normalizeVector(bx - ax, by - ay),
    };
}

function chooseInsetPoint(
    point: [number, number],
    tangent: { x: number; y: number },
    polygon: ReadonlyArray<[number, number]>,
    insetPx: number,
): [number, number] {
    const leftNormal = normalizeVector(-tangent.y, tangent.x);
    if (insetPx <= 0 || (leftNormal.x === 0 && leftNormal.y === 0)) {
        return point;
    }

    const candidateA: [number, number] = [
        point[0] + leftNormal.x * insetPx,
        point[1] + leftNormal.y * insetPx,
    ];
    const candidateB: [number, number] = [
        point[0] - leftNormal.x * insetPx,
        point[1] - leftNormal.y * insetPx,
    ];

    const insideA = pointInPolygon(candidateA[0], candidateA[1], polygon);
    const insideB = pointInPolygon(candidateB[0], candidateB[1], polygon);
    if (insideA && !insideB) return candidateA;
    if (insideB && !insideA) return candidateB;

    const [cx, cy] = polygonCentroid(polygon);
    if (insideA && insideB) {
        const distA = Math.hypot(candidateA[0] - cx, candidateA[1] - cy);
        const distB = Math.hypot(candidateB[0] - cx, candidateB[1] - cy);
        return distA <= distB ? candidateA : candidateB;
    }

    const towardCentroid = normalizeVector(cx - point[0], cy - point[1]);
    const fallback: [number, number] = [
        point[0] + towardCentroid.x * insetPx,
        point[1] + towardCentroid.y * insetPx,
    ];
    if (pointInPolygon(fallback[0], fallback[1], polygon)) {
        return fallback;
    }
    return point;
}

function dedupeSequentialPoints(
    points: ReadonlyArray<[number, number]>,
): [number, number][] {
    const result: [number, number][] = [];
    for (const point of points) {
        const prev = result[result.length - 1];
        if (
            prev &&
            Math.hypot(point[0] - prev[0], point[1] - prev[1]) <=
                MIN_DISTANCE_EPS
        ) {
            continue;
        }
        result.push([point[0], point[1]]);
    }
    if (result.length >= 2) {
        const first = result[0]!;
        const last = result[result.length - 1]!;
        if (
            Math.hypot(first[0] - last[0], first[1] - last[1]) <=
            MIN_DISTANCE_EPS
        ) {
            result.pop();
        }
    }
    return result;
}

function buildInsetRegionPoints(
    points: ReadonlyArray<[number, number]>,
    insetPx: number,
    sampleSpacingPx: number,
): [number, number][] {
    const ring = normalizeRing(points);
    if (ring.length < 3 || insetPx <= 0) return ring;

    const perimeter = polygonPerimeter(ring);
    if (perimeter <= MIN_PERIMETER_EPS) return ring;

    const adjustedInsetPx = Math.min(insetPx, perimeter * 0.25);
    if (adjustedInsetPx <= MIN_PERIMETER_EPS) return ring;

    const sampleCount = Math.max(
        ring.length,
        Math.round(perimeter / sampleSpacingPx),
    );
    const insetPoints: [number, number][] = [];
    for (let index = 0; index < sampleCount; index++) {
        const target = ((index + 0.5) / sampleCount) * perimeter;
        const sample = interpolateAlongClosedRing(ring, target);
        insetPoints.push(
            chooseInsetPoint(
                sample.point,
                sample.tangent,
                ring,
                adjustedInsetPx,
            ),
        );
    }

    const deduped = dedupeSequentialPoints(insetPoints);
    if (deduped.length < 3 || polygonArea(deduped) < MIN_AREA_EPS) {
        return ring;
    }
    return deduped;
}

export function buildInsetTerritoryRegions(
    params: BuildInsetTerritoryRegionsParams,
): readonly TerritoryRegionShape[] {
    if (params.insetPx <= 0) {
        return params.territoryRegions;
    }

    const sampleSpacingPx = Math.max(
        MIN_SAMPLE_SPACING_PX,
        params.sampleSpacingPx ?? DEFAULT_SAMPLE_SPACING_PX,
    );

    return params.territoryRegions
        .map((region) => {
            const insetPoints = buildInsetRegionPoints(
                region.points,
                params.insetPx,
                sampleSpacingPx,
            );
            return {
                ...region,
                regionId: `${region.regionId}:inset:${params.insetPx.toFixed(2)}`,
                points: insetPoints,
            } satisfies TerritoryRegionShape;
        })
        .filter((region) => region.points.length >= 3);
}
