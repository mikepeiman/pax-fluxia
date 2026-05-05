import type { StarState } from '$lib/types/game.types';

type MarginTerritory = {
    ownerId: string;
    points: [number, number][];
};

export interface MinStarMarginResult {
    requestedMarginPx: number;
    appliedMarginPx: number;
}

const EPSILON = 1e-6;
const ARC_POINT_SPACING_PX = 8;

function computeMinInterStarDistance(stars: ReadonlyArray<StarState>): number {
    let minDistance = Infinity;
    for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
            const dx = stars[i]!.x - stars[j]!.x;
            const dy = stars[i]!.y - stars[j]!.y;
            const distance = Math.hypot(dx, dy);
            if (distance < minDistance) {
                minDistance = distance;
            }
        }
    }
    return minDistance;
}

function distanceToStar(point: [number, number], star: StarState): number {
    return Math.hypot(point[0] - star.x, point[1] - star.y);
}

function stripClosingPoint(points: ReadonlyArray<[number, number]>): [number, number][] {
    if (points.length <= 1) return [...points];
    const first = points[0]!;
    const last = points[points.length - 1]!;
    if (
        Math.abs(first[0] - last[0]) <= EPSILON &&
        Math.abs(first[1] - last[1]) <= EPSILON
    ) {
        return points.slice(0, -1).map((point) => [point[0], point[1]]);
    }
    return points.map((point) => [point[0], point[1]]);
}

function closeRing(points: ReadonlyArray<[number, number]>): [number, number][] {
    if (points.length === 0) return [];
    const closed = points.map((point) => [point[0], point[1]] as [number, number]);
    const first = closed[0]!;
    const last = closed[closed.length - 1]!;
    if (
        Math.abs(first[0] - last[0]) > EPSILON ||
        Math.abs(first[1] - last[1]) > EPSILON
    ) {
        closed.push([first[0], first[1]]);
    }
    return closed;
}

function projectToCircle(
    point: [number, number],
    star: StarState,
    radius: number,
): [number, number] {
    const dx = point[0] - star.x;
    const dy = point[1] - star.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= EPSILON) {
        return [star.x + radius, star.y];
    }
    const scale = radius / distance;
    return [star.x + dx * scale, star.y + dy * scale];
}

function solveSegmentCircleIntersections(
    start: [number, number],
    end: [number, number],
    star: StarState,
    radius: number,
): number[] {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const ox = start[0] - star.x;
    const oy = start[1] - star.y;

    const a = dx * dx + dy * dy;
    if (a <= EPSILON) return [];
    const b = 2 * (ox * dx + oy * dy);
    const c = ox * ox + oy * oy - radius * radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return [];

    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);

    return [t1, t2]
        .filter((t) => t >= -EPSILON && t <= 1 + EPSILON)
        .map((t) => Math.max(0, Math.min(1, t)))
        .sort((lhs, rhs) => lhs - rhs);
}

function interpolatePoint(
    start: [number, number],
    end: [number, number],
    t: number,
): [number, number] {
    return [
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t,
    ];
}

function circleIntersectionFromOutsideToInside(
    outsidePoint: [number, number],
    insidePoint: [number, number],
    star: StarState,
    radius: number,
): [number, number] {
    const ts = solveSegmentCircleIntersections(outsidePoint, insidePoint, star, radius);
    if (ts.length === 0) return projectToCircle(insidePoint, star, radius);
    return interpolatePoint(outsidePoint, insidePoint, ts[ts.length - 1]!);
}

function circleIntersectionFromInsideToOutside(
    insidePoint: [number, number],
    outsidePoint: [number, number],
    star: StarState,
    radius: number,
): [number, number] {
    const ts = solveSegmentCircleIntersections(insidePoint, outsidePoint, star, radius);
    if (ts.length === 0) return projectToCircle(insidePoint, star, radius);
    return interpolatePoint(insidePoint, outsidePoint, ts[0]!);
}

function unwrapAngles(angles: readonly number[]): number[] {
    if (angles.length === 0) return [];
    const unwrapped = [angles[0]!];
    for (let i = 1; i < angles.length; i++) {
        let candidate = angles[i]!;
        while (candidate - unwrapped[i - 1]! > Math.PI) candidate -= Math.PI * 2;
        while (candidate - unwrapped[i - 1]! < -Math.PI) candidate += Math.PI * 2;
        unwrapped.push(candidate);
    }
    return unwrapped;
}

function sampleArc(
    entry: [number, number],
    exit: [number, number],
    insideRun: ReadonlyArray<[number, number]>,
    star: StarState,
    radius: number,
): [number, number][] {
    const projectedAngles = [
        Math.atan2(entry[1] - star.y, entry[0] - star.x),
        ...insideRun.map((point) => {
            const projected = projectToCircle(point, star, radius);
            return Math.atan2(projected[1] - star.y, projected[0] - star.x);
        }),
        Math.atan2(exit[1] - star.y, exit[0] - star.x),
    ];
    const unwrapped = unwrapAngles(projectedAngles);
    const entryAngle = unwrapped[0]!;
    const exitAngle = unwrapped[unwrapped.length - 1]!;
    const sweep = exitAngle - entryAngle;
    const arcLength = Math.abs(sweep) * radius;
    const segmentCount = Math.max(2, Math.ceil(arcLength / ARC_POINT_SPACING_PX));

    const sampled: [number, number][] = [];
    for (let i = 0; i <= segmentCount; i++) {
        const t = i / segmentCount;
        const theta = entryAngle + sweep * t;
        sampled.push([
            star.x + Math.cos(theta) * radius,
            star.y + Math.sin(theta) * radius,
        ]);
    }
    return sampled;
}

