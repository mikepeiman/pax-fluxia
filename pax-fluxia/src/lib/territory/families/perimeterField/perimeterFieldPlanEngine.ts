import type { CanonicalGeometrySnapshot } from '../../contracts/GeometryContracts';
import type { OwnershipSnapshot } from '../../contracts/OwnershipContracts';
import type {
    FrontierSection,
    FrontierTopology,
    RegionLoop,
} from '../../contracts/FrontierTopologyContracts';
import type { RenderFamilyTransitionEvent } from '../RenderFamilyTypes';
import { flattenRegionLoopPoints } from '../buildPowerVoronoiFrontierTopology';
import {
    listPerimeterGeometryLoops,
    type PerimeterGeometryLoop,
} from './perimeterFieldGeometryLoops';
import type {
    AppearingV,
    ChangedFrontChain,
    ChangedFrontChainSectionRef,
    ChangedFrontSelectionResult,
    ChangedSectionSets,
    DisappearingV,
    PerimeterV,
    PerimeterVOwnerRole,
    PerimeterFieldTransitionTruth,
    PreservedVPair,
    TransitionMover,
    TransitionPlan,
} from './perimeterFieldTransitionTypes';

interface SamplingOptions {
    spacing: number;
    offsetPx: number;
    strength: number;
    ownerToCluster: ReadonlyMap<string, number>;
}

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

function chooseOffsetPointFromNeighbors(
    point: [number, number],
    prevPoint: [number, number],
    nextPoint: [number, number],
    polygon: ReadonlyArray<[number, number]>,
    offsetPx: number,
): { x: number; y: number; normalX: number; normalY: number } {
    const tangent = normalizeVector(
        nextPoint[0] - prevPoint[0],
        nextPoint[1] - prevPoint[1],
    );
    return chooseOffsetPoint(point, tangent, polygon, offsetPx);
}

function getSectionPoints(
    section: FrontierSection,
    direction: 'forward' | 'reverse',
): [number, number][] {
    return direction === 'forward' ? section.points : [...section.points].reverse();
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

function signedArea(points: ReadonlyArray<[number, number]>): number {
    if (points.length < 3) return 0;
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i]!;
        const [bx, by] = points[(i + 1) % points.length]!;
        area += ax * by - bx * ay;
    }
    return area * 0.5;
}

function buildClosedLoopSampleCount(loopLength: number, spacing: number): number {
    if (loopLength <= 1e-6) return 1;
    return Math.max(3, Math.round(loopLength / Math.max(4, spacing)));
}

function interpolateAlongClosedLoop(
    points: ReadonlyArray<[number, number]>,
    cumulative: ReadonlyArray<number>,
    target: number,
): { point: [number, number]; tangent: { x: number; y: number } } {
    if (points.length === 0) {
        return { point: [0, 0], tangent: { x: 0, y: 0 } };
    }
    if (points.length === 1) {
        return { point: points[0]!, tangent: { x: 0, y: 0 } };
    }

    const total = cumulative[cumulative.length - 1] ?? 0;
    if (total <= 1e-6) {
        return { point: points[0]!, tangent: { x: 0, y: 0 } };
    }

    const wrapped = ((target % total) + total) % total;
    let segment = 0;
    while (segment < cumulative.length - 2 && cumulative[segment + 1]! < wrapped) {
        segment += 1;
    }
    const spanStart = cumulative[segment]!;
    const spanEnd = cumulative[segment + 1]!;
    const t = spanEnd > spanStart ? (wrapped - spanStart) / (spanEnd - spanStart) : 0;
    const [ax, ay] = points[segment]!;
    const [bx, by] = points[(segment + 1) % points.length]!;
    return {
        point: [ax + (bx - ax) * t, ay + (by - ay) * t],
        tangent: normalizeVector(bx - ax, by - ay),
    };
}

interface LoopSectionSpan {
    section: FrontierSection;
    start: number;
    end: number;
}

function buildLoopSectionSpans(
    loop: RegionLoop,
    sections: ReadonlyMap<string, FrontierSection>,
): { spans: LoopSectionSpan[]; totalLength: number } {
    const spans: LoopSectionSpan[] = [];
    let cursor = 0;
    for (const sectionRef of loop.sectionRefs) {
        const section = sections.get(sectionRef.sectionId);
        if (!section) continue;
        const sectionPoints = getSectionPoints(section, sectionRef.direction);
        const sectionLength = polylineLength(sectionPoints);
        spans.push({
            section,
            start: cursor,
            end: cursor + sectionLength,
        });
        cursor += sectionLength;
    }
    return { spans, totalLength: cursor };
}

function resolveLoopSectionSpan(
    spans: readonly LoopSectionSpan[],
    target: number,
    totalLength: number,
): LoopSectionSpan | null {
    if (spans.length === 0) return null;
    const clamped =
        totalLength <= 1e-6
            ? 0
            : Math.max(0, Math.min(target, Math.max(0, totalLength - 1e-6)));
    for (const span of spans) {
        if (clamped < span.end || Math.abs(clamped - span.end) <= 1e-6) {
            return span;
        }
    }
    return spans[spans.length - 1] ?? null;
}

