import type { StarState } from '$lib/types/game.types';
import {
    constructFillsFromFrontierChain,
    type SharedPolyline,
} from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import type {
    CanonicalFrontierPolyline,
    CanonicalGeometrySnapshot,
    TerritoryRegionShape,
} from '../contracts/GeometryContracts';
import { resolveAppliedMinStarMarginPx } from './minStarMargin';

export interface ConstraintAlignedFrontierPolyline
    extends CanonicalFrontierPolyline {
    readonly kind: 'inter_owner' | 'world';
}

export interface ConstraintAlignedJunction {
    readonly point: [number, number];
    readonly ownerIds: readonly string[];
}

export interface ConstraintAlignedTerritoryGeometry {
    readonly territoryRegions: readonly TerritoryRegionShape[];
    readonly frontierPolylines: readonly ConstraintAlignedFrontierPolyline[];
    readonly worldBorderPolylines: readonly ConstraintAlignedFrontierPolyline[];
    readonly displayFrontierPolylines: readonly ConstraintAlignedFrontierPolyline[];
    readonly displayWorldBorderPolylines: readonly ConstraintAlignedFrontierPolyline[];
    readonly junctions: readonly ConstraintAlignedJunction[];
    readonly appliedMarginPx: number;
}

interface ResolveConstraintAlignedTerritoryGeometryParams {
    readonly geometry: CanonicalGeometrySnapshot;
    readonly stars: ReadonlyArray<StarState>;
    readonly requestedMarginPx: number;
    readonly preferSharedBoundaryResolution?: boolean;
}

interface DisplayBoundarySegment {
    readonly ownerA: string;
    readonly ownerB: string;
    readonly ownerPairKey: string;
    readonly kind: ConstraintAlignedFrontierPolyline['kind'];
    readonly start: [number, number];
    readonly end: [number, number];
}

interface EndpointOwners {
    x: number;
    y: number;
    ownerIds: Set<string>;
}

const WORLD_OWNER_IDS = new Set(['world', '__world__']);

function buildOwnerStars(
    stars: ReadonlyArray<StarState>,
): ReadonlyMap<string, readonly StarState[]> {
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
    return byOwner;
}

function pointKey(x: number, y: number): string {
    return `${x.toFixed(4)},${y.toFixed(4)}`;
}

function isWorldOwner(ownerId: string | undefined): boolean {
    return ownerId == null || WORLD_OWNER_IDS.has(ownerId);
}

function displacePointFromOwnerStars(
    x: number,
    y: number,
    stars: readonly StarState[] | undefined,
    appliedMarginPx: number,
): [number, number] {
    if (!stars || stars.length === 0 || appliedMarginPx <= 0) {
        return [x, y];
    }

    let nearestStar: StarState | null = null;
    let nearestDistance = Infinity;
    for (const star of stars) {
        const dx = x - star.x;
        const dy = y - star.y;
        const distance = Math.hypot(dx, dy);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestStar = star;
        }
    }

    if (
        !nearestStar ||
        nearestDistance >= appliedMarginPx ||
        nearestDistance <= 0.001
    ) {
        return [x, y];
    }

    const dx = x - nearestStar.x;
    const dy = y - nearestStar.y;
    const scale = appliedMarginPx / nearestDistance;
    return [
        nearestStar.x + dx * scale,
        nearestStar.y + dy * scale,
    ];
}

function resolveOwnersForPolyline(
    polyline: CanonicalFrontierPolyline,
): readonly string[] {
    const owners = [polyline.ownerA, polyline.ownerB].filter(
        (ownerId): ownerId is string => !isWorldOwner(ownerId),
    );
    return owners.length > 0 ? owners : [polyline.ownerA];
}

