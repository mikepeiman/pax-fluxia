import type { StarState } from '$lib/types/game.types';

type GeometryPoint = [number, number];

type MarginPolyline = {
    ownerPairKey: string;
    points: GeometryPoint[];
};

type PolylineGroup = 'shared' | 'world';

type PolylineMetrics = {
    cumulativeLengths: number[];
    totalLength: number;
};

type PolylineRef<TShared extends MarginPolyline> = {
    group: PolylineGroup;
    index: number;
    ownerPairKey: string;
    owners: string[];
    original: TShared;
    originalPoints: GeometryPoint[];
    currentPoints: GeometryPoint[];
};

type StarAnchor = {
    polylineGroup: PolylineGroup;
    polylineIndex: number;
    ownerPairKey: string;
    ownerId: string;
    starId: string;
    starPoint: GeometryPoint;
    radiusPx: number;
    anchorPoint: GeometryPoint;
    anchorArcLengthPx: number;
    distanceToChainPx: number;
};

type StarInterval = {
    polylineGroup: PolylineGroup;
    polylineIndex: number;
    ownerPairKey: string;
    ownerId: string;
    starId: string;
    starPoint: GeometryPoint;
    radiusPx: number;
    requestedRadiusPx: number;
    anchorPoint: GeometryPoint;
    anchorArcLengthPx: number;
    distanceToChainPx: number;
    intervalStartPx: number;
    intervalEndPx: number;
    intervalStartPoint: GeometryPoint;
    intervalEndPoint: GeometryPoint;
};

export interface MinStarMarginAnchorDiagnostic {
    polylineGroup: PolylineGroup;
    polylineIndex: number;
    ownerPairKey: string;
    ownerId: string;
    starId: string;
    starPoint: GeometryPoint;
    radiusPx: number;
    anchorPoint: GeometryPoint;
    anchorArcLengthPx: number;
    distanceToChainPx: number;
}

export interface MinStarMarginIntervalDiagnostic {
    polylineGroup: PolylineGroup;
    polylineIndex: number;
    ownerPairKey: string;
    ownerId: string;
    starId: string;
    starPoint: GeometryPoint;
    radiusPx: number;
    requestedRadiusPx: number;
    anchorPoint: GeometryPoint;
    anchorArcLengthPx: number;
    distanceToChainPx: number;
    intervalStartPx: number;
    intervalEndPx: number;
    intervalStartPoint: GeometryPoint;
    intervalEndPoint: GeometryPoint;
    violated: boolean;
    attempted: boolean;
    accepted: boolean;
    rejectionReason?: string;
}

export interface MinStarMarginDiagnosticsSummary {
    requestedMarginPx: number;
    minAppliedMarginPx: number;
    maxAppliedMarginPx: number;
    anchorCount: number;
    intervalCount: number;
    violatedIntervalCount: number;
    attemptedRepairCount: number;
    acceptedRepairCount: number;
    rejectedRepairCount: number;
    invariantFailures: string[];
}

export interface MinStarMarginDiagnostics {
    anchors: readonly MinStarMarginAnchorDiagnostic[];
    intervals: readonly MinStarMarginIntervalDiagnostic[];
    summary: MinStarMarginDiagnosticsSummary;
}

export interface MinStarMarginResult<TShared extends MarginPolyline = MarginPolyline> {
    requestedMarginPx: number;
    minAppliedMarginPx: number;
    maxAppliedMarginPx: number;
    appliedMarginsByStarId: ReadonlyMap<string, number>;
    sharedPolylines: TShared[];
    worldBorderPolylines: TShared[];
    diagnostics: MinStarMarginDiagnostics;
}

type MinStarMarginValidationResult = {
    ok: boolean;
    reason?: string;
};

type MinStarMarginValidator<TShared extends MarginPolyline> = (params: {
    sharedPolylines: ReadonlyArray<TShared>;
    worldBorderPolylines: ReadonlyArray<TShared>;
    interval: MinStarMarginIntervalDiagnostic;
}) => MinStarMarginValidationResult;

const INTERSECTION_EPSILON = 1e-6;
const POINT_EPSILON = 0.01;
const ARC_STEP_PX = 8;
const SENSOR_RAY_COUNT = 72;
const SENSOR_REPAIR_TOLERANCE_PX = 2;
const ANCHOR_ASSIGNMENT_TOLERANCE_PX = 2;
const INTERVAL_ENDPOINT_TOLERANCE_PX = 0.5;
const REPAIRED_CHORD_TOLERANCE_PX = 1;
const REPAIR_BLEND_WINDOW_RATIO = 0.35;
const REPAIR_BLEND_WINDOW_MAX_PX = 18;
const CLEARANCE_SMOOTHING_ITERATIONS = 2;

function clampRequestedMargin(requestedMarginPx: number): number {
    return Math.max(0, requestedMarginPx);
}

function clonePoint(point: GeometryPoint): GeometryPoint {
    return [point[0], point[1]];
}

function clonePoints(points: ReadonlyArray<GeometryPoint>): GeometryPoint[] {
    return points.map(clonePoint);
}

function lerpPoint(
    start: GeometryPoint,
    end: GeometryPoint,
    t: number,
): GeometryPoint {
    return [
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t,
    ];
}

function appendUniquePoint(target: GeometryPoint[], point: GeometryPoint): void {
    const last = target[target.length - 1];
    if (
        last &&
        Math.abs(last[0] - point[0]) <= POINT_EPSILON &&
        Math.abs(last[1] - point[1]) <= POINT_EPSILON
    ) {
        return;
    }
    target.push(point);
}

function pointsEqual(
    left: GeometryPoint,
    right: GeometryPoint,
    epsilon = POINT_EPSILON,
): boolean {
    return (
        Math.abs(left[0] - right[0]) <= epsilon &&
        Math.abs(left[1] - right[1]) <= epsilon
    );
}

function pointDistance(left: GeometryPoint, right: GeometryPoint): number {
    return Math.hypot(left[0] - right[0], left[1] - right[1]);
}

function clampPointOutsideCircle(
    point: GeometryPoint,
    centerX: number,
    centerY: number,
    radius: number,
): GeometryPoint {
    if (!isInsideCircle(point, centerX, centerY, radius)) {
        return clonePoint(point);
    }
    return projectPointToCircle(point, centerX, centerY, radius);
}

function normalizeAngle(angle: number): number {
    let result = angle;
    while (result <= -Math.PI) result += Math.PI * 2;
    while (result > Math.PI) result -= Math.PI * 2;
    return result;
}

function buildMinorArcPoints(
    centerX: number,
    centerY: number,
    radius: number,
    start: GeometryPoint,
    end: GeometryPoint,
): GeometryPoint[] {
    const startAngle = Math.atan2(start[1] - centerY, start[0] - centerX);
    const endAngle = Math.atan2(end[1] - centerY, end[0] - centerX);
    const delta = normalizeAngle(endAngle - startAngle);
    if (Math.abs(delta) <= INTERSECTION_EPSILON) {
        return [clonePoint(end)];
    }

    const arcLength = Math.abs(delta) * radius;
    const segments = Math.max(2, Math.ceil(arcLength / ARC_STEP_PX));
    const points: GeometryPoint[] = [];
    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const angle = startAngle + delta * t;
        points.push([
            centerX + Math.cos(angle) * radius,
            centerY + Math.sin(angle) * radius,
        ]);
    }
    return points;
}