function scoreVisibleLoopMatch(
    visibleLoop: PerimeterGeometryLoop,
    topologyLoopPoints: ReadonlyArray<[number, number]>,
): number {
    const [visibleCx, visibleCy] = averagePoint(visibleLoop.points);
    const [topologyCx, topologyCy] = averagePoint(topologyLoopPoints);
    const areaDelta =
        Math.abs(Math.sqrt(Math.abs(signedArea(visibleLoop.points)))) -
        Math.abs(Math.sqrt(Math.abs(signedArea(topologyLoopPoints))));
    const centroidDistance = Math.hypot(visibleCx - topologyCx, visibleCy - topologyCy);
    return Math.abs(areaDelta) * 4 + centroidDistance;
}

function matchVisibleLoopsByTopology(
    geometry: CanonicalGeometrySnapshot,
): ReadonlyMap<string, PerimeterGeometryLoop> {
    if (geometry.sourceMethod !== 'power_voronoi') {
        return new Map();
    }

    const visibleLoops = listPerimeterGeometryLoops(geometry).filter(
        (loop) => loop.points.length >= 3 && Boolean(loop.ownerId),
    );
    const topologyLoops = [...geometry.frontierTopology.loops]
        .filter((loop) => loop.signedArea > 0 && Boolean(loop.ownerId))
        .sort((a, b) => a.id.localeCompare(b.id));

    const byOwner = new Map<string, Array<{ index: number; loop: PerimeterGeometryLoop }>>();
    visibleLoops.forEach((loop, index) => {
        const bucket = byOwner.get(loop.ownerId);
        if (bucket) bucket.push({ index, loop });
        else byOwner.set(loop.ownerId, [{ index, loop }]);
    });

    const usedVisibleIndices = new Set<number>();
    const mapping = new Map<string, PerimeterGeometryLoop>();
    for (const topologyLoop of topologyLoops) {
        const topologyLoopPoints = buildPerimeterSectionPoints(
            topologyLoop,
            geometry.frontierTopology.sections,
        );
        const candidates = (byOwner.get(topologyLoop.ownerId) ?? []).filter(
            ({ index }) => !usedVisibleIndices.has(index),
        );
        if (candidates.length === 0) continue;

        let bestCandidate = candidates[0]!;
        let bestScore = scoreVisibleLoopMatch(bestCandidate.loop, topologyLoopPoints);
        for (const candidate of candidates.slice(1)) {
            const score = scoreVisibleLoopMatch(candidate.loop, topologyLoopPoints);
            if (score < bestScore) {
                bestScore = score;
                bestCandidate = candidate;
            }
        }

        usedVisibleIndices.add(bestCandidate.index);
        mapping.set(topologyLoop.id, bestCandidate.loop);
    }

    return mapping;
}