function collectEndpointOwners(
    frontierPolylines: ReadonlyArray<CanonicalFrontierPolyline>,
    worldBorderPolylines: ReadonlyArray<CanonicalFrontierPolyline>,
): ReadonlyMap<string, EndpointOwners> {
    const endpointOwners = new Map<string, EndpointOwners>();
    const allPolylines = [...frontierPolylines, ...worldBorderPolylines];
    for (const polyline of allPolylines) {
        if (polyline.points.length === 0) continue;
        const owners = resolveOwnersForPolyline(polyline);
        const endpoints = [polyline.points[0], polyline.points[polyline.points.length - 1]];
        for (const [x, y] of endpoints) {
            const key = pointKey(x, y);
            let entry = endpointOwners.get(key);
            if (!entry) {
                entry = { x, y, ownerIds: new Set<string>() };
                endpointOwners.set(key, entry);
            }
            for (const ownerId of owners) {
                entry.ownerIds.add(ownerId);
            }
        }
    }
    return endpointOwners;
}

function averageOwnerDisplacements(
    x: number,
    y: number,
    ownerIds: readonly string[],
    ownerStars: ReadonlyMap<string, readonly StarState[]>,
    appliedMarginPx: number,
): [number, number] {
    if (ownerIds.length === 0) return [x, y];
    let sumX = 0;
    let sumY = 0;
    for (const ownerId of ownerIds) {
        const [dx, dy] = displacePointFromOwnerStars(
            x,
            y,
            ownerStars.get(ownerId),
            appliedMarginPx,
        );
        sumX += dx;
        sumY += dy;
    }
    return [sumX / ownerIds.length, sumY / ownerIds.length];
}

function resolveEndpointPositions(params: {
    endpointOwners: ReadonlyMap<string, EndpointOwners>;
    ownerStars: ReadonlyMap<string, readonly StarState[]>;
    appliedMarginPx: number;
}): {
    readonly positions: ReadonlyMap<string, [number, number]>;
    readonly junctions: readonly ConstraintAlignedJunction[];
} {
    const positions = new Map<string, [number, number]>();
    const junctions: ConstraintAlignedJunction[] = [];
    for (const [key, endpoint] of params.endpointOwners.entries()) {
        const ownerIds = [...endpoint.ownerIds].sort();
        const point = averageOwnerDisplacements(
            endpoint.x,
            endpoint.y,
            ownerIds,
            params.ownerStars,
            params.appliedMarginPx,
        );
        positions.set(key, point);
        junctions.push({
            point,
            ownerIds,
        });
    }
    return { positions, junctions };
}

function resolveInteriorPoint(
    polyline: CanonicalFrontierPolyline,
    x: number,
    y: number,
    ownerStars: ReadonlyMap<string, readonly StarState[]>,
    appliedMarginPx: number,
): [number, number] {
    const owners = resolveOwnersForPolyline(polyline);
    return averageOwnerDisplacements(x, y, owners, ownerStars, appliedMarginPx);
}

function alignPolyline(params: {
    polyline: CanonicalFrontierPolyline;
    kind: ConstraintAlignedFrontierPolyline['kind'];
    endpointPositions: ReadonlyMap<string, [number, number]>;
    ownerStars: ReadonlyMap<string, readonly StarState[]>;
    appliedMarginPx: number;
}): ConstraintAlignedFrontierPolyline {
    const { polyline, kind, endpointPositions, ownerStars, appliedMarginPx } =
        params;
    const lastIndex = polyline.points.length - 1;
    const points = polyline.points.map(([x, y], index) => {
        if (index === 0 || index === lastIndex) {
            const resolved =
                endpointPositions.get(pointKey(x, y)) ?? null;
            if (resolved) return resolved;
        }
        return resolveInteriorPoint(
            polyline,
            x,
            y,
            ownerStars,
            appliedMarginPx,
        );
    });
    return {
        ...polyline,
        points,
        kind,
    };
}

function toSharedPolyline(
    polyline: ConstraintAlignedFrontierPolyline,
): SharedPolyline {
    return {
        ownerPairKey: polyline.ownerPairKey,
        color: 0,
        points: polyline.points.map(([x, y]) => [x, y] as [number, number]),
    };
}

