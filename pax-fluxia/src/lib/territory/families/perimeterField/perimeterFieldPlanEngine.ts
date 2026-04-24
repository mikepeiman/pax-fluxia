import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
import {
    logPipelineStage,
    summarizePerimeterVSet,
    summarizeTransitionPlan,
} from '$lib/perf/pipelineTelemetry';
import type {
    FrontierSection,
    FrontierTopology,
    RegionLoop,
} from '../../contracts/FrontierTopologyContracts';
import type { RenderFamilyTransitionEvent } from '../RenderFamilyTypes';
import { flattenRegionLoopPoints } from '../buildPowerVoronoiFrontierTopology';
import type {
    AppearingV,
    ChangedSectionSets,
    DisappearingV,
    PerimeterV,
    PerimeterVOwnerRole,
    SpanPair,
    TransitionMover,
    TransitionPlan,
    UnmatchedSpan,
} from './perimeterFieldTransitionTypes';

interface SamplingOptions {
    spacing: number;
    offsetPx: number;
    strength: number;
    ownerToCluster: ReadonlyMap<string, number>;
}

interface ResampledPoint {
    x: number;
    y: number;
    ownerId: string;
    playerIdx: number;
    strength: number;
    normalX: number;
    normalY: number;
}

const sampledVSetCache = new Map<string, readonly PerimeterV[]>();

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function pointInPolygon(x: number, y: number, points: ReadonlyArray<[number, number]>): boolean {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i]!;
        const [xj, yj] = points[j]!;
        const intersects =
            yi > y !== yj > y &&
            x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;
        if (intersects) inside = !inside;
    }
    return inside;
}

function polylineLength(points: ReadonlyArray<[number, number]>, closed = false): number {
    if (points.length < 2) return 0;
    let total = 0;
    const segmentCount = closed ? points.length : points.length - 1;
    for (let i = 0; i < segmentCount; i++) {
        const [ax, ay] = points[i]!;
        const [bx, by] = points[(i + 1) % points.length]!;
        total += Math.hypot(bx - ax, by - ay);
    }
    return total;
}

function averagePoint(points: ReadonlyArray<[number, number]>): [number, number] {
    if (points.length === 0) return [0, 0];
    let x = 0;
    let y = 0;
    for (const [px, py] of points) {
        x += px;
        y += py;
    }
    return [x / points.length, y / points.length];
}

function normalizeVector(x: number, y: number): { x: number; y: number } {
    const length = Math.hypot(x, y);
    if (length <= 1e-6) return { x: 0, y: 0 };
    return { x: x / length, y: y / length };
}

function buildPerimeterSectionPoints(
    loop: RegionLoop,
    sections: ReadonlyMap<string, FrontierSection>,
): [number, number][] {
    return flattenRegionLoopPoints(loop, sections);
}

function interpolateAlongPolyline(
    points: ReadonlyArray<[number, number]>,
    targetArclength: number,
): { point: [number, number]; tangent: { x: number; y: number } } {
    if (points.length === 0) {
        return { point: [0, 0], tangent: { x: 0, y: 0 } };
    }
    if (points.length === 1) {
        return { point: points[0]!, tangent: { x: 0, y: 0 } };
    }

    const clampedTarget = Math.max(0, Math.min(targetArclength, polylineLength(points)));
    let traversed = 0;
    for (let i = 0; i < points.length - 1; i++) {
        const [ax, ay] = points[i]!;
        const [bx, by] = points[i + 1]!;
        const dx = bx - ax;
        const dy = by - ay;
        const length = Math.hypot(dx, dy);
        if (length <= 1e-6) continue;
        if (traversed + length >= clampedTarget) {
            const t = (clampedTarget - traversed) / length;
            return {
                point: [ax + dx * t, ay + dy * t],
                tangent: normalizeVector(dx, dy),
            };
        }
        traversed += length;
    }

    const [ax, ay] = points[points.length - 2]!;
    const [bx, by] = points[points.length - 1]!;
    return {
        point: [bx, by],
        tangent: normalizeVector(bx - ax, by - ay),
    };
}