export function sampleVSetFromGeometry(params: {
    geometry: CanonicalGeometrySnapshot;
    options: SamplingOptions;
}): PerimeterV[] {
    const { geometry, options } = params;
    const topology = geometry.frontierTopology;
    if (topology.sections.size === 0 || topology.loops.length === 0) return [];

    const vs: PerimeterV[] = [];
    const loops = [...topology.loops]
        .filter((loop) => loop.signedArea > 0 && Boolean(loop.ownerId))
        .sort((a, b) => a.id.localeCompare(b.id));
    const visibleLoopMapping = matchVisibleLoopsByTopology(geometry);

    for (const loop of loops) {
        const playerIdx = options.ownerToCluster.get(loop.ownerId);
        if (playerIdx === undefined) continue;
        const topologyLoopPoints = buildPerimeterSectionPoints(loop, topology.sections);
        const visibleLoopPoints =
            visibleLoopMapping.get(loop.id)?.points ?? topologyLoopPoints;
        if (visibleLoopPoints.length < 3 || topologyLoopPoints.length < 3) continue;

        const visibleLoopPerimeter = polylineLength(visibleLoopPoints, true);
        const { spans, totalLength: topologyLoopPerimeter } = buildLoopSectionSpans(
            loop,
            topology.sections,
        );
        if (visibleLoopPerimeter <= 1e-6 || topologyLoopPerimeter <= 1e-6 || spans.length === 0) {
            continue;
        }

        const adjustedOffset =
            visibleLoopPerimeter > 0 && visibleLoopPerimeter < options.offsetPx * 2
                ? visibleLoopPerimeter / 4
                : options.offsetPx;

        const sampleCount = buildClosedLoopSampleCount(
            visibleLoopPerimeter,
            options.spacing,
        );
        const visibleCumulative = buildCumulativeLengths(visibleLoopPoints, true);
        const sampledLoopPoints = Array.from({ length: sampleCount }, (_, sampleIndex) => {
            const visibleTarget = (sampleIndex / sampleCount) * visibleLoopPerimeter;
            const topologyTarget =
                (visibleTarget / visibleLoopPerimeter) * topologyLoopPerimeter;
            const { point } = interpolateAlongClosedLoop(
                visibleLoopPoints,
                visibleCumulative,
                visibleTarget,
            );
            return { point, visibleTarget, topologyTarget };
        });
        const perSectionIndexes = new Map<string, number>();

        for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
            const sampled = sampledLoopPoints[sampleIndex]!;
            const prevSample = sampledLoopPoints[(sampleIndex + sampleCount - 1) % sampleCount]!;
            const nextSample = sampledLoopPoints[(sampleIndex + 1) % sampleCount]!;
            const visibleTarget = sampled.visibleTarget;
            const topologyTarget = sampled.topologyTarget;
            const span = resolveLoopSectionSpan(spans, topologyTarget, topologyLoopPerimeter);
            if (!span) continue;

            const offset = chooseOffsetPointFromNeighbors(
                sampled.point,
                prevSample.point,
                nextSample.point,
                visibleLoopPoints,
                adjustedOffset,
            );
            const indexInSection = perSectionIndexes.get(span.section.id) ?? 0;
            perSectionIndexes.set(span.section.id, indexInSection + 1);

            vs.push({
                id: `v:${loop.id}:${span.section.id}:${indexInSection}`,
                x: offset.x,
                y: offset.y,
                ownerId: loop.ownerId,
                playerIdx,
                strength: options.strength,
                loopId: loop.id,
                sectionId: span.section.id,
                indexInSection,
                sectionKind: span.section.kind,
                arclengthInSection: Math.max(0, topologyTarget - span.start),
                arclengthInLoop: topologyTarget,
                normalX: offset.normalX,
                normalY: offset.normalY,
            });
        }
    }

    return vs;
}

function sampleSectionShape(
    points: ReadonlyArray<[number, number]>,
    sampleCount = 7,
): [number, number][] {
    if (points.length <= 1) return [...points];
    const cumulative = buildCumulativeLengths(points, false);
    const total = cumulative[cumulative.length - 1] ?? 0;
    if (total <= 1e-6) return [...points];
    const samples: [number, number][] = [];
    for (let i = 0; i < sampleCount; i++) {
        const target =
            sampleCount === 1 ? total / 2 : (i / (sampleCount - 1)) * total;
        samples.push(interpolateOnPath(points, cumulative, target, false));
    }
    return samples;
}

function sectionsEquivalent(
    prevSection: FrontierSection,
    nextSection: FrontierSection,
    pointMoePx = 1.5,
): boolean {
    if (
        prevSection.leftOwnerId !== nextSection.leftOwnerId ||
        prevSection.rightOwnerId !== nextSection.rightOwnerId ||
        prevSection.kind !== nextSection.kind
    ) {
        return false;
    }
    const prevSamples = sampleSectionShape(prevSection.points);
    const nextSamples = sampleSectionShape(nextSection.points);
    if (prevSamples.length !== nextSamples.length) return false;
    for (let i = 0; i < prevSamples.length; i++) {
        const prev = prevSamples[i]!;
        const next = nextSamples[i]!;
        if (Math.hypot(prev[0] - next[0], prev[1] - next[1]) > pointMoePx) {
            return false;
        }
    }
    return true;
}

function buildRawLoopRecords(
    geometry: CanonicalGeometrySnapshot,
): Array<{
    ownerId: string;
    loopId: string;
    points: ReadonlyArray<[number, number]>;
    starIds: readonly string[];
}> {
    if (geometry.sourceMethod === 'power_voronoi') {
        const outerLoops = geometry.shellLoops.filter(
            (loop) => loop.classification === 'outer' && Boolean(loop.ownerId),
        );
        if (outerLoops.length > 0) {
            return outerLoops.map((loop) => ({
                ownerId: loop.ownerId!,
                loopId: loop.shellLoopId,
                points: loop.points,
                starIds: [...(loop.anchorStarIds ?? loop.starIds ?? [])],
            }));
        }
    }
    if (geometry.frontierTopology.loops.length > 0) {
        return geometry.frontierTopology.loops
            .filter((loop) => Boolean(loop.ownerId))
            .map((loop) => ({
                ownerId: loop.ownerId,
                loopId: loop.id,
                points: flattenRegionLoopPoints(
                    loop,
                    geometry.frontierTopology.sections,
                ),
                starIds: [],
            }));
    }
    return geometry.territoryRegions.map((region) => ({
        ownerId: region.ownerId,
        loopId: region.regionId,
        points: region.points,
        starIds: [...(region.anchorStarIds ?? region.starIds ?? [])],
    }));
}

function centroidOfPoints(
    points: ReadonlyArray<[number, number]>,
): { x: number; y: number } {
    const [x, y] = averagePoint(points);
    return { x, y };
}