function normalizeClosedRing(
    points: ReadonlyArray<[number, number]>,
): readonly [number, number][] {
    if (points.length < 2) return points;
    const first = points[0];
    const last = points[points.length - 1];
    if (first[0] === last[0] && first[1] === last[1]) {
        return points.slice(0, -1);
    }
    return points;
}

function cloneTerritoryRegions(
    territoryRegions: ReadonlyArray<TerritoryRegionShape>,
): readonly TerritoryRegionShape[] {
    return territoryRegions.map((region) => ({
        ...region,
        points: region.points.map(([x, y]) => [x, y] as [number, number]),
    }));
}

function buildDirectedSegmentKeys(
    points: ReadonlyArray<[number, number]>,
    closed: boolean,
): readonly string[] {
    if (points.length < 2) return [];
    const keys: string[] = [];
    const limit = closed ? points.length : points.length - 1;
    for (let index = 0; index < limit; index++) {
        const [ax, ay] = points[index]!;
        const [bx, by] = points[(index + 1) % points.length]!;
        keys.push(`${pointKey(ax, ay)}>${pointKey(bx, by)}`);
    }
    return keys;
}

function ringContainsPolyline(
    ringPoints: ReadonlyArray<[number, number]>,
    polylinePoints: ReadonlyArray<[number, number]>,
): boolean {
    const normalizedRing = normalizeClosedRing(ringPoints);
    const ringSegments = buildDirectedSegmentKeys(normalizedRing, true);
    const polylineSegments = buildDirectedSegmentKeys(polylinePoints, false);
    if (ringSegments.length === 0 || polylineSegments.length === 0) return false;
    if (ringSegments.length < polylineSegments.length) return false;

    const doubledRing = [...ringSegments, ...ringSegments];
    const reversedSegments = buildDirectedSegmentKeys(
        [...polylinePoints].reverse(),
        false,
    );
    const matchesAt = (candidate: readonly string[], start: number): boolean => {
        for (let index = 0; index < candidate.length; index++) {
            if (doubledRing[start + index] !== candidate[index]) return false;
        }
        return true;
    };

    for (let start = 0; start < ringSegments.length; start++) {
        if (matchesAt(polylineSegments, start)) return true;
        if (matchesAt(reversedSegments, start)) return true;
    }
    return false;
}

function filterPolylinesByResolvedRegions(params: {
    frontierPolylines: ReadonlyArray<ConstraintAlignedFrontierPolyline>;
    worldBorderPolylines: ReadonlyArray<ConstraintAlignedFrontierPolyline>;
    territoryRegions: ReadonlyArray<TerritoryRegionShape>;
}): {
    readonly frontierPolylines: readonly ConstraintAlignedFrontierPolyline[];
    readonly worldBorderPolylines: readonly ConstraintAlignedFrontierPolyline[];
} {
    const keepPolyline = (
        polyline: ConstraintAlignedFrontierPolyline,
    ): boolean =>
        params.territoryRegions.some((region) =>
            ringContainsPolyline(region.points, polyline.points),
        );

    return {
        frontierPolylines: params.frontierPolylines.filter(keepPolyline),
        worldBorderPolylines: params.worldBorderPolylines.filter(keepPolyline),
    };
}