function dedupeAdjacent(points: ReadonlyArray<[number, number]>): [number, number][] {
    const deduped: [number, number][] = [];
    for (const point of points) {
        const prev = deduped[deduped.length - 1];
        if (
            prev &&
            Math.abs(prev[0] - point[0]) <= EPSILON &&
            Math.abs(prev[1] - point[1]) <= EPSILON
        ) {
            continue;
        }
        deduped.push([point[0], point[1]]);
    }
    return deduped;
}

function rewriteRingForStar(
    openRing: ReadonlyArray<[number, number]>,
    star: StarState,
    radius: number,
): [number, number][] {
    if (openRing.length < 3) return [...openRing];

    let working = openRing.map((point) => [point[0], point[1]] as [number, number]);
    let insideFlags = working.map((point) => distanceToStar(point, star) < radius - EPSILON);
    if (!insideFlags.some(Boolean)) return working;

    if (insideFlags.every(Boolean)) {
        return working.map((point) => projectToCircle(point, star, radius));
    }

    if (insideFlags[0] && insideFlags[insideFlags.length - 1]) {
        const firstOutside = insideFlags.findIndex((inside) => !inside);
        working = [
            ...working.slice(firstOutside),
            ...working.slice(0, firstOutside),
        ];
        insideFlags = working.map((point) => distanceToStar(point, star) < radius - EPSILON);
    }

    const rewritten: [number, number][] = [];
    let index = 0;
    while (index < working.length) {
        if (!insideFlags[index]) {
            rewritten.push(working[index]!);
            index += 1;
            continue;
        }

        const runStart = index;
        let runEnd = index;
        while (runEnd + 1 < working.length && insideFlags[runEnd + 1]) {
            runEnd += 1;
        }

        const prevOutside = working[runStart - 1]!;
        const nextOutside = working[(runEnd + 1) % working.length]!;
        const firstInside = working[runStart]!;
        const lastInside = working[runEnd]!;
        const insideRun = working.slice(runStart, runEnd + 1);

        const entry = circleIntersectionFromOutsideToInside(
            prevOutside,
            firstInside,
            star,
            radius,
        );
        const exit = circleIntersectionFromInsideToOutside(
            lastInside,
            nextOutside,
            star,
            radius,
        );

        const arc = sampleArc(entry, exit, insideRun, star, radius);
        if (rewritten.length > 0) {
            const last = rewritten[rewritten.length - 1]!;
            const firstArcPoint = arc[0]!;
            if (
                Math.abs(last[0] - firstArcPoint[0]) <= EPSILON &&
                Math.abs(last[1] - firstArcPoint[1]) <= EPSILON
            ) {
                rewritten.pop();
            }
        }
        rewritten.push(...arc);
        index = runEnd + 1;
    }

    return dedupeAdjacent(rewritten);
}

export function resolveAppliedMinStarMarginPx(
    stars: ReadonlyArray<StarState>,
    requestedMarginPx: number,
): number {
    const requested = Math.max(0, requestedMarginPx);
    if (requested <= 0 || stars.length < 2) {
        return requested;
    }
    const minInterStarDistance = computeMinInterStarDistance(stars);
    if (!Number.isFinite(minInterStarDistance) || minInterStarDistance <= 0) {
        return requested;
    }
    return Math.min(requested, minInterStarDistance * 0.5);
}

export function applyExplicitMinStarMargin(
    territories: ReadonlyArray<MarginTerritory>,
    stars: ReadonlyArray<StarState>,
    requestedMarginPx: number,
): MinStarMarginResult {
    const appliedMarginPx = resolveAppliedMinStarMarginPx(
        stars,
        requestedMarginPx,
    );
    if (appliedMarginPx <= 0) {
        return { requestedMarginPx, appliedMarginPx };
    }

    const ownerStars = new Map<string, StarState[]>();
    for (const star of stars) {
        if (!star.ownerId) continue;
        const bucket = ownerStars.get(star.ownerId);
        if (bucket) bucket.push(star);
        else ownerStars.set(star.ownerId, [star]);
    }

    for (const territory of territories) {
        const starsForOwner = ownerStars.get(territory.ownerId);
        if (!starsForOwner?.length) continue;

        let openRing = stripClosingPoint(territory.points);
        for (const star of starsForOwner) {
            openRing = rewriteRingForStar(openRing, star, appliedMarginPx);
        }
        territory.points = closeRing(openRing);
    }

    return { requestedMarginPx, appliedMarginPx };
}