function pointDistanceSquared(
    point: GeometryPoint,
    centerX: number,
    centerY: number,
): number {
    const dx = point[0] - centerX;
    const dy = point[1] - centerY;
    return dx * dx + dy * dy;
}

function isInsideCircle(
    point: GeometryPoint,
    centerX: number,
    centerY: number,
    radius: number,
): boolean {
    return pointDistanceSquared(point, centerX, centerY) < radius * radius - POINT_EPSILON;
}

function circleIntrusionDepth(
    point: GeometryPoint,
    centerX: number,
    centerY: number,
    radius: number,
): number {
    return radius - Math.hypot(point[0] - centerX, point[1] - centerY);
}

function projectPointToCircle(
    point: GeometryPoint,
    centerX: number,
    centerY: number,
    radius: number,
): GeometryPoint {
    const dx = point[0] - centerX;
    const dy = point[1] - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance <= INTERSECTION_EPSILON) {
        return [centerX + radius, centerY];
    }
    const scale = radius / distance;
    return [centerX + dx * scale, centerY + dy * scale];
}

function segmentCircleIntersections(
    start: GeometryPoint,
    end: GeometryPoint,
    centerX: number,
    centerY: number,
    radius: number,
): Array<{ t: number; point: GeometryPoint }> {
    const sx = start[0] - centerX;
    const sy = start[1] - centerY;
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const a = dx * dx + dy * dy;
    if (a <= INTERSECTION_EPSILON) return [];
    const b = 2 * (sx * dx + sy * dy);
    const c = sx * sx + sy * sy - radius * radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < -INTERSECTION_EPSILON) return [];
    if (Math.abs(discriminant) <= INTERSECTION_EPSILON) {
        const t = -b / (2 * a);
        if (t < 0 || t > 1) return [];
        return [
            {
                t,
                point: [start[0] + dx * t, start[1] + dy * t],
            },
        ];
    }

    const sqrtDiscriminant = Math.sqrt(Math.max(0, discriminant));
    const t0 = (-b - sqrtDiscriminant) / (2 * a);
    const t1 = (-b + sqrtDiscriminant) / (2 * a);
    const hits = [t0, t1]
        .filter((t) => t >= 0 && t <= 1)
        .sort((left, right) => left - right)
        .map((t) => ({
            t,
            point: [start[0] + dx * t, start[1] + dy * t] as GeometryPoint,
        }));

    if (
        hits.length === 2 &&
        pointsEqual(hits[0]!.point, hits[1]!.point)
    ) {
        return [hits[0]!];
    }

    return hits;
}

function distancePointToSegmentSquared(
    point: GeometryPoint,
    start: GeometryPoint,
    end: GeometryPoint,
): number {
    const vx = end[0] - start[0];
    const vy = end[1] - start[1];
    const wx = point[0] - start[0];
    const wy = point[1] - start[1];
    const denom = vx * vx + vy * vy;
    if (denom <= INTERSECTION_EPSILON) {
        return (point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2;
    }
    const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / denom));
    const px = start[0] + vx * t;
    const py = start[1] + vy * t;
    return (point[0] - px) ** 2 + (point[1] - py) ** 2;
}

function projectPointToSegment(
    point: GeometryPoint,
    start: GeometryPoint,
    end: GeometryPoint,
): { t: number; point: GeometryPoint; distanceSq: number } {
    const vx = end[0] - start[0];
    const vy = end[1] - start[1];
    const denom = vx * vx + vy * vy;
    if (denom <= INTERSECTION_EPSILON) {
        const projected = clonePoint(start);
        return {
            t: 0,
            point: projected,
            distanceSq:
                (point[0] - projected[0]) ** 2 + (point[1] - projected[1]) ** 2,
        };
    }
    const wx = point[0] - start[0];
    const wy = point[1] - start[1];
    const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / denom));
    const projected: GeometryPoint = [start[0] + vx * t, start[1] + vy * t];
    return {
        t,
        point: projected,
        distanceSq:
            (point[0] - projected[0]) ** 2 + (point[1] - projected[1]) ** 2,
    };
}

function raySegmentIntersectionDistance(
    originX: number,
    originY: number,
    directionX: number,
    directionY: number,
    start: GeometryPoint,
    end: GeometryPoint,
): number | null {
    const segDx = end[0] - start[0];
    const segDy = end[1] - start[1];
    const denom = directionX * segDy - directionY * segDx;
    if (Math.abs(denom) <= INTERSECTION_EPSILON) {
        return null;
    }

    const offsetX = start[0] - originX;
    const offsetY = start[1] - originY;
    const rayT = (offsetX * segDy - offsetY * segDx) / denom;
    const segT = (offsetX * directionY - offsetY * directionX) / denom;
    if (rayT < 0 || segT < 0 || segT > 1) {
        return null;
    }
    return rayT;
}

function hasResidualMsrViolation(
    points: ReadonlyArray<GeometryPoint>,
    centerX: number,
    centerY: number,
    radius: number,
): boolean {
    if (radius <= 0 || points.length < 2) {
        return false;
    }

    for (let i = 0; i < SENSOR_RAY_COUNT; i++) {
        const angle = (Math.PI * 2 * i) / SENSOR_RAY_COUNT;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        let nearestHit = Number.POSITIVE_INFINITY;

        for (let segmentIndex = 0; segmentIndex < points.length - 1; segmentIndex++) {
            const hitDistance = raySegmentIntersectionDistance(
                centerX,
                centerY,
                dx,
                dy,
                points[segmentIndex]!,
                points[segmentIndex + 1]!,
            );
            if (hitDistance !== null && hitDistance < nearestHit) {
                nearestHit = hitDistance;
            }
        }

        if (nearestHit < radius - SENSOR_REPAIR_TOLERANCE_PX) {
            return true;
        }
    }

    return false;
}

function polylineIntrudesCircle(
    points: ReadonlyArray<GeometryPoint>,
    centerX: number,
    centerY: number,
    radius: number,
    tolerancePx = 0,
): boolean {
    const effectiveRadius = Math.max(0, radius - tolerancePx);
    const threshold = effectiveRadius * effectiveRadius - POINT_EPSILON;
    for (let i = 0; i < points.length; i++) {
        if (pointDistanceSquared(points[i]!, centerX, centerY) < threshold) {
            return true;
        }
    }
    for (let i = 0; i < points.length - 1; i++) {
        if (
            distancePointToSegmentSquared(
                [centerX, centerY],
                points[i]!,
                points[i + 1]!,
            ) < threshold
        ) {
            return true;
        }
    }
    return false;
}