function alignGeometry(params: {
    frontierPolylines: ReadonlyArray<CanonicalFrontierPolyline>;
    worldBorderPolylines: ReadonlyArray<CanonicalFrontierPolyline>;
    ownerStars: ReadonlyMap<string, readonly StarState[]>;
    appliedMarginPx: number;
}): ConstraintAlignedTerritoryGeometry {
    const endpointOwners = collectEndpointOwners(
        params.frontierPolylines,
        params.worldBorderPolylines,
    );
    const { positions: endpointPositions, junctions } = resolveEndpointPositions(
        {
            endpointOwners,
            ownerStars: params.ownerStars,
            appliedMarginPx: params.appliedMarginPx,
        },
    );

    const frontierPolylines = params.frontierPolylines.map((polyline) =>
        alignPolyline({
            polyline,
            kind: 'inter_owner',
            endpointPositions,
            ownerStars: params.ownerStars,
            appliedMarginPx: params.appliedMarginPx,
        }),
    );
    const worldBorderPolylines = params.worldBorderPolylines.map((polyline) =>
        alignPolyline({
            polyline,
            kind: 'world',
            endpointPositions,
            ownerStars: params.ownerStars,
            appliedMarginPx: params.appliedMarginPx,
        }),
    );
    const territoryRegions = buildResolvedRegions(frontierPolylines, worldBorderPolylines);
    const displayGeometry = buildDisplayGeometryFromResolvedRegions(
        territoryRegions,
        params.appliedMarginPx,
    );
    return {
        territoryRegions,
        frontierPolylines,
        worldBorderPolylines,
        displayFrontierPolylines: displayGeometry.displayFrontierPolylines,
        displayWorldBorderPolylines: displayGeometry.displayWorldBorderPolylines,
        junctions,
        appliedMarginPx: params.appliedMarginPx,
    };
}

function buildResolvedRegions(
    frontierPolylines: ReadonlyArray<ConstraintAlignedFrontierPolyline>,
    worldBorderPolylines: ReadonlyArray<ConstraintAlignedFrontierPolyline>,
): readonly TerritoryRegionShape[] {
    const fills = constructFillsFromFrontierChain(
        frontierPolylines.map(toSharedPolyline),
        worldBorderPolylines.map(toSharedPolyline),
    );
    return fills.map((territory, index) => ({
        regionId: `constraint:${territory.ownerId}:${index}`,
        ownerId: territory.ownerId,
        points: territory.points.map(([x, y]) => [x, y] as [number, number]),
        confidence: 1,
    }));
}

function polylineLength(points: ReadonlyArray<[number, number]>): number {
    let total = 0;
    for (let index = 1; index < points.length; index++) {
        const [ax, ay] = points[index - 1]!;
        const [bx, by] = points[index]!;
        total += Math.hypot(bx - ax, by - ay);
    }
    return total;
}

function directionAtStart(points: ReadonlyArray<[number, number]>): number {
    if (points.length < 2) return 0;
    const [ax, ay] = points[0]!;
    const [bx, by] = points[1]!;
    return Math.atan2(by - ay, bx - ax);
}

function directionAtEnd(points: ReadonlyArray<[number, number]>): number {
    if (points.length < 2) return 0;
    const [ax, ay] = points[points.length - 2]!;
    const [bx, by] = points[points.length - 1]!;
    return Math.atan2(by - ay, bx - ax);
}

function normalizeAngleDelta(a: number, b: number): number {
    let delta = Math.abs(a - b);
    while (delta > Math.PI) delta = Math.abs(delta - Math.PI * 2);
    return delta;
}

function createDisplayPolyline(params: {
    ownerA: string;
    ownerB: string;
    ownerPairKey: string;
    points: [number, number][];
    kind: ConstraintAlignedFrontierPolyline['kind'];
    index: number;
    closed?: boolean;
}): ConstraintAlignedFrontierPolyline {
    return {
        frontierId: `display:${params.ownerPairKey}:${params.index}`,
        ownerA: params.ownerA,
        ownerB: params.ownerB,
        ownerPairKey: params.ownerPairKey,
        points: params.points,
        confidence: 1,
        kind: params.kind,
        closed: params.closed,
    };
}