function polygonContainsCentroid(
    a: ReadonlyArray<[number, number]>,
    b: ReadonlyArray<[number, number]>,
): boolean {
    const centroid = centroidOfPoints(a);
    return pointInPolygon(centroid.x, centroid.y, b);
}

function mapRawLoopToTopologyLoop(
    rawLoop: { ownerId: string; points: ReadonlyArray<[number, number]> },
    topology: FrontierTopology,
): RegionLoop | null {
    const candidates = topology.loops.filter(
        (loop) => loop.ownerId === rawLoop.ownerId && loop.signedArea > 0,
    );
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0]!;
    const rawCentroid = centroidOfPoints(rawLoop.points);
    let bestLoop: RegionLoop | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const candidate of candidates) {
        const points = flattenRegionLoopPoints(candidate, topology.sections);
        const candidateCentroid = centroidOfPoints(points);
        let score = -Math.hypot(
            candidateCentroid.x - rawCentroid.x,
            candidateCentroid.y - rawCentroid.y,
        );
        if (polygonContainsCentroid(rawLoop.points, points)) score += 500;
        if (polygonContainsCentroid(points, rawLoop.points)) score += 250;
        if (score > bestScore) {
            bestScore = score;
            bestLoop = candidate;
        }
    }
    return bestLoop;
}

function sectionTouchesOwners(
    section: FrontierSection,
    previousOwnerId: string,
    newOwnerId: string,
): boolean {
    return (
        section.leftOwnerId === previousOwnerId ||
        section.rightOwnerId === previousOwnerId ||
        section.leftOwnerId === newOwnerId ||
        section.rightOwnerId === newOwnerId
    );
}

function collectSeedLoopIds(params: {
    geometry: CanonicalGeometrySnapshot;
    topology: FrontierTopology;
    ownerId: string;
    starId: string;
}): string[] {
    const seedLoops = buildRawLoopRecords(params.geometry).filter(
        (loop) =>
            loop.ownerId === params.ownerId &&
            loop.starIds.includes(params.starId),
    );
    const resolved = seedLoops
        .map((loop) => mapRawLoopToTopologyLoop(loop, params.topology)?.id ?? null)
        .filter((loopId): loopId is string => loopId !== null);
    if (resolved.length > 0) return [...new Set(resolved)];
    return params.topology.loops
        .filter((loop) => loop.ownerId === params.ownerId)
        .map((loop) => loop.id)
        .sort((a, b) => a.localeCompare(b));
}

function expandChangedSectionsFromSeeds(params: {
    topology: FrontierTopology;
    seedLoopIds: readonly string[];
    candidateSectionIds: ReadonlySet<string>;
    previousOwnerId: string;
    newOwnerId: string;
}): Set<string> {
    const allowed = new Set<string>();
    for (const sectionId of params.candidateSectionIds) {
        const section = params.topology.sections.get(sectionId);
        if (
            section &&
            sectionTouchesOwners(
                section,
                params.previousOwnerId,
                params.newOwnerId,
            )
        ) {
            allowed.add(sectionId);
        }
    }

    const loopById = new Map(params.topology.loops.map((loop) => [loop.id, loop]));
    const queue: string[] = [];
    const visited = new Set<string>();
    for (const loopId of params.seedLoopIds) {
        const loop = loopById.get(loopId);
        if (!loop) continue;
        for (const ref of loop.sectionRefs) {
            if (!allowed.has(ref.sectionId) || visited.has(ref.sectionId)) continue;
            visited.add(ref.sectionId);
            queue.push(ref.sectionId);
        }
    }

    while (queue.length > 0) {
        const sectionId = queue.shift()!;
        const section = params.topology.sections.get(sectionId);
        if (!section) continue;
        for (const vertexId of [section.startVertexId, section.endVertexId]) {
            for (const adjacentId of params.topology.sectionsByVertex.get(vertexId) ?? []) {
                if (!allowed.has(adjacentId) || visited.has(adjacentId)) continue;
                visited.add(adjacentId);
                queue.push(adjacentId);
            }
        }
    }

    return visited;
}

function buildSpanOrderForSelection(params: {
    topology: FrontierTopology;
    loopIds: readonly string[];
    selectedSectionIds: ReadonlySet<string>;
}): ChangedFrontChainSectionRef[] {
    const loopById = new Map(params.topology.loops.map((loop) => [loop.id, loop]));
    const orderedLoopIds = [
        ...params.loopIds,
        ...params.topology.loops
            .filter((loop) => !params.loopIds.includes(loop.id))
            .filter((loop) =>
                loop.sectionRefs.some((ref) =>
                    params.selectedSectionIds.has(ref.sectionId),
                ),
            )
            .map((loop) => loop.id)
            .sort((a, b) => a.localeCompare(b)),
    ];
    const refs: ChangedFrontChainSectionRef[] = [];
    for (const loopId of orderedLoopIds) {
        const loop = loopById.get(loopId);
        if (!loop) continue;
        for (const ref of loop.sectionRefs) {
            if (!params.selectedSectionIds.has(ref.sectionId)) continue;
            refs.push({
                loopId,
                sectionId: ref.sectionId,
                direction: ref.direction,
            });
        }
    }
    return refs;
}