function compactPolyline(points: ReadonlyArray<GeometryPoint>): GeometryPoint[] {
    const compacted: GeometryPoint[] = [];
    for (const point of points) {
        appendUniquePoint(compacted, point);
    }
    return compacted;
}

function applyCircleExclusionToPolyline(
    points: ReadonlyArray<GeometryPoint>,
    centerX: number,
    centerY: number,
    radius: number,
): GeometryPoint[] {
    if (points.length < 2 || radius <= 0) {
        return clonePoints(points);
    }
    if (!polylineIntrudesCircle(points, centerX, centerY, radius)) {
        return clonePoints(points);
    }

    const firstPoint = clonePoint(points[0]!);
    const startInside = isInsideCircle(firstPoint, centerX, centerY, radius);
    const result: GeometryPoint[] = [
        startInside
            ? projectPointToCircle(firstPoint, centerX, centerY, radius)
            : firstPoint,
    ];
    let insideRun = startInside;
    let entryPoint = insideRun ? clonePoint(result[0]!) : null;

    for (let i = 0; i < points.length - 1; i++) {
        const segmentStart = points[i]!;
        const segmentEnd = points[i + 1]!;
        const startInsideSegment = isInsideCircle(
            segmentStart,
            centerX,
            centerY,
            radius,
        );
        const endInsideSegment = isInsideCircle(
            segmentEnd,
            centerX,
            centerY,
            radius,
        );
        const intersections = segmentCircleIntersections(
            segmentStart,
            segmentEnd,
            centerX,
            centerY,
            radius,
        );

        if (insideRun) {
            const exitIntersection =
                intersections.length > 0
                    ? intersections[intersections.length - 1]!.point
                    : endInsideSegment
                      ? null
                      : projectPointToCircle(
                            segmentEnd,
                            centerX,
                            centerY,
                            radius,
                        );
            if (!exitIntersection) {
                continue;
            }
            for (const arcPoint of buildMinorArcPoints(
                centerX,
                centerY,
                radius,
                entryPoint ?? clonePoint(result[result.length - 1]!),
                exitIntersection,
            )) {
                appendUniquePoint(result, arcPoint);
            }
            if (!endInsideSegment) {
                appendUniquePoint(result, clonePoint(segmentEnd));
                insideRun = false;
                entryPoint = null;
            } else {
                entryPoint = clonePoint(exitIntersection);
            }
            continue;
        }

        if (!startInsideSegment && !endInsideSegment) {
            if (intersections.length >= 2) {
                const entry = intersections[0]!.point;
                const exit = intersections[intersections.length - 1]!.point;
                appendUniquePoint(result, entry);
                for (const arcPoint of buildMinorArcPoints(
                    centerX,
                    centerY,
                    radius,
                    entry,
                    exit,
                )) {
                    appendUniquePoint(result, arcPoint);
                }
            }
            appendUniquePoint(result, clonePoint(segmentEnd));
            continue;
        }

        if (!startInsideSegment && endInsideSegment) {
            const entry =
                intersections[0]?.point ??
                projectPointToCircle(segmentEnd, centerX, centerY, radius);
            appendUniquePoint(result, entry);
            insideRun = true;
            entryPoint = clonePoint(entry);
            continue;
        }

        if (startInsideSegment && !endInsideSegment) {
            const exit =
                intersections[intersections.length - 1]?.point ??
                projectPointToCircle(segmentStart, centerX, centerY, radius);
            const arcStart =
                entryPoint ??
                clonePoint(result[result.length - 1] ?? exit);
            for (const arcPoint of buildMinorArcPoints(
                centerX,
                centerY,
                radius,
                arcStart,
                exit,
            )) {
                appendUniquePoint(result, arcPoint);
            }
            appendUniquePoint(result, clonePoint(segmentEnd));
            continue;
        }
    }

    if (insideRun && entryPoint) {
        const projectedEnd = projectPointToCircle(
            points[points.length - 1]!,
            centerX,
            centerY,
            radius,
        );
        for (const arcPoint of buildMinorArcPoints(
            centerX,
            centerY,
            radius,
            entryPoint,
            projectedEnd,
        )) {
            appendUniquePoint(result, arcPoint);
        }
    }

    return compactPolyline(result);
}

function smoothClearanceCurve(
    points: ReadonlyArray<GeometryPoint>,
    centerX: number,
    centerY: number,
    radius: number,
): GeometryPoint[] {
    if (points.length < 4) {
        return compactPolyline(points);
    }

    let current = compactPolyline(points);
    for (let iteration = 0; iteration < CLEARANCE_SMOOTHING_ITERATIONS; iteration++) {
        if (current.length < 4) {
            break;
        }

        const next: GeometryPoint[] = [clonePoint(current[0]!)];
        for (let i = 0; i < current.length - 1; i++) {
            const start = current[i]!;
            const end = current[i + 1]!;
            const left = clampPointOutsideCircle(
                lerpPoint(start, end, 0.25),
                centerX,
                centerY,
                radius,
            );
            const right = clampPointOutsideCircle(
                lerpPoint(start, end, 0.75),
                centerX,
                centerY,
                radius,
            );

            if (i > 0) {
                appendUniquePoint(next, left);
            }
            if (i < current.length - 2) {
                appendUniquePoint(next, right);
            }
        }
        appendUniquePoint(next, clonePoint(current[current.length - 1]!));
        current = compactPolyline(next);
    }

    return current;
}

function buildPolylineMetrics(points: ReadonlyArray<GeometryPoint>): PolylineMetrics {
    const cumulativeLengths = [0];
    let totalLength = 0;
    for (let i = 0; i < points.length - 1; i++) {
        totalLength += pointDistance(points[i]!, points[i + 1]!);
        cumulativeLengths.push(totalLength);
    }
    return { cumulativeLengths, totalLength };
}

function pointAtArcLength(
    points: ReadonlyArray<GeometryPoint>,
    metrics: PolylineMetrics,
    targetArcLengthPx: number,
): GeometryPoint {
    if (points.length === 0) {
        return [0, 0];
    }
    if (points.length === 1) {
        return clonePoint(points[0]!);
    }
    const clamped = Math.max(0, Math.min(metrics.totalLength, targetArcLengthPx));
    if (clamped <= INTERSECTION_EPSILON) {
        return clonePoint(points[0]!);
    }
    if (clamped >= metrics.totalLength - INTERSECTION_EPSILON) {
        return clonePoint(points[points.length - 1]!);
    }

    for (let i = 0; i < points.length - 1; i++) {
        const startLength = metrics.cumulativeLengths[i]!;
        const endLength = metrics.cumulativeLengths[i + 1]!;
        if (clamped > endLength + INTERSECTION_EPSILON) {
            continue;
        }
        const segmentLength = Math.max(
            INTERSECTION_EPSILON,
            endLength - startLength,
        );
        const t = Math.max(0, Math.min(1, (clamped - startLength) / segmentLength));
        return [
            points[i]![0] + (points[i + 1]![0] - points[i]![0]) * t,
            points[i]![1] + (points[i + 1]![1] - points[i]![1]) * t,
        ];
    }

    return clonePoint(points[points.length - 1]!);
}