function buildDisplayGeometryFromResolvedRegions(
    territoryRegions: ReadonlyArray<TerritoryRegionShape>,
    appliedMarginPx: number,
): {
    readonly displayFrontierPolylines: readonly ConstraintAlignedFrontierPolyline[];
    readonly displayWorldBorderPolylines: readonly ConstraintAlignedFrontierPolyline[];
} {
    const segmentOccurrences = new Map<
        string,
        {
            ownerId: string;
            start: [number, number];
            end: [number, number];
        }[]
    >();

    for (const region of territoryRegions) {
        const points = normalizeClosedRing(region.points);
        if (points.length < 2) continue;
        for (let index = 0; index < points.length; index++) {
            const start = points[index]!;
            const end = points[(index + 1) % points.length]!;
            const startKey = pointKey(start[0], start[1]);
            const endKey = pointKey(end[0], end[1]);
            if (startKey === endKey) continue;
            const segmentKey =
                startKey < endKey
                    ? `${startKey}|${endKey}`
                    : `${endKey}|${startKey}`;
            const bucket = segmentOccurrences.get(segmentKey);
            const occurrence = {
                ownerId: region.ownerId,
                start: [start[0], start[1]] as [number, number],
                end: [end[0], end[1]] as [number, number],
            };
            if (bucket) {
                bucket.push(occurrence);
            } else {
                segmentOccurrences.set(segmentKey, [occurrence]);
            }
        }
    }

    const frontierSegments: DisplayBoundarySegment[] = [];
    const worldSegments: DisplayBoundarySegment[] = [];

    for (const occurrences of segmentOccurrences.values()) {
        const uniqueOwners = [...new Set(occurrences.map((entry) => entry.ownerId))].sort();
        const first = occurrences[0];
        if (!first) continue;
        if (uniqueOwners.length === 1) {
            const ownerA = uniqueOwners[0]!;
            worldSegments.push({
                ownerA,
                ownerB: 'world',
                ownerPairKey: `${ownerA}|world`,
                kind: 'world',
                start: first.start,
                end: first.end,
            });
            continue;
        }
        if (uniqueOwners.length !== 2) continue;
        const [ownerA, ownerB] = uniqueOwners;
        frontierSegments.push({
            ownerA: ownerA!,
            ownerB: ownerB!,
            ownerPairKey: `${ownerA}|${ownerB}`,
            kind: 'inter_owner',
            start: first.start,
            end: first.end,
        });
    }

    return {
        displayFrontierPolylines: buildDisplayPolylinesFromSegments(
            frontierSegments,
            appliedMarginPx,
        ),
        displayWorldBorderPolylines: buildDisplayPolylinesFromSegments(
            worldSegments,
            appliedMarginPx,
        ),
    };
}