export function findChangedSectionIds(params: {
    prevTopology: FrontierTopology;
    nextTopology: FrontierTopology;
}): ChangedSectionSets {
    const prevSectionIds = new Set(params.prevTopology.sections.keys());
    const nextSectionIds = new Set(params.nextTopology.sections.keys());

    const removedSectionIds = new Set<string>();
    const addedSectionIds = new Set<string>();
    const sharedChangedSectionIds = new Set<string>();
    const unchangedSectionIds = new Set<string>();

    for (const sectionId of prevSectionIds) {
        if (!nextSectionIds.has(sectionId)) {
            removedSectionIds.add(sectionId);
            continue;
        }
        const prevSection = params.prevTopology.sections.get(sectionId);
        const nextSection = params.nextTopology.sections.get(sectionId);
        if (prevSection && nextSection && sectionsEquivalent(prevSection, nextSection)) {
            unchangedSectionIds.add(sectionId);
        } else {
            sharedChangedSectionIds.add(sectionId);
        }
    }
    for (const sectionId of nextSectionIds) {
        if (!prevSectionIds.has(sectionId)) {
            addedSectionIds.add(sectionId);
        }
    }

    return {
        removedSectionIds,
        addedSectionIds,
        sharedChangedSectionIds,
        unchangedSectionIds,
        selectedPrevSectionIds: new Set<string>(),
        selectedNextSectionIds: new Set<string>(),
    };
}

export function buildChangedFrontSelection(params: {
    prevGeometry: CanonicalGeometrySnapshot;
    nextGeometry: CanonicalGeometrySnapshot;
    conquestEvents: ReadonlyArray<RenderFamilyTransitionEvent>;
}): ChangedFrontSelectionResult {
    const changedSections = findChangedSectionIds({
        prevTopology: params.prevGeometry.frontierTopology,
        nextTopology: params.nextGeometry.frontierTopology,
    });
    const prevCandidateSectionIds = new Set<string>([
        ...changedSections.removedSectionIds,
        ...changedSections.sharedChangedSectionIds,
    ]);
    const nextCandidateSectionIds = new Set<string>([
        ...changedSections.addedSectionIds,
        ...changedSections.sharedChangedSectionIds,
    ]);
    const selectedPrevSectionIds = new Set<string>();
    const selectedNextSectionIds = new Set<string>();
    const chains: ChangedFrontChain[] = [];

    params.conquestEvents.forEach((entry, index) => {
        const event = entry.event;
        const prevLoopIds = collectSeedLoopIds({
            geometry: params.prevGeometry,
            topology: params.prevGeometry.frontierTopology,
            ownerId: event.previousOwner,
            starId: event.starId,
        });
        const nextLoopIds = collectSeedLoopIds({
            geometry: params.nextGeometry,
            topology: params.nextGeometry.frontierTopology,
            ownerId: event.newOwner,
            starId: event.starId,
        });
        const prevSectionIds = expandChangedSectionsFromSeeds({
            topology: params.prevGeometry.frontierTopology,
            seedLoopIds: prevLoopIds,
            candidateSectionIds: prevCandidateSectionIds,
            previousOwnerId: event.previousOwner,
            newOwnerId: event.newOwner,
        });
        const nextSectionIds = expandChangedSectionsFromSeeds({
            topology: params.nextGeometry.frontierTopology,
            seedLoopIds: nextLoopIds,
            candidateSectionIds: nextCandidateSectionIds,
            previousOwnerId: event.previousOwner,
            newOwnerId: event.newOwner,
        });

        for (const sectionId of prevSectionIds) {
            selectedPrevSectionIds.add(sectionId);
        }
        for (const sectionId of nextSectionIds) {
            selectedNextSectionIds.add(sectionId);
        }

        chains.push({
            chainId: `chain:${String(index).padStart(2, '0')}:${event.starId}`,
            seedStarId: event.starId,
            previousOwnerId: event.previousOwner,
            newOwnerId: event.newOwner,
            ownerPairTransition: `${event.previousOwner}->${event.newOwner}`,
            prevSectionIds: [...prevSectionIds].sort(),
            nextSectionIds: [...nextSectionIds].sort(),
            prevLoopIds,
            nextLoopIds,
            prevSpanOrder: buildSpanOrderForSelection({
                topology: params.prevGeometry.frontierTopology,
                loopIds: prevLoopIds,
                selectedSectionIds: prevSectionIds,
            }),
            nextSpanOrder: buildSpanOrderForSelection({
                topology: params.nextGeometry.frontierTopology,
                loopIds: nextLoopIds,
                selectedSectionIds: nextSectionIds,
            }),
        });
    });

    return {
        chains,
        changedSections: {
            ...changedSections,
            selectedPrevSectionIds,
            selectedNextSectionIds,
        },
    };
}