function slicePolylineByArc(
    points: ReadonlyArray<GeometryPoint>,
    metrics: PolylineMetrics,
    startArcLengthPx: number,
    endArcLengthPx: number,
): GeometryPoint[] {
    if (points.length === 0) return [];
    const start = Math.max(0, Math.min(metrics.totalLength, startArcLengthPx));
    const end = Math.max(start, Math.min(metrics.totalLength, endArcLengthPx));
    if (end - start <= INTERSECTION_EPSILON) {
        const point = pointAtArcLength(points, metrics, start);
        return [point, clonePoint(point)];
    }

    const result: GeometryPoint[] = [];
    appendUniquePoint(result, pointAtArcLength(points, metrics, start));

    for (let i = 0; i < points.length - 1; i++) {
        const segmentStartLength = metrics.cumulativeLengths[i]!;
        const segmentEndLength = metrics.cumulativeLengths[i + 1]!;
        if (segmentEndLength <= start + INTERSECTION_EPSILON) continue;
        if (segmentStartLength >= end - INTERSECTION_EPSILON) break;

        if (segmentStartLength > start + INTERSECTION_EPSILON) {
            appendUniquePoint(result, clonePoint(points[i]!));
        }
        if (segmentEndLength < end - INTERSECTION_EPSILON) {
            appendUniquePoint(result, clonePoint(points[i + 1]!));
        }
    }

    appendUniquePoint(result, pointAtArcLength(points, metrics, end));
    return compactPolyline(result);
}

function splicePolylineInterval(
    points: ReadonlyArray<GeometryPoint>,
    startArcLengthPx: number,
    endArcLengthPx: number,
    replacement: ReadonlyArray<GeometryPoint>,
): GeometryPoint[] {
    const metrics = buildPolylineMetrics(points);
    const prefix = slicePolylineByArc(points, metrics, 0, startArcLengthPx);
    const suffix = slicePolylineByArc(
        points,
        metrics,
        endArcLengthPx,
        metrics.totalLength,
    );
    const result: GeometryPoint[] = [];
    for (const point of prefix) appendUniquePoint(result, point);
    for (let i = 1; i < replacement.length; i++) {
        appendUniquePoint(result, replacement[i]!);
    }
    for (let i = 1; i < suffix.length; i++) {
        appendUniquePoint(result, suffix[i]!);
    }
    return compactPolyline(result);
}

function resolveIntrusionArcRange(
    points: ReadonlyArray<GeometryPoint>,
    centerX: number,
    centerY: number,
    radius: number,
):
    | { startArcLengthPx: number; endArcLengthPx: number }
    | { rejectionReason: string }
    | null {
    if (points.length < 2) {
        return null;
    }
    if (
        isInsideCircle(points[0]!, centerX, centerY, radius) &&
        circleIntrusionDepth(points[0]!, centerX, centerY, radius) >
            SENSOR_REPAIR_TOLERANCE_PX
    ) {
        return { rejectionReason: 'Intrusion reached interval start' };
    }
    if (
        isInsideCircle(points[points.length - 1]!, centerX, centerY, radius) &&
        circleIntrusionDepth(
            points[points.length - 1]!,
            centerX,
            centerY,
            radius,
        ) > SENSOR_REPAIR_TOLERANCE_PX
    ) {
        return { rejectionReason: 'Intrusion reached interval end' };
    }

    const metrics = buildPolylineMetrics(points);
    let startArcLengthPx: number | null = null;
    let endArcLengthPx: number | null = null;
    let insideRun = false;

    for (let i = 0; i < points.length - 1; i++) {
        const segmentStart = points[i]!;
        const segmentEnd = points[i + 1]!;
        const segmentStartLength = metrics.cumulativeLengths[i]!;
        const segmentLength = Math.max(
            INTERSECTION_EPSILON,
            metrics.cumulativeLengths[i + 1]! - segmentStartLength,
        );
        const startInsideSegment = isInsideCircle(
            segmentStart,
            centerX,
            centerY,
            radius,
        );
        const endInsideSegment = isInsideCircle(
            segmentEnd,
            centerX,
            centerY,
            radius,
        );
        const intersections = segmentCircleIntersections(
            segmentStart,
            segmentEnd,
            centerX,
            centerY,
            radius,
        );

        if (!insideRun) {
            if (
                startInsideSegment &&
                circleIntrusionDepth(segmentStart, centerX, centerY, radius) >
                    SENSOR_REPAIR_TOLERANCE_PX
            ) {
                return { rejectionReason: 'Intrusion reached interval start' };
            }
            if (startInsideSegment) {
                startArcLengthPx = segmentStartLength;
                insideRun = true;
            }
            if (intersections.length >= 2) {
                startArcLengthPx =
                    segmentStartLength + intersections[0]!.t * segmentLength;
                endArcLengthPx =
                    segmentStartLength +
                    intersections[intersections.length - 1]!.t * segmentLength;
                insideRun = false;
                break;
            }
            if (intersections.length >= 1 && endInsideSegment) {
                startArcLengthPx =
                    segmentStartLength + intersections[0]!.t * segmentLength;
                insideRun = true;
                continue;
            }
        }

        if (insideRun) {
            if (intersections.length >= 1 && !endInsideSegment) {
                endArcLengthPx =
                    segmentStartLength +
                    intersections[intersections.length - 1]!.t * segmentLength;
                insideRun = false;
                break;
            }
        }
    }

    if (startArcLengthPx === null) {
        return null;
    }
    if (endArcLengthPx === null && insideRun) {
        const lastPoint = points[points.length - 1]!;
        if (
            isInsideCircle(lastPoint, centerX, centerY, radius) &&
            circleIntrusionDepth(lastPoint, centerX, centerY, radius) <=
                SENSOR_REPAIR_TOLERANCE_PX
        ) {
            endArcLengthPx = metrics.totalLength;
            insideRun = false;
        }
    }
    if (endArcLengthPx === null || insideRun) {
        return { rejectionReason: 'Intrusion reached interval end' };
    }

    return { startArcLengthPx, endArcLengthPx };
}

function projectPointOntoPolyline(
    point: GeometryPoint,
    points: ReadonlyArray<GeometryPoint>,
): {
    point: GeometryPoint;
    arcLengthPx: number;
    distancePx: number;
} {
    if (points.length === 0) {
        return {
            point: [0, 0],
            arcLengthPx: 0,
            distancePx: Number.POSITIVE_INFINITY,
        };
    }
    if (points.length === 1) {
        return {
            point: clonePoint(points[0]!),
            arcLengthPx: 0,
            distancePx: pointDistance(point, points[0]!),
        };
    }

    const metrics = buildPolylineMetrics(points);
    let bestDistanceSq = Number.POSITIVE_INFINITY;
    let bestArcLengthPx = 0;
    let bestPoint = clonePoint(points[0]!);
    for (let i = 0; i < points.length - 1; i++) {
        const projection = projectPointToSegment(point, points[i]!, points[i + 1]!);
        if (projection.distanceSq < bestDistanceSq) {
            bestDistanceSq = projection.distanceSq;
            bestPoint = projection.point;
            bestArcLengthPx =
                metrics.cumulativeLengths[i]! +
                pointDistance(points[i]!, projection.point);
        }
    }

    return {
        point: bestPoint,
        arcLengthPx: bestArcLengthPx,
        distancePx: Math.sqrt(bestDistanceSq),
    };
}