function chooseOffsetPoint(
    point: [number, number],
    tangent: { x: number; y: number },
    polygon: ReadonlyArray<[number, number]>,
    offsetPx: number,
): { x: number; y: number; normalX: number; normalY: number } {
    const leftNormal = normalizeVector(-tangent.y, tangent.x);
    if (offsetPx <= 0 || (leftNormal.x === 0 && leftNormal.y === 0)) {
        return { x: point[0], y: point[1], normalX: leftNormal.x, normalY: leftNormal.y };
    }

    const candidateA: [number, number] = [
        point[0] + leftNormal.x * offsetPx,
        point[1] + leftNormal.y * offsetPx,
    ];
    const candidateB: [number, number] = [
        point[0] - leftNormal.x * offsetPx,
        point[1] - leftNormal.y * offsetPx,
    ];

    const insideA = pointInPolygon(candidateA[0], candidateA[1], polygon);
    const insideB = pointInPolygon(candidateB[0], candidateB[1], polygon);
    if (insideA && !insideB) {
        return {
            x: candidateA[0],
            y: candidateA[1],
            normalX: leftNormal.x,
            normalY: leftNormal.y,
        };
    }
    if (insideB && !insideA) {
        return {
            x: candidateB[0],
            y: candidateB[1],
            normalX: -leftNormal.x,
            normalY: -leftNormal.y,
        };
    }
    if (insideA && insideB) {
        const [cx, cy] = averagePoint(polygon);
        const distA = Math.hypot(candidateA[0] - cx, candidateA[1] - cy);
        const distB = Math.hypot(candidateB[0] - cx, candidateB[1] - cy);
        const chosen = distA <= distB ? candidateA : candidateB;
        const chosenNormal =
            chosen === candidateA
                ? leftNormal
                : { x: -leftNormal.x, y: -leftNormal.y };
        return {
            x: chosen[0],
            y: chosen[1],
            normalX: chosenNormal.x,
            normalY: chosenNormal.y,
        };
    }

    const [cx, cy] = averagePoint(polygon);
    const towardCentroid = normalizeVector(cx - point[0], cy - point[1]);
    const fallback: [number, number] = [
        point[0] + towardCentroid.x * offsetPx,
        point[1] + towardCentroid.y * offsetPx,
    ];
    if (pointInPolygon(fallback[0], fallback[1], polygon)) {
        return {
            x: fallback[0],
            y: fallback[1],
            normalX: towardCentroid.x,
            normalY: towardCentroid.y,
        };
    }

    return {
        x: point[0],
        y: point[1],
        normalX: leftNormal.x,
        normalY: leftNormal.y,
    };
}

function getSectionPoints(
    section: FrontierSection,
    direction: 'forward' | 'reverse',
): [number, number][] {
    return direction === 'forward' ? section.points : [...section.points].reverse();
}

function buildLoopSampleCount(sectionLength: number, spacing: number): number {
    if (sectionLength <= 1e-6) return 1;
    return Math.max(1, Math.round(sectionLength / Math.max(4, spacing)));
}

function buildOwnerClusterKey(ownerToCluster: ReadonlyMap<string, number>): string {
    return [...ownerToCluster.entries()]
        .sort(([ownerA], [ownerB]) => ownerA.localeCompare(ownerB))
        .map(([ownerId, clusterIdx]) => `${ownerId}:${clusterIdx}`)
        .join('|');
}