interface OrderedChainV {
    v: PerimeterV;
    chainProgress: number;
    tangent: { x: number; y: number };
}

interface PreservedIndexPair {
    prevIndex: number;
    nextIndex: number;
}

interface IntervalPair {
    chainId: string;
    prevVs: readonly PerimeterV[];
    nextVs: readonly PerimeterV[];
}

function buildOrderedChainVs(params: {
    vs: readonly PerimeterV[];
    spanOrder: readonly ChangedFrontChainSectionRef[];
}): OrderedChainV[] {
    const byLoopAndSection = new Map<string, PerimeterV[]>();
    for (const v of params.vs) {
        const key = `${v.loopId}:${v.sectionId}`;
        const bucket = byLoopAndSection.get(key);
        if (bucket) bucket.push(v);
        else byLoopAndSection.set(key, [v]);
    }

    const orderedVs: PerimeterV[] = [];
    const seenIds = new Set<string>();
    for (const ref of params.spanOrder) {
        const key = `${ref.loopId}:${ref.sectionId}`;
        const bucket = [...(byLoopAndSection.get(key) ?? [])].sort(
            (a, b) => a.arclengthInSection - b.arclengthInSection,
        );
        for (const v of bucket) {
            if (seenIds.has(v.id)) continue;
            seenIds.add(v.id);
            orderedVs.push(v);
        }
    }
    if (orderedVs.length === 0) return [];
    if (orderedVs.length === 1) {
        return [{ v: orderedVs[0]!, chainProgress: 0, tangent: { x: 0, y: 0 } }];
    }

    const cumulative = [0];
    for (let i = 1; i < orderedVs.length; i++) {
        const prev = orderedVs[i - 1]!;
        const next = orderedVs[i]!;
        cumulative.push(
            cumulative[i - 1]! + Math.hypot(next.x - prev.x, next.y - prev.y),
        );
    }
    const total = cumulative[cumulative.length - 1] ?? 0;
    return orderedVs.map((v, index) => {
        const prev = orderedVs[Math.max(0, index - 1)]!;
        const next = orderedVs[Math.min(orderedVs.length - 1, index + 1)]!;
        return {
            v,
            chainProgress:
                total <= 1e-6
                    ? index / Math.max(1, orderedVs.length - 1)
                    : cumulative[index]! / total,
            tangent: normalizeVector(next.x - prev.x, next.y - prev.y),
        };
    });
}

function isPreserveCompatible(params: {
    prev: OrderedChainV;
    next: OrderedChainV;
    positionMoePx?: number;
}): boolean {
    const positionMoePx = params.positionMoePx ?? 3;
    const distance = Math.hypot(
        params.prev.v.x - params.next.v.x,
        params.prev.v.y - params.next.v.y,
    );
    if (distance > positionMoePx) return false;
    const tangentDot =
        params.prev.tangent.x * params.next.tangent.x +
        params.prev.tangent.y * params.next.tangent.y;
    if (tangentDot < 0.2) return false;
    return (
        Math.abs(params.prev.chainProgress - params.next.chainProgress) <= 0.22
    );
}

function selectPreservedPairs(params: {
    prev: readonly OrderedChainV[];
    next: readonly OrderedChainV[];
}): PreservedIndexPair[] {
    const prevCount = params.prev.length;
    const nextCount = params.next.length;
    const matches: number[][] = Array.from({ length: prevCount + 1 }, () =>
        Array.from({ length: nextCount + 1 }, () => 0),
    );
    const costs: number[][] = Array.from({ length: prevCount + 1 }, () =>
        Array.from({ length: nextCount + 1 }, () => 0),
    );

    for (let i = prevCount - 1; i >= 0; i--) {
        for (let j = nextCount - 1; j >= 0; j--) {
            let bestMatches = matches[i + 1]![j]!;
            let bestCost = costs[i + 1]![j]!;
            if (
                matches[i]![j + 1]! > bestMatches ||
                (matches[i]![j + 1]! === bestMatches &&
                    costs[i]![j + 1]! < bestCost)
            ) {
                bestMatches = matches[i]![j + 1]!;
                bestCost = costs[i]![j + 1]!;
            }
            if (
                isPreserveCompatible({
                    prev: params.prev[i]!,
                    next: params.next[j]!,
                })
            ) {
                const distance = Math.hypot(
                    params.prev[i]!.v.x - params.next[j]!.v.x,
                    params.prev[i]!.v.y - params.next[j]!.v.y,
                );
                const candidateMatches = 1 + matches[i + 1]![j + 1]!;
                const candidateCost = distance + costs[i + 1]![j + 1]!;
                if (
                    candidateMatches > bestMatches ||
                    (candidateMatches === bestMatches &&
                        candidateCost < bestCost)
                ) {
                    bestMatches = candidateMatches;
                    bestCost = candidateCost;
                }
            }
            matches[i]![j] = bestMatches;
            costs[i]![j] = bestCost;
        }
    }

    const selected: PreservedIndexPair[] = [];
    let i = 0;
    let j = 0;
    while (i < prevCount && j < nextCount) {
        if (
            isPreserveCompatible({
                prev: params.prev[i]!,
                next: params.next[j]!,
            })
        ) {
            const distance = Math.hypot(
                params.prev[i]!.v.x - params.next[j]!.v.x,
                params.prev[i]!.v.y - params.next[j]!.v.y,
            );
            const candidateMatches = 1 + matches[i + 1]![j + 1]!;
            const candidateCost = distance + costs[i + 1]![j + 1]!;
            if (
                candidateMatches === matches[i]![j] &&
                Math.abs(candidateCost - costs[i]![j]!) <= 1e-6
            ) {
                selected.push({ prevIndex: i, nextIndex: j });
                i += 1;
                j += 1;
                continue;
            }
        }

        if (
            matches[i + 1]![j]! > matches[i]![j + 1]! ||
            (matches[i + 1]![j]! === matches[i]![j + 1]! &&
                costs[i + 1]![j]! <= costs[i]![j + 1]!)
        ) {
            i += 1;
        } else {
            j += 1;
        }
    }
    return selected;
}