function orientation(
    a: GeometryPoint,
    b: GeometryPoint,
    c: GeometryPoint,
): number {
    const value =
        (b[1] - a[1]) * (c[0] - b[0]) -
        (b[0] - a[0]) * (c[1] - b[1]);
    if (Math.abs(value) <= INTERSECTION_EPSILON) {
        return 0;
    }
    return value > 0 ? 1 : 2;
}

function onSegment(
    a: GeometryPoint,
    b: GeometryPoint,
    c: GeometryPoint,
): boolean {
    return (
        Math.min(a[0], c[0]) - POINT_EPSILON <= b[0] &&
        b[0] <= Math.max(a[0], c[0]) + POINT_EPSILON &&
        Math.min(a[1], c[1]) - POINT_EPSILON <= b[1] &&
        b[1] <= Math.max(a[1], c[1]) + POINT_EPSILON
    );
}

function segmentsIntersect(
    p1: GeometryPoint,
    q1: GeometryPoint,
    p2: GeometryPoint,
    q2: GeometryPoint,
): boolean {
    const o1 = orientation(p1, q1, p2);
    const o2 = orientation(p1, q1, q2);
    const o3 = orientation(p2, q2, p1);
    const o4 = orientation(p2, q2, q1);

    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;
    return false;
}

function polylineHasSelfIntersection(points: ReadonlyArray<GeometryPoint>): boolean {
    if (points.length < 4) {
        return false;
    }
    const closed = pointsEqual(points[0]!, points[points.length - 1]!);
    const segmentCount = points.length - 1;
    for (let i = 0; i < segmentCount; i++) {
        for (let j = i + 1; j < segmentCount; j++) {
            if (Math.abs(i - j) <= 1) continue;
            if (closed && i === 0 && j === segmentCount - 1) continue;
            const a1 = points[i]!;
            const a2 = points[i + 1]!;
            const b1 = points[j]!;
            const b2 = points[j + 1]!;
            if (
                pointsEqual(a1, b1) ||
                pointsEqual(a1, b2) ||
                pointsEqual(a2, b1) ||
                pointsEqual(a2, b2)
            ) {
                continue;
            }
            if (segmentsIntersect(a1, a2, b1, b2)) {
                return true;
            }
        }
    }
    return false;
}

function buildOwnerStars(
    stars: ReadonlyArray<StarState>,
): Map<string, StarState[]> {
    const byOwner = new Map<string, StarState[]>();
    for (const star of stars) {
        if (!star.ownerId) continue;
        const bucket = byOwner.get(star.ownerId);
        if (bucket) {
            bucket.push(star);
        } else {
            byOwner.set(star.ownerId, [star]);
        }
    }
    for (const bucket of byOwner.values()) {
        bucket.sort((left, right) => left.id.localeCompare(right.id));
    }
    return byOwner;
}

function buildPolylineRefs<TShared extends MarginPolyline>(params: {
    sharedPolylines: ReadonlyArray<TShared>;
    worldBorderPolylines: ReadonlyArray<TShared>;
}): Array<PolylineRef<TShared>> {
    const refs: Array<PolylineRef<TShared>> = [];
    params.sharedPolylines.forEach((polyline, index) => {
        refs.push({
            group: 'shared',
            index,
            ownerPairKey: polyline.ownerPairKey,
            owners: polyline.ownerPairKey
                .split('|')
                .filter((ownerId) => ownerId !== 'world'),
            original: polyline,
            originalPoints: clonePoints(polyline.points),
            currentPoints: clonePoints(polyline.points),
        });
    });
    params.worldBorderPolylines.forEach((polyline, index) => {
        refs.push({
            group: 'world',
            index,
            ownerPairKey: polyline.ownerPairKey,
            owners: polyline.ownerPairKey
                .split('|')
                .filter((ownerId) => ownerId !== 'world'),
            original: polyline,
            originalPoints: clonePoints(polyline.points),
            currentPoints: clonePoints(polyline.points),
        });
    });
    return refs;
}

function assignStarAnchors<TShared extends MarginPolyline>(params: {
    refs: ReadonlyArray<PolylineRef<TShared>>;
    ownerStars: ReadonlyMap<string, ReadonlyArray<StarState>>;
    appliedMarginsByStarId: ReadonlyMap<string, number>;
}): StarAnchor[] {
    const anchors: StarAnchor[] = [];
    for (const [ownerId, stars] of params.ownerStars.entries()) {
        const eligibleRefs = params.refs.filter((ref) => ref.owners.includes(ownerId));
        if (eligibleRefs.length === 0) continue;

        for (const star of stars) {
            const radiusPx = params.appliedMarginsByStarId.get(star.id) ?? 0;
            if (radiusPx <= 0) continue;

            let best:
                | {
                      ref: PolylineRef<TShared>;
                      point: GeometryPoint;
                      arcLengthPx: number;
                      distancePx: number;
                  }
                | undefined;
            for (const ref of eligibleRefs) {
                const projection = projectPointOntoPolyline(
                    [star.x, star.y],
                    ref.originalPoints,
                );
                if (
                    !best ||
                    projection.distancePx < best.distancePx - INTERSECTION_EPSILON ||
                    (Math.abs(projection.distancePx - best.distancePx) <=
                        INTERSECTION_EPSILON &&
                        `${ref.group}:${ref.index}` <
                            `${best.ref.group}:${best.ref.index}`)
                ) {
                    best = {
                        ref,
                        point: projection.point,
                        arcLengthPx: projection.arcLengthPx,
                        distancePx: projection.distancePx,
                    };
                }
            }

            if (!best) continue;
            if (best.distancePx > radiusPx + ANCHOR_ASSIGNMENT_TOLERANCE_PX) {
                continue;
            }
            anchors.push({
                polylineGroup: best.ref.group,
                polylineIndex: best.ref.index,
                ownerPairKey: best.ref.ownerPairKey,
                ownerId,
                starId: star.id,
                starPoint: [star.x, star.y],
                radiusPx,
                anchorPoint: best.point,
                anchorArcLengthPx: best.arcLengthPx,
                distanceToChainPx: best.distancePx,
            });
        }
    }

    return anchors.sort((left, right) => {
        if (left.polylineGroup !== right.polylineGroup) {
            return left.polylineGroup.localeCompare(right.polylineGroup);
        }
        if (left.polylineIndex !== right.polylineIndex) {
            return left.polylineIndex - right.polylineIndex;
        }
        if (left.ownerId !== right.ownerId) {
            return left.ownerId.localeCompare(right.ownerId);
        }
        if (
            Math.abs(left.anchorArcLengthPx - right.anchorArcLengthPx) >
            INTERSECTION_EPSILON
        ) {
            return left.anchorArcLengthPx - right.anchorArcLengthPx;
        }
        return left.starId.localeCompare(right.starId);
    });
}