function buildDisplayPolylinesFromSegments(
    segments: ReadonlyArray<DisplayBoundarySegment>,
    appliedMarginPx: number,
): readonly ConstraintAlignedFrontierPolyline[] {
    if (segments.length === 0) return [];

    const minDisplayLengthPx = Math.max(12, appliedMarginPx * 0.5);
    const byOwnerPair = new Map<string, DisplayBoundarySegment[]>();
    for (const segment of segments) {
        const bucket = byOwnerPair.get(segment.ownerPairKey);
        if (bucket) {
            bucket.push(segment);
        } else {
            byOwnerPair.set(segment.ownerPairKey, [segment]);
        }
    }

    const ownerCountByPoint = new Map<string, Set<string>>();
    for (const segment of segments) {
        const startKey = pointKey(segment.start[0], segment.start[1]);
        const endKey = pointKey(segment.end[0], segment.end[1]);
        const owners = [segment.ownerA, segment.ownerB].filter(
            (ownerId) => !isWorldOwner(ownerId),
        );
        const startOwners = ownerCountByPoint.get(startKey) ?? new Set<string>();
        const endOwners = ownerCountByPoint.get(endKey) ?? new Set<string>();
        for (const ownerId of owners) {
            startOwners.add(ownerId);
            endOwners.add(ownerId);
        }
        ownerCountByPoint.set(startKey, startOwners);
        ownerCountByPoint.set(endKey, endOwners);
    }

    const result: ConstraintAlignedFrontierPolyline[] = [];
    let displayIndex = 0;

    for (const [ownerPairKey, group] of byOwnerPair.entries()) {
        const endpointMap = new Map<string, { segmentIndex: number; at: 'start' | 'end' }[]>();
        for (let index = 0; index < group.length; index++) {
            const segment = group[index]!;
            const startKey = pointKey(segment.start[0], segment.start[1]);
            const endKey = pointKey(segment.end[0], segment.end[1]);
            const startEntries = endpointMap.get(startKey);
            if (startEntries) {
                startEntries.push({ segmentIndex: index, at: 'start' });
            } else {
                endpointMap.set(startKey, [{ segmentIndex: index, at: 'start' }]);
            }
            const endEntries = endpointMap.get(endKey);
            if (endEntries) {
                endEntries.push({ segmentIndex: index, at: 'end' });
            } else {
                endpointMap.set(endKey, [{ segmentIndex: index, at: 'end' }]);
            }
        }

        const used = new Set<number>();
        const startCandidates = group
            .map((segment, index) => {
                const startKey = pointKey(segment.start[0], segment.start[1]);
                const endKey = pointKey(segment.end[0], segment.end[1]);
                const startDegree = endpointMap.get(startKey)?.length ?? 0;
                const endDegree = endpointMap.get(endKey)?.length ?? 0;
                return {
                    index,
                    endpoint:
                        startDegree !== 2
                            ? 'start'
                            : endDegree !== 2
                              ? 'end'
                              : startDegree <= endDegree
                                ? 'start'
                                : 'end',
                    rank: Math.min(startDegree, endDegree),
                } as const;
            })
            .sort((a, b) => a.rank - b.rank || a.index - b.index);

        const orientSegment = (
            segment: DisplayBoundarySegment,
            startAt: 'start' | 'end',
        ): [[number, number], [number, number]] =>
            startAt === 'start'
                ? [
                      [segment.start[0], segment.start[1]],
                      [segment.end[0], segment.end[1]],
                  ]
                : [
                      [segment.end[0], segment.end[1]],
                      [segment.start[0], segment.start[1]],
                  ];

        const pickNextRef = (
            currentEndKey: string,
            currentDirection: number,
        ): { segmentIndex: number; at: 'start' | 'end' } | null => {
            const candidates =
                endpointMap.get(currentEndKey)?.filter(
                    (candidate) => !used.has(candidate.segmentIndex),
                ) ?? [];
            if (candidates.length === 0) return null;
            let best: { segmentIndex: number; at: 'start' | 'end' } | null = null;
            let bestDelta = Infinity;
            for (const candidate of candidates) {
                const segment = group[candidate.segmentIndex]!;
                const oriented = orientSegment(segment, candidate.at);
                const nextDirection = directionAtStart(oriented);
                const delta = normalizeAngleDelta(currentDirection, nextDirection);
                if (delta < bestDelta) {
                    best = candidate;
                    bestDelta = delta;
                }
            }
            return best;
        };

        const buildChainFrom = (
            startIndex: number,
            startAt: 'start' | 'end',
        ): { points: [number, number][]; closed: boolean } => {
            const first = group[startIndex]!;
            const points = [...orientSegment(first, startAt)];
            used.add(startIndex);
            let currentDirection = directionAtEnd(points);
            let currentEndKey = pointKey(
                points[points.length - 1]![0],
                points[points.length - 1]![1],
            );
            const startKey = pointKey(points[0]![0], points[0]![1]);
            let closed = false;
            let safety = group.length * 4;
            while (safety-- > 0) {
                const nextRef = pickNextRef(currentEndKey, currentDirection);
                if (!nextRef) break;
                const next = group[nextRef.segmentIndex]!;
                const oriented = orientSegment(next, nextRef.at);
                used.add(nextRef.segmentIndex);
                points.push(oriented[1]);
                currentDirection = directionAtEnd(oriented);
                currentEndKey = pointKey(
                    points[points.length - 1]![0],
                    points[points.length - 1]![1],
                );
                if (currentEndKey === startKey) {
                    points.pop();
                    closed = true;
                    break;
                }
            }
            return { points, closed };
        };

        for (const candidate of startCandidates) {
            if (used.has(candidate.index)) continue;
            const chain = buildChainFrom(candidate.index, candidate.endpoint);
            const length = polylineLength(chain.points);
            const startKey = pointKey(chain.points[0]![0], chain.points[0]![1]);
            const endKey = pointKey(
                chain.points[chain.points.length - 1]![0],
                chain.points[chain.points.length - 1]![1],
            );
            const startOwnerCount = ownerCountByPoint.get(startKey)?.size ?? 0;
            const endOwnerCount = ownerCountByPoint.get(endKey)?.size ?? 0;
            const looksLikeJunctionSpur =
                group[0]?.kind === 'inter_owner' &&
                length < minDisplayLengthPx &&
                (startOwnerCount >= 3 || endOwnerCount >= 3) &&
                !chain.closed;
            if (looksLikeJunctionSpur) continue;

            const [ownerA, ownerB] = ownerPairKey.split('|');
            result.push(
                createDisplayPolyline({
                    ownerA,
                    ownerB: ownerB ?? 'world',
                    ownerPairKey,
                    points: chain.points,
                    kind: group[0]?.kind ?? 'inter_owner',
                    index: displayIndex++,
                    closed: chain.closed,
                }),
            );
        }
    }

    return result;
}