function buildGeometryCacheKey(geometry: CanonicalGeometrySnapshot): string {
    const loopKey = geometry.frontierTopology.loops
        .map(
            (loop) =>
                `${loop.id}:${loop.ownerId}:${loop.sectionRefs
                    .map((section) => `${section.sectionId}:${section.direction}`)
                    .join(',')}`,
        )
        .join('|');
    const sectionKey = [...geometry.frontierTopology.sections.values()]
        .map(
            (section) =>
                `${section.id}:${section.kind}:${section.points
                    .map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`)
                    .join(';')}`,
        )
        .join('|');
    return `${geometry.version}::${loopKey}::${sectionKey}`;
}

function buildVSetCacheKey(params: {
    geometry: CanonicalGeometrySnapshot;
    options: SamplingOptions;
}): string {
    const { geometry, options } = params;
    return [
        buildGeometryCacheKey(geometry),
        options.spacing.toFixed(3),
        options.offsetPx.toFixed(3),
        options.strength.toFixed(3),
        buildOwnerClusterKey(options.ownerToCluster),
    ].join('::');
}

export function hasUsableFrontierTopology(
    geometry: CanonicalGeometrySnapshot,
): boolean {
    return (
        geometry.diagnostics.topologyReliable &&
        geometry.frontierTopology.sections.size > 0 &&
        geometry.frontierTopology.loops.length > 0
    );
}

export function buildPerimeterVMatchKey(v: Pick<PerimeterV, 'sectionId' | 'indexInSection'>): string {
    return `${v.sectionId}:${v.indexInSection}`;
}

export function sampleVSetFromGeometry(params: {
    geometry: CanonicalGeometrySnapshot;
    options: SamplingOptions;
}): PerimeterV[] {
    const cacheKey = buildVSetCacheKey(params);
    const cached = sampledVSetCache.get(cacheKey);
    if (cached) {
        logPipelineStage({
            channel: 'renderer',
            context: 'PerimeterFieldPlanEngine',
            stage: 'vset_cache_hit',
            from: 'Geometry + sampling options',
            to: 'Cached perimeter V-set',
            purpose: 'Reuse perimeter-field sample points without resampling unchanged topology',
            summary: summarizePerimeterVSet(cached as readonly PerimeterV[]),
            perfEventName: 'territory.perimeterField.vsetCacheHit',
            detail: {
                cacheKey,
                geometryVersion: params.geometry.version,
            },
        });
        return cached as PerimeterV[];
    }

    const { geometry, options } = params;
    const topology = geometry.frontierTopology;
    if (topology.sections.size === 0 || topology.loops.length === 0) return [];

    const vs: PerimeterV[] = [];
    const loops = [...topology.loops]
        .filter((loop) => loop.signedArea > 0 && Boolean(loop.ownerId))
        .sort((a, b) => a.id.localeCompare(b.id));

    for (const loop of loops) {
        const playerIdx = options.ownerToCluster.get(loop.ownerId);
        if (playerIdx === undefined) continue;
        const loopPoints = buildPerimeterSectionPoints(loop, topology.sections);
        if (loopPoints.length < 3) continue;

        const loopPerimeter = polylineLength(loopPoints, false);
        const adjustedOffset =
            loopPerimeter > 0 && loopPerimeter < options.offsetPx * 2
                ? loopPerimeter / 4
                : options.offsetPx;

        let arclengthCursor = 0;
        for (const sectionRef of loop.sectionRefs) {
            const section = topology.sections.get(sectionRef.sectionId);
            if (!section) continue;
            const sectionPoints = getSectionPoints(section, sectionRef.direction);
            const sectionLength = polylineLength(sectionPoints);
            const sampleCount = buildLoopSampleCount(sectionLength, options.spacing);

            for (let indexInSection = 0; indexInSection < sampleCount; indexInSection++) {
                const localTarget =
                    sectionLength <= 1e-6
                        ? 0
                        : ((indexInSection + 0.5) / sampleCount) * sectionLength;
                const { point, tangent } = interpolateAlongPolyline(
                    sectionPoints,
                    localTarget,
                );
                const offset = chooseOffsetPoint(
                    point,
                    tangent,
                    loopPoints,
                    adjustedOffset,
                );

                vs.push({
                    id: `v:${loop.id}:${section.id}:${indexInSection}`,
                    x: offset.x,
                    y: offset.y,
                    ownerId: loop.ownerId,
                    playerIdx,
                    strength: options.strength,
                    loopId: loop.id,
                    sectionId: section.id,
                    indexInSection,
                    sectionKind: section.kind,
                    arclengthInSection: localTarget,
                    arclengthInLoop: arclengthCursor + localTarget,
                    normalX: offset.normalX,
                    normalY: offset.normalY,
                });
            }

            arclengthCursor += sectionLength;
        }
    }

    sampledVSetCache.set(cacheKey, vs);
    logPipelineStage({
        channel: 'renderer',
        context: 'PerimeterFieldPlanEngine',
        stage: 'vset_cache_miss',
        from: 'Geometry + sampling options',
        to: 'New perimeter V-set',
        purpose: 'Sample perimeter-field frontier loops into cached V points for rendering and transition planning',
        summary: summarizePerimeterVSet(vs),
        perfEventName: 'territory.perimeterField.vsetCacheMiss',
        detail: {
            cacheKey,
            geometryVersion: geometry.version,
            topologySections: topology.sections.size,
            topologyLoops: topology.loops.length,
        },
    });
    return vs;
}

export function findChangedSectionIds(params: {
    prevTopology: FrontierTopology;
    nextTopology: FrontierTopology;
}): ChangedSectionSets {
    const prevSectionIds = new Set(params.prevTopology.sections.keys());
    const nextSectionIds = new Set(params.nextTopology.sections.keys());

    const removedSectionIds = new Set<string>();
    const addedSectionIds = new Set<string>();
    const unchangedSectionIds = new Set<string>();

    for (const sectionId of prevSectionIds) {
        if (nextSectionIds.has(sectionId)) unchangedSectionIds.add(sectionId);
        else removedSectionIds.add(sectionId);
    }
    for (const sectionId of nextSectionIds) {
        if (!prevSectionIds.has(sectionId)) addedSectionIds.add(sectionId);
    }

    return { removedSectionIds, addedSectionIds, unchangedSectionIds };
}

function groupByLoop(vs: readonly PerimeterV[]): Map<string, PerimeterV[]> {
    const grouped = new Map<string, PerimeterV[]>();
    for (const v of vs) {
        const bucket = grouped.get(v.loopId);
        if (bucket) bucket.push(v);
        else grouped.set(v.loopId, [v]);
    }
    for (const bucket of grouped.values()) {
        bucket.sort((a, b) => a.arclengthInLoop - b.arclengthInLoop);
    }
    return grouped;
}

function buildAnchorKey(v: PerimeterV): string {
    return `anchor:${buildPerimeterVMatchKey(v)}`;
}

function extractUnmatchedSpans(params: {
    vs: readonly PerimeterV[];
    changedSectionIds: ReadonlySet<string>;
    preservedMatchKeys: ReadonlySet<string>;
}): UnmatchedSpan[] {
    const spans: UnmatchedSpan[] = [];
    const byLoop = groupByLoop(params.vs);

    for (const [loopId, loopVs] of byLoop.entries()) {
        if (loopVs.length === 0) continue;
        const changedFlags = loopVs.map((v) =>
            params.changedSectionIds.has(v.sectionId) &&
            !params.preservedMatchKeys.has(buildPerimeterVMatchKey(v)),
        );

        if (!changedFlags.some(Boolean)) continue;
        if (changedFlags.every(Boolean)) {
            spans.push({
                spanId: `span:${loopId}:_:_`,
                loopId,
                anchorBeforeId: null,
                anchorAfterId: null,
                vs: [...loopVs],
            });
            continue;
        }

        let firstPreservedIndex = changedFlags.findIndex((flag) => !flag);
        if (firstPreservedIndex < 0) firstPreservedIndex = 0;
        let current: PerimeterV[] = [];
        let anchorBefore = loopVs[firstPreservedIndex]!;
        let index = (firstPreservedIndex + 1) % loopVs.length;

        while (index !== firstPreservedIndex) {
            const v = loopVs[index]!;
            if (changedFlags[index]) {
                current.push(v);
            } else if (current.length > 0) {
                const anchorAfter = v;
                spans.push({
                    spanId: `span:${loopId}:${buildAnchorKey(anchorBefore)}:${buildAnchorKey(anchorAfter)}`,
                    loopId,
                    anchorBeforeId: buildAnchorKey(anchorBefore),
                    anchorAfterId: buildAnchorKey(anchorAfter),
                    vs: current,
                });
                current = [];
                anchorBefore = v;
            } else {
                anchorBefore = v;
            }
            index = (index + 1) % loopVs.length;
        }

        if (current.length > 0) {
            const anchorAfter = loopVs[firstPreservedIndex]!;
            spans.push({
                spanId: `span:${loopId}:${buildAnchorKey(anchorBefore)}:${buildAnchorKey(anchorAfter)}`,
                loopId,
                anchorBeforeId: buildAnchorKey(anchorBefore),
                anchorAfterId: buildAnchorKey(anchorAfter),
                vs: current,
            });
        }
    }

    return spans;
}

function spanCentroid(span: UnmatchedSpan): { x: number; y: number } {
    if (span.vs.length === 0) return { x: 0, y: 0 };
    let x = 0;
    let y = 0;
    for (const v of span.vs) {
        x += v.x;
        y += v.y;
    }
    return { x: x / span.vs.length, y: y / span.vs.length };
}

function buildSpanAnchorKey(span: UnmatchedSpan): string | null {
    if (span.anchorBeforeId == null && span.anchorAfterId == null) return null;
    return `${span.anchorBeforeId ?? '_'}->${span.anchorAfterId ?? '_'}`;
}

function pairSpans(params: {
    prevSpans: readonly UnmatchedSpan[];
    nextSpans: readonly UnmatchedSpan[];
}): {
    spanPairs: SpanPair[];
    unmatchedPrev: UnmatchedSpan[];
    unmatchedNext: UnmatchedSpan[];
} {
    const spanPairs: SpanPair[] = [];
    const unmatchedPrev: UnmatchedSpan[] = [];
    const unmatchedNext: UnmatchedSpan[] = [];
    const usedNext = new Set<number>();
    let pairIndex = 0;

    const nextByAnchor = new Map<string, number[]>();
    params.nextSpans.forEach((span, index) => {
        const key = buildSpanAnchorKey(span);
        if (!key) return;
        const bucket = nextByAnchor.get(key);
        if (bucket) bucket.push(index);
        else nextByAnchor.set(key, [index]);
    });

    params.prevSpans.forEach((prevSpan) => {
        const key = buildSpanAnchorKey(prevSpan);
        if (key) {
            const bucket = nextByAnchor.get(key) ?? [];
            const nextIndex = bucket.find((candidate) => !usedNext.has(candidate));
            if (nextIndex != null) {
                const nextSpan = params.nextSpans[nextIndex]!;
                usedNext.add(nextIndex);
                spanPairs.push({
                    pairId: `sp:${String(pairIndex++).padStart(2, '0')}`,
                    prevSpan,
                    nextSpan,
                    prevVs: [...prevSpan.vs],
                    nextVs: [...nextSpan.vs],
                });
                return;
            }
        }

        if (prevSpan.anchorBeforeId == null && prevSpan.anchorAfterId == null) {
            const prevCentroid = spanCentroid(prevSpan);
            const wholeLoopCandidates = params.nextSpans
                .map((candidate, index) => ({ candidate, index }))
                .filter(
                    ({ candidate, index }) =>
                        !usedNext.has(index) &&
                        candidate.anchorBeforeId == null &&
                        candidate.anchorAfterId == null,
                );
            const preferredOwnerId = prevSpan.vs[0]?.ownerId ?? null;
            const ownerMatchedCandidates = preferredOwnerId
                ? wholeLoopCandidates.filter(
                      ({ candidate }) => candidate.vs[0]?.ownerId === preferredOwnerId,
                  )
                : [];
            const candidatePool =
                ownerMatchedCandidates.length > 0
                    ? ownerMatchedCandidates
                    : wholeLoopCandidates;

            let bestIndex = -1;
            let bestDistance = Infinity;
            candidatePool.forEach(({ candidate, index }) => {
                const centroid = spanCentroid(candidate);
                const distance = Math.hypot(
                    centroid.x - prevCentroid.x,
                    centroid.y - prevCentroid.y,
                );
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestIndex = index;
                }
            });
            if (bestIndex >= 0) {
                const nextSpan = params.nextSpans[bestIndex]!;
                usedNext.add(bestIndex);
                spanPairs.push({
                    pairId: `sp:${String(pairIndex++).padStart(2, '0')}`,
                    prevSpan,
                    nextSpan,
                    prevVs: [...prevSpan.vs],
                    nextVs: [...nextSpan.vs],
                });
                return;
            }
        }

        unmatchedPrev.push(prevSpan);
    });

    params.nextSpans.forEach((span, index) => {
        if (!usedNext.has(index)) unmatchedNext.push(span);
    });

    return { spanPairs, unmatchedPrev, unmatchedNext };
}

function buildCumulativeLengths(points: ReadonlyArray<[number, number]>, closed: boolean): number[] {
    const cumulative = [0];
    const segmentCount = closed ? points.length : points.length - 1;
    let total = 0;
    for (let i = 0; i < segmentCount; i++) {
        const [ax, ay] = points[i]!;
        const [bx, by] = points[(i + 1) % points.length]!;
        total += Math.hypot(bx - ax, by - ay);
        cumulative.push(total);
    }
    return cumulative;
}

function interpolateOnPath(
    points: ReadonlyArray<[number, number]>,
    cumulative: ReadonlyArray<number>,
    target: number,
    closed: boolean,
): [number, number] {
    if (points.length === 0) return [0, 0];
    if (points.length === 1) return points[0]!;
    const total = cumulative[cumulative.length - 1] ?? 0;
    const clamped = closed
        ? ((target % total) + total) % total
        : Math.max(0, Math.min(target, total));

    let segment = 0;
    while (segment < cumulative.length - 2 && cumulative[segment + 1]! < clamped) {
        segment += 1;
    }
    const spanStart = cumulative[segment]!;
    const spanEnd = cumulative[segment + 1]!;
    const t = spanEnd > spanStart ? (clamped - spanStart) / (spanEnd - spanStart) : 0;
    const [ax, ay] = points[segment]!;
    const [bx, by] = points[(segment + 1) % points.length]!;
    return [ax + (bx - ax) * t, ay + (by - ay) * t];
}

function findNearestSampleIndex(
    cumulative: ReadonlyArray<number>,
    target: number,
): number {
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < cumulative.length; i++) {
        const distance = Math.abs(cumulative[i]! - target);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = Math.min(i, cumulative.length - 2);
        }
    }
    return bestIndex;
}

function resampleVs(
    vs: readonly PerimeterV[],
    targetCount: number,
    closed: boolean,
): ResampledPoint[] {
    if (vs.length === 0 || targetCount <= 0) return [];
    const points = vs.map((v) => [v.x, v.y] as [number, number]);
    const cumulative = buildCumulativeLengths(points, closed);
    const total = cumulative[cumulative.length - 1] ?? 0;
    if (total <= 1e-6 || vs.length === 1) {
        return Array.from({ length: targetCount }, () => ({
            x: vs[0]!.x,
            y: vs[0]!.y,
            ownerId: vs[0]!.ownerId,
            playerIdx: vs[0]!.playerIdx,
            strength: vs[0]!.strength,
            normalX: vs[0]!.normalX,
            normalY: vs[0]!.normalY,
        }));
    }

    const result: ResampledPoint[] = [];
    for (let i = 0; i < targetCount; i++) {
        const target =
            closed
                ? (i / targetCount) * total
                : targetCount === 1
                  ? total / 2
                  : (i / (targetCount - 1)) * total;
        const [x, y] = interpolateOnPath(points, cumulative, target, closed);
        const nearestIndex = findNearestSampleIndex(cumulative, target);
        const nearest = vs[nearestIndex]!;
        result.push({
            x,
            y,
            ownerId: nearest.ownerId,
            playerIdx: nearest.playerIdx,
            strength: nearest.strength,
            normalX: nearest.normalX,
            normalY: nearest.normalY,
        });
    }
    return result;
}

function orientation(a: [number, number], b: [number, number], c: [number, number]): number {
    return (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
}

function onSegment(a: [number, number], b: [number, number], c: [number, number]): boolean {
    return (
        Math.min(a[0], c[0]) - 1e-6 <= b[0] &&
        b[0] <= Math.max(a[0], c[0]) + 1e-6 &&
        Math.min(a[1], c[1]) - 1e-6 <= b[1] &&
        b[1] <= Math.max(a[1], c[1]) + 1e-6
    );
}

function segmentsIntersect(
    a1: [number, number],
    a2: [number, number],
    b1: [number, number],
    b2: [number, number],
): boolean {
    const o1 = orientation(a1, a2, b1);
    const o2 = orientation(a1, a2, b2);
    const o3 = orientation(b1, b2, a1);
    const o4 = orientation(b1, b2, a2);

    if ((o1 > 0 && o2 < 0 || o1 < 0 && o2 > 0) && (o3 > 0 && o4 < 0 || o3 < 0 && o4 > 0)) {
        return true;
    }
    if (Math.abs(o1) <= 1e-6 && onSegment(a1, b1, a2)) return true;
    if (Math.abs(o2) <= 1e-6 && onSegment(a1, b2, a2)) return true;
    if (Math.abs(o3) <= 1e-6 && onSegment(b1, a1, b2)) return true;
    if (Math.abs(o4) <= 1e-6 && onSegment(b1, a2, b2)) return true;
    return false;
}

function pathCrossesStaticFrontiers(
    start: [number, number],
    end: [number, number],
    staticPolylines: readonly ReadonlyArray<[number, number]>[],
): boolean {
    for (const polyline of staticPolylines) {
        for (let i = 0; i < polyline.length - 1; i++) {
            if (segmentsIntersect(start, end, polyline[i]!, polyline[i + 1]!)) {
                return true;
            }
        }
    }
    return false;
}

function quadraticPoint(
    start: [number, number],
    control: [number, number],
    end: [number, number],
    t: number,
): [number, number] {
    const mt = 1 - t;
    const x = mt * mt * start[0] + 2 * mt * t * control[0] + t * t * end[0];
    const y = mt * mt * start[1] + 2 * mt * t * control[1] + t * t * end[1];
    return [x, y];
}

function arcCrossesStaticFrontiers(
    start: [number, number],
    control: [number, number],
    end: [number, number],
    staticPolylines: readonly ReadonlyArray<[number, number]>[],
): boolean {
    let previous = start;
    for (let step = 1; step <= 12; step++) {
        const current = quadraticPoint(start, control, end, step / 12);
        if (pathCrossesStaticFrontiers(previous, current, staticPolylines)) {
            return true;
        }
        previous = current;
    }
    return false;
}

function classifyOwnerRole(
    prevOwnerId: string,
    nextOwnerId: string,
    conquestEvents: ReadonlyArray<RenderFamilyTransitionEvent>,
): PerimeterVOwnerRole {
    const previousOwners = new Set(
        conquestEvents.map((entry) => entry.event.previousOwner),
    );
    const nextOwners = new Set(
        conquestEvents.map((entry) => entry.event.newOwner),
    );

    if (prevOwnerId !== nextOwnerId) {
        if (previousOwners.has(prevOwnerId)) return 'loser';
        if (nextOwners.has(nextOwnerId)) return 'victor';
        return 'neighbor';
    }
    if (previousOwners.has(prevOwnerId) && !nextOwners.has(prevOwnerId)) return 'loser';
    if (nextOwners.has(nextOwnerId) && !previousOwners.has(nextOwnerId)) return 'victor';
    return 'neighbor';
}

function buildTransitionMovers(params: {
    spanPairs: readonly SpanPair[];
    conquestEvents: ReadonlyArray<RenderFamilyTransitionEvent>;
    nextGeometry: CanonicalGeometrySnapshot;
    changedSections: ChangedSectionSets;
}): TransitionMover[] {
    const movers: TransitionMover[] = [];
    const staticPolylines = [...params.nextGeometry.frontierTopology.sections.values()]
        .filter((section) => params.changedSections.unchangedSectionIds.has(section.id))
        .map((section) => section.points);

    let moverIndex = 0;
    for (const spanPair of params.spanPairs) {
        const closed =
            spanPair.prevSpan.anchorBeforeId == null &&
            spanPair.prevSpan.anchorAfterId == null &&
            spanPair.nextSpan.anchorBeforeId == null &&
            spanPair.nextSpan.anchorAfterId == null;
        const targetCount = Math.max(spanPair.prevVs.length, spanPair.nextVs.length);
        if (targetCount <= 0) continue;

        const prevResampled = resampleVs(spanPair.prevVs, targetCount, closed);
        const nextResampled = resampleVs(spanPair.nextVs, targetCount, closed);

        for (let i = 0; i < targetCount; i++) {
            const prevPoint = prevResampled[i]!;
            const nextPoint = nextResampled[i]!;
            const start: [number, number] = [prevPoint.x, prevPoint.y];
            const end: [number, number] = [nextPoint.x, nextPoint.y];
            const deltaX = end[0] - start[0];
            const deltaY = end[1] - start[1];
            const distance = Math.hypot(deltaX, deltaY);
            const role = classifyOwnerRole(
                prevPoint.ownerId,
                nextPoint.ownerId,
                params.conquestEvents,
            );

            let pathType: TransitionMover['pathType'] = 'straight';
            let pathControlPoint: { x: number; y: number } | undefined;

            if (
                distance > 1e-6 &&
                pathCrossesStaticFrontiers(start, end, staticPolylines)
            ) {
                const perp = normalizeVector(-deltaY, deltaX);
                const referenceNormal = normalizeVector(
                    prevPoint.normalX + nextPoint.normalX,
                    prevPoint.normalY + nextPoint.normalY,
                );
                const signedPerp =
                    perp.x * referenceNormal.x + perp.y * referenceNormal.y >= 0
                        ? perp
                        : { x: -perp.x, y: -perp.y };

                for (const factor of [0.3, 0.45, 0.6, 0.8, 1.0]) {
                    const midpoint: [number, number] = [
                        (start[0] + end[0]) / 2,
                        (start[1] + end[1]) / 2,
                    ];
                    const control: [number, number] = [
                        midpoint[0] + signedPerp.x * distance * factor,
                        midpoint[1] + signedPerp.y * distance * factor,
                    ];
                    if (!arcCrossesStaticFrontiers(start, control, end, staticPolylines)) {
                        pathType = 'arc';
                        pathControlPoint = { x: control[0], y: control[1] };
                        break;
                    }
                }
            }

            movers.push({
                moverId: `P${String(moverIndex++).padStart(2, '0')}`,
                prevPos: { x: start[0], y: start[1] },
                nextPos: { x: end[0], y: end[1] },
                ownerId: nextPoint.ownerId,
                playerIdx: nextPoint.playerIdx,
                prevOwnerId: prevPoint.ownerId,
                prevPlayerIdx: prevPoint.playerIdx,
                nextOwnerId: nextPoint.ownerId,
                nextPlayerIdx: nextPoint.playerIdx,
                ownerRole: role,
                strength: (prevPoint.strength + nextPoint.strength) / 2,
                pathType,
                ...(pathControlPoint ? { pathControlPoint } : {}),
            });
        }
    }

    return movers;
}

function buildAppearingVs(spans: readonly UnmatchedSpan[]): AppearingV[] {
    const appearing: AppearingV[] = [];
    for (const span of spans) {
        for (const v of span.vs) {
            appearing.push({
                v,
                reason:
                    span.anchorBeforeId == null && span.anchorAfterId == null
                        ? 'region_created'
                        : 'new_section',
            });
        }
    }
    return appearing;
}

function buildDisappearingVs(spans: readonly UnmatchedSpan[]): DisappearingV[] {
    const disappearing: DisappearingV[] = [];
    for (const span of spans) {
        for (const v of span.vs) {
            disappearing.push({
                v,
                reason:
                    span.anchorBeforeId == null && span.anchorAfterId == null
                        ? 'region_eliminated'
                        : 'section_removed',
            });
        }
    }
    return disappearing;
}

export function evaluateTransitionMoverPosition(
    mover: TransitionMover,
    progress: number,
): { x: number; y: number } {
    const t = clamp01(progress);
    if (mover.pathType === 'arc' && mover.pathControlPoint) {
        const point = quadraticPoint(
            [mover.prevPos.x, mover.prevPos.y],
            [mover.pathControlPoint.x, mover.pathControlPoint.y],
            [mover.nextPos.x, mover.nextPos.y],
            t,
        );
        return { x: point[0], y: point[1] };
    }
    return {
        x: mover.prevPos.x + (mover.nextPos.x - mover.prevPos.x) * t,
        y: mover.prevPos.y + (mover.nextPos.y - mover.prevPos.y) * t,
    };
}

export function buildTransitionPlan(params: {
    conquestKey: string;
    prevVSet: readonly PerimeterV[];
    nextVSet: readonly PerimeterV[];
    conquestEvents: ReadonlyArray<RenderFamilyTransitionEvent>;
    prevGeometry: CanonicalGeometrySnapshot;
    nextGeometry: CanonicalGeometrySnapshot;
}): TransitionPlan {
    const changedSections = findChangedSectionIds({
        prevTopology: params.prevGeometry.frontierTopology,
        nextTopology: params.nextGeometry.frontierTopology,
    });

    const prevByMatchKey = new Map<string, PerimeterV>();
    const nextByMatchKey = new Map<string, PerimeterV>();
    for (const v of params.prevVSet) {
        if (changedSections.unchangedSectionIds.has(v.sectionId)) {
            prevByMatchKey.set(buildPerimeterVMatchKey(v), v);
        }
    }
    for (const v of params.nextVSet) {
        if (changedSections.unchangedSectionIds.has(v.sectionId)) {
            nextByMatchKey.set(buildPerimeterVMatchKey(v), v);
        }
    }

    const preservedMatchKeys = new Set<string>();
    const preservedVIds = new Set<string>();
    for (const [matchKey, prevV] of prevByMatchKey.entries()) {
        if (!nextByMatchKey.has(matchKey)) continue;
        preservedMatchKeys.add(matchKey);
        preservedVIds.add(prevV.id);
    }

    const prevSpans = extractUnmatchedSpans({
        vs: params.prevVSet,
        changedSectionIds: changedSections.removedSectionIds,
        preservedMatchKeys,
    });
    const nextSpans = extractUnmatchedSpans({
        vs: params.nextVSet,
        changedSectionIds: changedSections.addedSectionIds,
        preservedMatchKeys,
    });
    const { spanPairs, unmatchedPrev, unmatchedNext } = pairSpans({
        prevSpans,
        nextSpans,
    });

    const plan: TransitionPlan = {
        conquestKey: params.conquestKey,
        prevVSet: [...params.prevVSet],
        nextVSet: [...params.nextVSet],
        preservedVIds,
        preservedMatchKeys,
        movers: buildTransitionMovers({
            spanPairs,
            conquestEvents: params.conquestEvents,
            nextGeometry: params.nextGeometry,
            changedSections,
        }),
        appearing: buildAppearingVs(unmatchedNext),
        disappearing: buildDisappearingVs(unmatchedPrev),
        prevGeometry: params.prevGeometry,
        nextGeometry: params.nextGeometry,
        changedSections,
    };
    logPipelineStage({
        channel: 'renderer',
        context: 'PerimeterFieldPlanEngine',
        stage: 'transition_plan',
        from: 'Previous + next perimeter V-sets',
        to: 'Perimeter transition plan',
        purpose: 'Match preserved sections and build movers, appearing, and disappearing boundary samples',
        summary:
            `${summarizePerimeterVSet(params.prevVSet)} ` +
            `${summarizePerimeterVSet(params.nextVSet)} ` +
            summarizeTransitionPlan(plan),
        perfEventName: 'territory.perimeterField.transitionPlanBuilt',
        detail: {
            conquestKey: params.conquestKey,
            prevGeometryVersion: params.prevGeometry.version,
            nextGeometryVersion: params.nextGeometry.version,
        },
    });
    return plan;
}