function buildStarIntervals<TShared extends MarginPolyline>(params: {
    refs: ReadonlyArray<PolylineRef<TShared>>;
    anchors: ReadonlyArray<StarAnchor>;
}): StarInterval[] {
    const intervals: StarInterval[] = [];
    const anchorsByChain = new Map<string, StarAnchor[]>();
    for (const anchor of params.anchors) {
        const key = `${anchor.polylineGroup}:${anchor.polylineIndex}`;
        const bucket = anchorsByChain.get(key);
        if (bucket) bucket.push(anchor);
        else anchorsByChain.set(key, [anchor]);
    }

    for (const [key, anchors] of anchorsByChain.entries()) {
        anchors.sort((left, right) => {
            if (
                Math.abs(left.anchorArcLengthPx - right.anchorArcLengthPx) >
                INTERSECTION_EPSILON
            ) {
                return left.anchorArcLengthPx - right.anchorArcLengthPx;
            }
            return left.starId.localeCompare(right.starId);
        });
        const [group, indexText] = key.split(':');
        const ref = params.refs.find(
            (candidate) =>
                candidate.group === group &&
                candidate.index === Number(indexText),
        );
        if (!ref) continue;
        const metrics = buildPolylineMetrics(ref.originalPoints);

        for (let i = 0; i < anchors.length; i++) {
            const anchor = anchors[i]!;
            const previous = anchors[i - 1];
            const next = anchors[i + 1];
            const intervalStartPx = previous
                ? (previous.anchorArcLengthPx + anchor.anchorArcLengthPx) * 0.5
                : 0;
            const intervalEndPx = next
                ? (anchor.anchorArcLengthPx + next.anchorArcLengthPx) * 0.5
                : metrics.totalLength;
            const intervalStartPoint = pointAtArcLength(
                ref.originalPoints,
                metrics,
                intervalStartPx,
            );
            const intervalEndPoint = pointAtArcLength(
                ref.originalPoints,
                metrics,
                intervalEndPx,
            );
            const intervalBoundaryRadiusPx = Math.max(
                0,
                Math.min(
                    pointDistance(anchor.starPoint, intervalStartPoint),
                    pointDistance(anchor.starPoint, intervalEndPoint),
                ) - INTERVAL_ENDPOINT_TOLERANCE_PX,
            );
            intervals.push({
                ...anchor,
                radiusPx: Math.min(anchor.radiusPx, intervalBoundaryRadiusPx),
                requestedRadiusPx: anchor.radiusPx,
                intervalStartPx,
                intervalEndPx,
                intervalStartPoint,
                intervalEndPoint,
            });
        }
    }

    return intervals.sort((left, right) => {
        if (left.polylineGroup !== right.polylineGroup) {
            return left.polylineGroup.localeCompare(right.polylineGroup);
        }
        if (left.polylineIndex !== right.polylineIndex) {
            return left.polylineIndex - right.polylineIndex;
        }
        if (
            Math.abs(left.intervalStartPx - right.intervalStartPx) >
            INTERSECTION_EPSILON
        ) {
            return left.intervalStartPx - right.intervalStartPx;
        }
        if (
            Math.abs(left.anchorArcLengthPx - right.anchorArcLengthPx) >
            INTERSECTION_EPSILON
        ) {
            return left.anchorArcLengthPx - right.anchorArcLengthPx;
        }
        if (left.ownerId !== right.ownerId) {
            return left.ownerId.localeCompare(right.ownerId);
        }
        return left.starId.localeCompare(right.starId);
    });
}

function buildIntervalDiagnostic(
    interval: StarInterval,
    patch?: Partial<MinStarMarginIntervalDiagnostic>,
): MinStarMarginIntervalDiagnostic {
    return {
        polylineGroup: interval.polylineGroup,
        polylineIndex: interval.polylineIndex,
        ownerPairKey: interval.ownerPairKey,
        ownerId: interval.ownerId,
        starId: interval.starId,
        starPoint: clonePoint(interval.starPoint),
        radiusPx: interval.radiusPx,
        requestedRadiusPx: interval.requestedRadiusPx,
        anchorPoint: clonePoint(interval.anchorPoint),
        anchorArcLengthPx: interval.anchorArcLengthPx,
        distanceToChainPx: interval.distanceToChainPx,
        intervalStartPx: interval.intervalStartPx,
        intervalEndPx: interval.intervalEndPx,
        intervalStartPoint: clonePoint(interval.intervalStartPoint),
        intervalEndPoint: clonePoint(interval.intervalEndPoint),
        violated: false,
        attempted: false,
        accepted: false,
        ...patch,
    };
}

function materializePolylineOutputs<TShared extends MarginPolyline>(
    refs: ReadonlyArray<PolylineRef<TShared>>,
): { sharedPolylines: TShared[]; worldBorderPolylines: TShared[] } {
    const sharedPolylines = refs
        .filter(
            (ref): ref is PolylineRef<TShared> & { group: 'shared' } =>
                ref.group === 'shared',
        )
        .sort((left, right) => left.index - right.index)
        .map((ref) => ({
            ...ref.original,
            points: clonePoints(ref.currentPoints),
        }));
    const worldBorderPolylines = refs
        .filter(
            (ref): ref is PolylineRef<TShared> & { group: 'world' } =>
                ref.group === 'world',
        )
        .sort((left, right) => left.index - right.index)
        .map((ref) => ({
            ...ref.original,
            points: clonePoints(ref.currentPoints),
    }));
    return { sharedPolylines, worldBorderPolylines };
}