export function resolveConstraintAlignedTerritoryGeometry(
    params: ResolveConstraintAlignedTerritoryGeometryParams,
): ConstraintAlignedTerritoryGeometry {
    const appliedMarginPx = resolveAppliedMinStarMarginPx(
        params.stars,
        params.requestedMarginPx,
    );
    if (
        params.geometry.territoryRegions.length > 0 &&
        !params.preferSharedBoundaryResolution
    ) {
        const territoryRegions = cloneTerritoryRegions(
            params.geometry.territoryRegions,
        );
        const displayGeometry = buildDisplayGeometryFromResolvedRegions(
            territoryRegions,
            appliedMarginPx,
        );
        return {
            territoryRegions,
            frontierPolylines: params.geometry.frontierPolylines.map(
                (polyline) => ({
                    ...polyline,
                    kind: 'inter_owner' as const,
                }),
            ),
            worldBorderPolylines: params.geometry.worldBorderPolylines.map(
                (polyline) => ({
                    ...polyline,
                    kind: 'world' as const,
                }),
            ),
            displayFrontierPolylines: displayGeometry.displayFrontierPolylines,
            displayWorldBorderPolylines:
                displayGeometry.displayWorldBorderPolylines,
            junctions: [],
            appliedMarginPx,
        };
    }
    const ownerStars = buildOwnerStars(params.stars);
    const provisional = alignGeometry({
        frontierPolylines: params.geometry.frontierPolylines,
        worldBorderPolylines: params.geometry.worldBorderPolylines,
        ownerStars,
        appliedMarginPx,
    });
    const filtered = filterPolylinesByResolvedRegions({
        frontierPolylines: provisional.frontierPolylines,
        worldBorderPolylines: provisional.worldBorderPolylines,
        territoryRegions: provisional.territoryRegions,
    });
    const filteredCount =
        filtered.frontierPolylines.length + filtered.worldBorderPolylines.length;
    const provisionalCount =
        provisional.frontierPolylines.length + provisional.worldBorderPolylines.length;
    if (filteredCount === 0 || filteredCount === provisionalCount) {
        return provisional;
    }

    const keptFrontierIds = new Set(
        filtered.frontierPolylines.map((polyline) => polyline.frontierId),
    );
    const keptWorldIds = new Set(
        filtered.worldBorderPolylines.map((polyline) => polyline.frontierId),
    );
    return alignGeometry({
        frontierPolylines: params.geometry.frontierPolylines.filter((polyline) =>
            keptFrontierIds.has(polyline.frontierId),
        ),
        worldBorderPolylines: params.geometry.worldBorderPolylines.filter(
            (polyline) => keptWorldIds.has(polyline.frontierId),
        ),
        ownerStars,
        appliedMarginPx,
    });
}