function buildIntervalPairs(params: {
    chainId: string;
    prev: readonly OrderedChainV[];
    next: readonly OrderedChainV[];
    preservedPairs: readonly PreservedIndexPair[];
}): IntervalPair[] {
    const intervals: IntervalPair[] = [];
    let prevCursor = 0;
    let nextCursor = 0;

    for (const pair of params.preservedPairs) {
        intervals.push({
            chainId: params.chainId,
            prevVs: params.prev
                .slice(prevCursor, pair.prevIndex)
                .map((entry) => entry.v),
            nextVs: params.next
                .slice(nextCursor, pair.nextIndex)
                .map((entry) => entry.v),
        });
        prevCursor = pair.prevIndex + 1;
        nextCursor = pair.nextIndex + 1;
    }

    intervals.push({
        chainId: params.chainId,
        prevVs: params.prev.slice(prevCursor).map((entry) => entry.v),
        nextVs: params.next.slice(nextCursor).map((entry) => entry.v),
    });

    return intervals.filter(
        (interval) => interval.prevVs.length > 0 || interval.nextVs.length > 0,
    );
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

function expandVsToTargetCount(
    vs: readonly PerimeterV[],
    targetCount: number,
): PerimeterV[] {
    if (vs.length === 0 || targetCount <= 0) return [];
    if (vs.length === 1) {
        return Array.from({ length: targetCount }, () => vs[0]!);
    }
    if (vs.length === targetCount) return [...vs];

    const result: PerimeterV[] = [];
    for (let i = 0; i < targetCount; i++) {
        const normalized =
            targetCount === 1 ? 0 : i / Math.max(1, targetCount - 1);
        const sourceIndex = Math.round(normalized * Math.max(0, vs.length - 1));
        result.push(vs[Math.max(0, Math.min(sourceIndex, vs.length - 1))]!);
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
    intervalPairs: readonly IntervalPair[];
    conquestEvents: ReadonlyArray<RenderFamilyTransitionEvent>;
    nextGeometry: CanonicalGeometrySnapshot;
    changedSections: ChangedSectionSets;
}): TransitionMover[] {
    const movers: TransitionMover[] = [];
    const staticPolylines = [...params.nextGeometry.frontierTopology.sections.values()]
        .filter(
            (section) =>
                !params.changedSections.selectedNextSectionIds.has(section.id),
        )
        .map((section) => section.points);

    let moverIndex = 0;
    for (const interval of params.intervalPairs) {
        if (interval.prevVs.length === 0 || interval.nextVs.length === 0) continue;
        const targetCount = Math.max(interval.prevVs.length, interval.nextVs.length, 1);
        if (targetCount <= 0) continue;

        const prevMatched = expandVsToTargetCount(interval.prevVs, targetCount);
        const nextMatched = expandVsToTargetCount(interval.nextVs, targetCount);

        for (let i = 0; i < targetCount; i++) {
            const prevPoint = prevMatched[i]!;
            const nextPoint = nextMatched[i]!;
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
    changedFronts?: ChangedFrontSelectionResult;
}): TransitionPlan {
    const changedFronts =
        params.changedFronts ??
        buildChangedFrontSelection({
            prevGeometry: params.prevGeometry,
            nextGeometry: params.nextGeometry,
            conquestEvents: params.conquestEvents,
        });
    const changedSections = changedFronts.changedSections;
    const preserved: PreservedVPair[] = [];
    const preservedMatchKeys = new Set<string>();
    const preservedVIds = new Set<string>();
    const intervalPairs: IntervalPair[] = [];
    const appearing: AppearingV[] = [];
    const disappearing: DisappearingV[] = [];

    changedFronts.chains.forEach((chain, chainIndex) => {
        const prevOrdered = buildOrderedChainVs({
            vs: params.prevVSet.filter((v) =>
                changedSections.selectedPrevSectionIds.has(v.sectionId),
            ),
            spanOrder: chain.prevSpanOrder,
        });
        const nextOrdered = buildOrderedChainVs({
            vs: params.nextVSet.filter((v) =>
                changedSections.selectedNextSectionIds.has(v.sectionId),
            ),
            spanOrder: chain.nextSpanOrder,
        });
        if (prevOrdered.length === 0 && nextOrdered.length === 0) return;

        const preservedPairs = selectPreservedPairs({
            prev: prevOrdered,
            next: nextOrdered,
        });
        preservedPairs.forEach((pair, pairIndex) => {
            const prevV = prevOrdered[pair.prevIndex]!.v;
            const nextV = nextOrdered[pair.nextIndex]!.v;
            preserved.push({
                preservedId: `K${String(chainIndex).padStart(2, '0')}:${String(pairIndex).padStart(2, '0')}`,
                prevV,
                nextV,
            });
            preservedVIds.add(prevV.id);
            preservedMatchKeys.add(`${prevV.id}->${nextV.id}`);
        });

        for (const interval of buildIntervalPairs({
            chainId: chain.chainId,
            prev: prevOrdered,
            next: nextOrdered,
            preservedPairs,
        })) {
            if (interval.prevVs.length > 0 && interval.nextVs.length > 0) {
                intervalPairs.push(interval);
            } else if (interval.nextVs.length > 0) {
                for (const v of interval.nextVs) {
                    appearing.push({ v, reason: 'new_section' });
                }
            } else if (interval.prevVs.length > 0) {
                for (const v of interval.prevVs) {
                    disappearing.push({ v, reason: 'section_removed' });
                }
            }
        }
    });

    return {
        conquestKey: params.conquestKey,
        prevVSet: [...params.prevVSet],
        nextVSet: [...params.nextVSet],
        changedFronts,
        preserved,
        preservedVIds,
        preservedMatchKeys,
        movers: buildTransitionMovers({
            intervalPairs,
            conquestEvents: params.conquestEvents,
            nextGeometry: params.nextGeometry,
            changedSections,
        }),
        appearing,
        disappearing,
        prevGeometry: params.prevGeometry,
        nextGeometry: params.nextGeometry,
        changedSections,
    };
}

function buildOwnerToClusterFromGeometryOwners(params: {
    prevGeometry: CanonicalGeometrySnapshot;
    nextGeometry: CanonicalGeometrySnapshot;
}): ReadonlyMap<string, number> {
    const ownerIds = [
        ...new Set([
            ...params.prevGeometry.territoryRegions.map((region) => region.ownerId),
            ...params.nextGeometry.territoryRegions.map((region) => region.ownerId),
        ]),
    ].sort((a, b) => a.localeCompare(b));
    return new Map(ownerIds.map((ownerId, index) => [ownerId, index] as const));
}

export function buildPerimeterFieldTransitionTruth(params: {
    conquestKey: string;
    conquestEvents: ReadonlyArray<RenderFamilyTransitionEvent>;
    prevGeometry: CanonicalGeometrySnapshot;
    nextGeometry: CanonicalGeometrySnapshot;
    prevOwnership: OwnershipSnapshot;
    nextOwnership: OwnershipSnapshot;
    spacing: number;
    offsetPx: number;
    strength: number;
}): PerimeterFieldTransitionTruth {
    const ownerToCluster = buildOwnerToClusterFromGeometryOwners({
        prevGeometry: params.prevGeometry,
        nextGeometry: params.nextGeometry,
    });
    const prevVSet = sampleVSetFromGeometry({
        geometry: params.prevGeometry,
        options: {
            spacing: params.spacing,
            offsetPx: params.offsetPx,
            strength: params.strength,
            ownerToCluster,
        },
    });
    const nextVSet = sampleVSetFromGeometry({
        geometry: params.nextGeometry,
        options: {
            spacing: params.spacing,
            offsetPx: params.offsetPx,
            strength: params.strength,
            ownerToCluster,
        },
    });
    const changedFronts = buildChangedFrontSelection({
        prevGeometry: params.prevGeometry,
        nextGeometry: params.nextGeometry,
        conquestEvents: params.conquestEvents,
    });
    return {
        conquestKey: params.conquestKey,
        prevGeometry: params.prevGeometry,
        nextGeometry: params.nextGeometry,
        prevOwnership: params.prevOwnership,
        nextOwnership: params.nextOwnership,
        prevVSet,
        nextVSet,
        changedFronts,
    };
}