function applyIntervalRepairs<TShared extends MarginPolyline>(params: {
    refs: Array<PolylineRef<TShared>>;
    intervals: ReadonlyArray<StarInterval>;
    starsById: ReadonlyMap<string, StarState>;
    validateRepair?: MinStarMarginValidator<TShared>;
}): MinStarMarginIntervalDiagnostic[] {
    const diagnostics: MinStarMarginIntervalDiagnostic[] = [];
    // Perf: index refs once by (group:index) rather than a linear find per
    // interval, and memoize per-ref polyline metrics by points-array identity.
    // An accepted repair REPLACES ref.currentPoints with a new array (it is not
    // mutated in place), so a changed ref naturally produces a new memo key while
    // intervals sharing an unchanged ref reuse a single metrics computation.
    const refsByKey = new Map<string, PolylineRef<TShared>>();
    for (const candidate of params.refs) {
        const key = `${candidate.group}:${candidate.index}`;
        if (!refsByKey.has(key)) refsByKey.set(key, candidate);
    }
    const metricsByPoints = new WeakMap<
        ReadonlyArray<GeometryPoint>,
        PolylineMetrics
    >();
    const getMetrics = (
        points: ReadonlyArray<GeometryPoint>,
    ): PolylineMetrics => {
        let metrics = metricsByPoints.get(points);
        if (!metrics) {
            metrics = buildPolylineMetrics(points);
            metricsByPoints.set(points, metrics);
        }
        return metrics;
    };
    for (const interval of params.intervals) {
        const ref = refsByKey.get(
            `${interval.polylineGroup}:${interval.polylineIndex}`,
        );
        const star = params.starsById.get(interval.starId);
        if (!ref || !star) {
            diagnostics.push(
                buildIntervalDiagnostic(interval, {
                    rejectionReason: 'Missing target polyline or star',
                }),
            );
            continue;
        }

        const startProjection = projectPointOntoPolyline(
            interval.intervalStartPoint,
            ref.currentPoints,
        );
        const endProjection = projectPointOntoPolyline(
            interval.intervalEndPoint,
            ref.currentPoints,
        );
        const boundaryDriftPx = Math.max(
            startProjection.distancePx,
            endProjection.distancePx,
        );
        if (boundaryDriftPx > INTERVAL_ENDPOINT_TOLERANCE_PX) {
            diagnostics.push(
                buildIntervalDiagnostic(interval, {
                    rejectionReason: `Interval boundary drift ${boundaryDriftPx.toFixed(2)}px`,
                }),
            );
            continue;
        }

        const startArcLengthPx = Math.min(
            startProjection.arcLengthPx,
            endProjection.arcLengthPx,
        );
        const endArcLengthPx = Math.max(
            startProjection.arcLengthPx,
            endProjection.arcLengthPx,
        );
        const metrics = getMetrics(ref.currentPoints);
        const intervalPoints = slicePolylineByArc(
            ref.currentPoints,
            metrics,
            startArcLengthPx,
            endArcLengthPx,
        );
        const violated =
            polylineIntrudesCircle(
                intervalPoints,
                star.x,
                star.y,
                interval.radiusPx,
            ) ||
            hasResidualMsrViolation(
                intervalPoints,
                star.x,
                star.y,
                interval.radiusPx,
            );
        if (!violated) {
            diagnostics.push(buildIntervalDiagnostic(interval, { violated: false }));
            continue;
        }

        const intrusionArcRange = resolveIntrusionArcRange(
            intervalPoints,
            star.x,
            star.y,
            interval.radiusPx,
        );
        if (intrusionArcRange && 'rejectionReason' in intrusionArcRange) {
            diagnostics.push(
                buildIntervalDiagnostic(interval, {
                    violated: true,
                    attempted: false,
                    accepted: false,
                    rejectionReason: intrusionArcRange.rejectionReason,
                }),
            );
            continue;
        }
        if (!intrusionArcRange) {
            diagnostics.push(buildIntervalDiagnostic(interval, { violated: false }));
            continue;
        }

        const intervalMetrics = buildPolylineMetrics(intervalPoints);
        const blendWindowPx = Math.min(
            REPAIR_BLEND_WINDOW_MAX_PX,
            interval.radiusPx * REPAIR_BLEND_WINDOW_RATIO,
            intrusionArcRange.startArcLengthPx,
            Math.max(
                0,
                intervalMetrics.totalLength - intrusionArcRange.endArcLengthPx,
            ),
        );
        const repairStartArcLengthPx = Math.max(
            0,
            intrusionArcRange.startArcLengthPx - blendWindowPx,
        );
        const repairEndArcLengthPx = Math.min(
            intervalMetrics.totalLength,
            intrusionArcRange.endArcLengthPx + blendWindowPx,
        );
        const offendingSubcurve = slicePolylineByArc(
            intervalPoints,
            intervalMetrics,
            repairStartArcLengthPx,
            repairEndArcLengthPx,
        );
        const repairedSubcurve = smoothClearanceCurve(
            applyCircleExclusionToPolyline(
                offendingSubcurve,
                star.x,
                star.y,
                interval.radiusPx,
            ),
            star.x,
            star.y,
            interval.radiusPx,
        );
        const candidateIntervalPoints = splicePolylineInterval(
            intervalPoints,
            repairStartArcLengthPx,
            repairEndArcLengthPx,
            repairedSubcurve,
        );
        const endpointStartDriftPx = pointDistance(
            candidateIntervalPoints[0]!,
            intervalPoints[0]!,
        );
        const endpointEndDriftPx = pointDistance(
            candidateIntervalPoints[candidateIntervalPoints.length - 1]!,
            intervalPoints[intervalPoints.length - 1]!,
        );
        const endpointsStable =
            endpointStartDriftPx <= SENSOR_REPAIR_TOLERANCE_PX &&
            endpointEndDriftPx <= SENSOR_REPAIR_TOLERANCE_PX;
        if (!endpointsStable) {
            diagnostics.push(
                buildIntervalDiagnostic(interval, {
                    violated: true,
                    attempted: true,
                    accepted: false,
                    rejectionReason: `Repair moved interval endpoints ${Math.max(
                        endpointStartDriftPx,
                        endpointEndDriftPx,
                    ).toFixed(2)}px`,
                }),
            );
            continue;
        }

        if (
            polylineIntrudesCircle(
                candidateIntervalPoints,
                star.x,
                star.y,
                interval.radiusPx,
                REPAIRED_CHORD_TOLERANCE_PX,
            )
        ) {
            diagnostics.push(
                buildIntervalDiagnostic(interval, {
                    violated: true,
                    attempted: true,
                    accepted: false,
                    rejectionReason: 'Repair left residual clearance violation',
                }),
            );
            continue;
        }

        const candidatePolyline = splicePolylineInterval(
            ref.currentPoints,
            startArcLengthPx,
            endArcLengthPx,
            candidateIntervalPoints,
        );
        if (polylineHasSelfIntersection(candidatePolyline)) {
            diagnostics.push(
                buildIntervalDiagnostic(interval, {
                    violated: true,
                    attempted: true,
                    accepted: false,
                    rejectionReason: 'Repair created a self-intersection',
                }),
            );
            continue;
        }

        if (params.validateRepair) {
            const previousPoints = ref.currentPoints;
            ref.currentPoints = candidatePolyline;
            const candidateOutputs = materializePolylineOutputs(params.refs);
            const validation = params.validateRepair({
                sharedPolylines: candidateOutputs.sharedPolylines,
                worldBorderPolylines: candidateOutputs.worldBorderPolylines,
                interval: buildIntervalDiagnostic(interval, {
                    violated: true,
                    attempted: true,
                    accepted: true,
                }),
            });
            if (!validation.ok) {
                ref.currentPoints = previousPoints;
                diagnostics.push(
                    buildIntervalDiagnostic(interval, {
                        violated: true,
                        attempted: true,
                        accepted: false,
                        rejectionReason:
                            validation.reason ?? 'Repair failed validation',
                    }),
                );
                continue;
            }
        }

        ref.currentPoints = candidatePolyline;
        diagnostics.push(
            buildIntervalDiagnostic(interval, {
                violated: true,
                attempted: true,
                accepted: true,
            }),
        );
    }

    return diagnostics;
}

function buildDiagnostics(params: {
    requestedMarginPx: number;
    minAppliedMarginPx: number;
    maxAppliedMarginPx: number;
    anchors: ReadonlyArray<StarAnchor>;
    intervals: ReadonlyArray<MinStarMarginIntervalDiagnostic>;
}): MinStarMarginDiagnostics {
    const invariantFailures = params.intervals
        .filter((interval) => interval.rejectionReason)
        .map(
            (interval) =>
                `${interval.ownerPairKey}:${interval.ownerId}:${interval.starId}:${interval.rejectionReason}`,
        );
    return {
        anchors: params.anchors.map((anchor) => ({
            polylineGroup: anchor.polylineGroup,
            polylineIndex: anchor.polylineIndex,
            ownerPairKey: anchor.ownerPairKey,
            ownerId: anchor.ownerId,
            starId: anchor.starId,
            starPoint: clonePoint(anchor.starPoint),
            radiusPx: anchor.radiusPx,
            anchorPoint: clonePoint(anchor.anchorPoint),
            anchorArcLengthPx: anchor.anchorArcLengthPx,
            distanceToChainPx: anchor.distanceToChainPx,
        })),
        intervals: params.intervals.map((interval) => ({
            ...interval,
            anchorPoint: clonePoint(interval.anchorPoint),
            intervalStartPoint: clonePoint(interval.intervalStartPoint),
            intervalEndPoint: clonePoint(interval.intervalEndPoint),
        })),
        summary: {
            requestedMarginPx: params.requestedMarginPx,
            minAppliedMarginPx: params.minAppliedMarginPx,
            maxAppliedMarginPx: params.maxAppliedMarginPx,
            anchorCount: params.anchors.length,
            intervalCount: params.intervals.length,
            violatedIntervalCount: params.intervals.filter((interval) => interval.violated)
                .length,
            attemptedRepairCount: params.intervals.filter((interval) => interval.attempted)
                .length,
            acceptedRepairCount: params.intervals.filter((interval) => interval.accepted)
                .length,
            rejectedRepairCount: params.intervals.filter(
                (interval) => interval.attempted && !interval.accepted,
            ).length,
            invariantFailures,
        },
    };
}

export function resolvePerStarMinStarMarginPx(params: {
    stars: ReadonlyArray<StarState>;
    requestedMarginPx: number;
    worldWidth: number;
    worldHeight: number;
}): ReadonlyMap<string, number> {
    const requested = clampRequestedMargin(params.requestedMarginPx);
    const perStar = new Map<string, number>();
    if (requested <= 0) {
        return perStar;
    }

    const ownedStars = params.stars
        .filter((star): star is StarState & { ownerId: string } => Boolean(star.ownerId))
        .sort((left, right) => left.id.localeCompare(right.id));

    for (const star of ownedStars) {
        let localCap = requested;

        const worldEdgeDistance = Math.min(
            star.x,
            params.worldWidth - star.x,
            star.y,
            params.worldHeight - star.y,
        );
        if (Number.isFinite(worldEdgeDistance)) {
            localCap = Math.min(localCap, Math.max(0, worldEdgeDistance));
        }

        let nearestEnemyDistance = Infinity;
        for (const other of ownedStars) {
            if (other.id === star.id || other.ownerId === star.ownerId) continue;
            const distance = Math.hypot(other.x - star.x, other.y - star.y);
            if (distance < nearestEnemyDistance) {
                nearestEnemyDistance = distance;
            }
        }
        if (Number.isFinite(nearestEnemyDistance)) {
            localCap = Math.min(localCap, Math.max(0, nearestEnemyDistance * 0.5));
        }

        perStar.set(star.id, localCap);
    }

    return perStar;
}

export function resolveAppliedMinStarMarginPx(
    stars: ReadonlyArray<StarState>,
    requestedMarginPx: number,
    worldWidth = Number.POSITIVE_INFINITY,
    worldHeight = Number.POSITIVE_INFINITY,
): number {
    const appliedMargins = resolvePerStarMinStarMarginPx({
        stars,
        requestedMarginPx,
        worldWidth,
        worldHeight,
    });
    if (appliedMargins.size === 0) {
        return clampRequestedMargin(requestedMarginPx);
    }
    return Math.min(...appliedMargins.values());
}

export function applyExplicitMinStarMargin<TShared extends MarginPolyline>(params: {
    sharedPolylines: ReadonlyArray<TShared>;
    worldBorderPolylines: ReadonlyArray<TShared>;
    stars: ReadonlyArray<StarState>;
    requestedMarginPx: number;
    worldWidth: number;
    worldHeight: number;
    validateRepair?: MinStarMarginValidator<TShared>;
}): MinStarMarginResult<TShared> {
    const requestedMarginPx = clampRequestedMargin(params.requestedMarginPx);
    const appliedMarginsByStarId = resolvePerStarMinStarMarginPx({
        stars: params.stars,
        requestedMarginPx,
        worldWidth: params.worldWidth,
        worldHeight: params.worldHeight,
    });
    const appliedValues = [...appliedMarginsByStarId.values()];
    const minAppliedMarginPx =
        appliedValues.length > 0 ? Math.min(...appliedValues) : requestedMarginPx;
    const maxAppliedMarginPx =
        appliedValues.length > 0 ? Math.max(...appliedValues) : requestedMarginPx;

    const refs = buildPolylineRefs({
        sharedPolylines: params.sharedPolylines,
        worldBorderPolylines: params.worldBorderPolylines,
    });

    if (requestedMarginPx <= 0 || appliedValues.every((value) => value <= 0)) {
        const outputs = materializePolylineOutputs(refs);
        const diagnostics = buildDiagnostics({
            requestedMarginPx,
            minAppliedMarginPx,
            maxAppliedMarginPx,
            anchors: [],
            intervals: [],
        });
        return {
            requestedMarginPx,
            minAppliedMarginPx,
            maxAppliedMarginPx,
            appliedMarginsByStarId,
            sharedPolylines: outputs.sharedPolylines,
            worldBorderPolylines: outputs.worldBorderPolylines,
            diagnostics,
        };
    }

    const ownerStars = buildOwnerStars(params.stars);
    const anchors = assignStarAnchors({
        refs,
        ownerStars,
        appliedMarginsByStarId,
    });
    const intervals = buildStarIntervals({ refs, anchors });
    const starsById = new Map(
        params.stars.map((star) => [star.id, star] as const),
    );
    const intervalDiagnostics = applyIntervalRepairs({
        refs,
        intervals,
        starsById,
        validateRepair: params.validateRepair,
    });
    const outputs = materializePolylineOutputs(refs);
    const diagnostics = buildDiagnostics({
        requestedMarginPx,
        minAppliedMarginPx,
        maxAppliedMarginPx,
        anchors,
        intervals: intervalDiagnostics,
    });

    return {
        requestedMarginPx,
        minAppliedMarginPx,
        maxAppliedMarginPx,
        appliedMarginsByStarId,
        sharedPolylines: outputs.sharedPolylines,
        worldBorderPolylines: outputs.worldBorderPolylines,
        diagnostics,
    };
}
