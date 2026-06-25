import type { StarState } from '$lib/types/game.types';
import { measurePerf } from '$lib/perf/perfProbe';
import {
    constructFillsFromFrontierChain,
    type SharedPolyline,
} from '../compiler/powerVoronoiTerritoryGeometryGenerator';
import type {
    ResolvedFrontierPolyline,
    ResolvedGeometrySnapshot,
    TerritoryRegionShape,
} from '../contracts/GeometryContracts';
import { resolveAppliedMinStarMarginPx } from './minStarMargin';

export interface ConstraintAlignedFrontierPolyline
    extends ResolvedFrontierPolyline {
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

function cloneConstraintAlignedPolyline(
    polyline: ConstraintAlignedFrontierPolyline,
): ConstraintAlignedFrontierPolyline {
    return {
        ...polyline,
        points: polyline.points.map(([x, y]) => [x, y] as [number, number]),
    };
}

interface ResolveConstraintAlignedTerritoryGeometryParams {
    readonly geometry: ResolvedGeometrySnapshot;
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
    readonly startKey: string;
    readonly endKey: string;
}

interface DisplaySegmentBucket {
    ownerA: string;
    ownerB: string | null;
    hasExtraOwner: boolean;
    readonly start: [number, number];
    readonly end: [number, number];
    readonly startKey: string;
    readonly endKey: string;
}

interface EndpointOwnerBucket {
    ownerA: string | null;
    ownerB: string | null;
    hasExtraOwner: boolean;
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
    polyline: ResolvedFrontierPolyline,
): readonly string[] {
    const owners = [polyline.ownerA, polyline.ownerB].filter(
        (ownerId): ownerId is string => !isWorldOwner(ownerId),
    );
    return owners.length > 0 ? owners : [polyline.ownerA];
}

function collectEndpointOwners(
    frontierPolylines: ReadonlyArray<ResolvedFrontierPolyline>,
    worldBorderPolylines: ReadonlyArray<ResolvedFrontierPolyline>,
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
    polyline: ResolvedFrontierPolyline,
    x: number,
    y: number,
    ownerStars: ReadonlyMap<string, readonly StarState[]>,
    appliedMarginPx: number,
): [number, number] {
    const owners = resolveOwnersForPolyline(polyline);
    return averageOwnerDisplacements(x, y, owners, ownerStars, appliedMarginPx);
}

function alignPolyline(params: {
    polyline: ResolvedFrontierPolyline;
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

function summarizeOwnerRegionCounts(
    regions: ReadonlyArray<TerritoryRegionShape>,
): Map<string, number> {
    const counts = new Map<string, number>();
    for (const region of regions) {
        counts.set(region.ownerId, (counts.get(region.ownerId) ?? 0) + 1);
    }
    return counts;
}

function hasMatchingRegionOwnershipShape(
    candidate: ReadonlyArray<TerritoryRegionShape>,
    baseline: ReadonlyArray<TerritoryRegionShape>,
): boolean {
    if (candidate.length !== baseline.length) return false;
    const candidateCounts = summarizeOwnerRegionCounts(candidate);
    const baselineCounts = summarizeOwnerRegionCounts(baseline);
    if (candidateCounts.size !== baselineCounts.size) return false;
    for (const [ownerId, count] of baselineCounts) {
        if ((candidateCounts.get(ownerId) ?? 0) !== count) return false;
    }
    return true;
}

export function buildDisplayFillRegionsFromConstraintAlignedGeometry(
    geometry: ConstraintAlignedTerritoryGeometry,
): readonly TerritoryRegionShape[] {
    if (
        geometry.displayFrontierPolylines.length === 0 &&
        geometry.displayWorldBorderPolylines.length === 0
    ) {
        return geometry.territoryRegions;
    }

    const reconstructed = constructFillsFromFrontierChain(
        geometry.displayFrontierPolylines.map(toSharedPolyline),
        geometry.displayWorldBorderPolylines.map(toSharedPolyline),
    ).map((territory, index) => ({
        regionId: `display-fill:${territory.ownerId}:${index}`,
        ownerId: territory.ownerId,
        points: territory.points.map(([x, y]) => [x, y] as [number, number]),
        confidence: 1,
    }));

    return hasMatchingRegionOwnershipShape(
        reconstructed,
        geometry.territoryRegions,
    )
        ? reconstructed
        : geometry.territoryRegions;
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

// Perf: directed frontier/ring segments were previously represented as strings
// (`${pointKey(a)}>${pointKey(b)}`), allocating a string per segment, and the
// ring keys were rebuilt for every (region, polyline) pair. Represent each
// segment as a packed numeric id instead: intern points by their quantized
// pointKey (so equality semantics are byte-identical to the old string keys),
// then pack the two interned ids into one number. SEGMENT_ID_STRIDE bounds the
// max unique points per matcher (far above any real ring/polyline vertex count)
// and keeps idA*STRIDE+idB well inside Number.MAX_SAFE_INTEGER.
const SEGMENT_ID_STRIDE = 1 << 21;

function createPointInterner(): (x: number, y: number) => number {
    const ids = new Map<string, number>();
    return (x, y) => {
        const key = pointKey(x, y);
        let id = ids.get(key);
        if (id === undefined) {
            id = ids.size;
            ids.set(key, id);
        }
        return id;
    };
}

function buildDirectedSegmentIds(
    points: ReadonlyArray<[number, number]>,
    closed: boolean,
    internPoint: (x: number, y: number) => number,
): number[] {
    if (points.length < 2) return [];
    const ids: number[] = [];
    const limit = closed ? points.length : points.length - 1;
    for (let index = 0; index < limit; index++) {
        const [ax, ay] = points[index]!;
        const [bx, by] = points[(index + 1) % points.length]!;
        ids.push(internPoint(ax, ay) * SEGMENT_ID_STRIDE + internPoint(bx, by));
    }
    return ids;
}

function buildReversedOpenDirectedSegmentIds(
    points: ReadonlyArray<[number, number]>,
    internPoint: (x: number, y: number) => number,
): number[] {
    if (points.length < 2) return [];
    const ids: number[] = [];
    for (let index = points.length - 1; index > 0; index--) {
        const [ax, ay] = points[index]!;
        const [bx, by] = points[index - 1]!;
        ids.push(internPoint(ax, ay) * SEGMENT_ID_STRIDE + internPoint(bx, by));
    }
    return ids;
}

interface RingSegmentMatcher {
    readonly firstSegments: ReadonlySet<number>;
    matches(
        polylineSegments: readonly number[],
        reversedSegments: readonly number[],
    ): boolean;
}

function createRingSegmentMatcher(
    ringPoints: ReadonlyArray<[number, number]>,
    internPoint: (x: number, y: number) => number,
): RingSegmentMatcher {
    const normalizedRing = normalizeClosedRing(ringPoints);
    const ringSegments = buildDirectedSegmentIds(normalizedRing, true, internPoint);
    const doubledRing =
        ringSegments.length > 0 ? [...ringSegments, ...ringSegments] : [];
    const startsBySegment = new Map<number, number[]>();
    for (let start = 0; start < ringSegments.length; start++) {
        const segment = ringSegments[start]!;
        const starts = startsBySegment.get(segment);
        if (starts) {
            starts.push(start);
        } else {
            startsBySegment.set(segment, [start]);
        }
    }

    const matchesAt = (candidate: readonly number[], start: number): boolean => {
        for (let index = 0; index < candidate.length; index++) {
            if (doubledRing[start + index] !== candidate[index]) return false;
        }
        return true;
    };

    const matchesCandidate = (candidate: readonly number[]): boolean => {
        const firstSegment = candidate[0];
        if (firstSegment === undefined) return false;
        const starts = startsBySegment.get(firstSegment);
        if (!starts) return false;
        for (const start of starts) {
            if (matchesAt(candidate, start)) return true;
        }
        return false;
    };

    return {
        firstSegments: new Set(startsBySegment.keys()),
        matches(polylineSegments, reversedSegments) {
            if (ringSegments.length === 0) return false;
            if (polylineSegments.length === 0) return false;
            if (ringSegments.length < polylineSegments.length) return false;
            return (
                matchesCandidate(polylineSegments) ||
                matchesCandidate(reversedSegments)
            );
        },
    };
}

// Build one region ring's directed-segment sequence once, then test many
// polylines against it without rebuilding the ring. The interner is shared with
// each tested polyline so coincident points map to the same id (a polyline
// point not on the ring simply gets an id that can never match a ring segment).
function createRingContainmentMatcher(
    ringPoints: ReadonlyArray<[number, number]>,
): (polylinePoints: ReadonlyArray<[number, number]>) => boolean {
    const internPoint = createPointInterner();
    const containsSegments = createRingSegmentMatcher(ringPoints, internPoint);
    return (polylinePoints) => {
        const polylineSegments = buildDirectedSegmentIds(
            polylinePoints,
            false,
            internPoint,
        );
        const reversedSegments = buildReversedOpenDirectedSegmentIds(
            polylinePoints,
            internPoint,
        );
        return containsSegments.matches(polylineSegments, reversedSegments);
    };
}

// Exported for parity testing against the prior string-key implementation.
export function ringContainsPolyline(
    ringPoints: ReadonlyArray<[number, number]>,
    polylinePoints: ReadonlyArray<[number, number]>,
): boolean {
    return createRingContainmentMatcher(ringPoints)(polylinePoints);
}

function filterPolylinesByResolvedRegions(params: {
    frontierPolylines: ReadonlyArray<ConstraintAlignedFrontierPolyline>;
    worldBorderPolylines: ReadonlyArray<ConstraintAlignedFrontierPolyline>;
    territoryRegions: ReadonlyArray<TerritoryRegionShape>;
}): {
    readonly frontierPolylines: readonly ConstraintAlignedFrontierPolyline[];
    readonly worldBorderPolylines: readonly ConstraintAlignedFrontierPolyline[];
} {
    // Precompute each region ring's matcher once, then reuse across all polylines
    // (previously every polyline rebuilt every region ring's segment keys).
    const internPoint = createPointInterner();
    const matcherIndex = measurePerf(
        'territory.constraintAlign.filter.buildMatchers',
        () => {
            const byFirstSegment = new Map<number, RingSegmentMatcher[]>();
            const matchers = params.territoryRegions.map((region) =>
                createRingSegmentMatcher(region.points, internPoint),
            );
            for (const matcher of matchers) {
                for (const segment of matcher.firstSegments) {
                    const bucket = byFirstSegment.get(segment);
                    if (bucket) {
                        bucket.push(matcher);
                    } else {
                        byFirstSegment.set(segment, [matcher]);
                    }
                }
            }
            return { byFirstSegment };
        },
        {
            regions: params.territoryRegions.length,
            frontiers: params.frontierPolylines.length,
            world: params.worldBorderPolylines.length,
        },
    );
    const keepPolyline = (
        polyline: ConstraintAlignedFrontierPolyline,
    ): boolean => {
        const polylineSegments = buildDirectedSegmentIds(
            polyline.points,
            false,
            internPoint,
        );
        if (polylineSegments.length === 0) return false;
        const reversedSegments = buildReversedOpenDirectedSegmentIds(
            polyline.points,
            internPoint,
        );
        const candidates = new Set<RingSegmentMatcher>();
        const firstSegment = polylineSegments[0];
        if (firstSegment !== undefined) {
            for (const matcher of matcherIndex.byFirstSegment.get(firstSegment) ?? []) {
                candidates.add(matcher);
            }
        }
        const reversedFirstSegment = reversedSegments[0];
        if (reversedFirstSegment !== undefined) {
            for (const matcher of matcherIndex.byFirstSegment.get(reversedFirstSegment) ?? []) {
                candidates.add(matcher);
            }
        }
        for (const matcher of candidates) {
            if (matcher.matches(polylineSegments, reversedSegments)) return true;
        }
        return false;
    };

    return measurePerf(
        'territory.constraintAlign.filter.apply',
        () => ({
            frontierPolylines: params.frontierPolylines.filter(keepPolyline),
            worldBorderPolylines: params.worldBorderPolylines.filter(keepPolyline),
        }),
        {
            regions: params.territoryRegions.length,
            frontiers: params.frontierPolylines.length,
            world: params.worldBorderPolylines.length,
        },
    );
}

function alignGeometry(params: {
    frontierPolylines: ReadonlyArray<ResolvedFrontierPolyline>;
    worldBorderPolylines: ReadonlyArray<ResolvedFrontierPolyline>;
    ownerStars: ReadonlyMap<string, readonly StarState[]>;
    appliedMarginPx: number;
    includeDisplayGeometry?: boolean;
}): ConstraintAlignedTerritoryGeometry {
    const endpointOwners = measurePerf(
        'territory.constraintAlign.align.collectEndpoints',
        () =>
            collectEndpointOwners(
                params.frontierPolylines,
                params.worldBorderPolylines,
            ),
        {
            frontiers: params.frontierPolylines.length,
            world: params.worldBorderPolylines.length,
        },
    );
    const { positions: endpointPositions, junctions } = measurePerf(
        'territory.constraintAlign.align.resolveEndpoints',
        () =>
            resolveEndpointPositions({
                endpointOwners,
                ownerStars: params.ownerStars,
                appliedMarginPx: params.appliedMarginPx,
            }),
        {
            endpoints: endpointOwners.size,
            appliedMarginPx: params.appliedMarginPx,
        },
    );

    const frontierPolylines = measurePerf(
        'territory.constraintAlign.align.frontiers',
        () =>
            params.frontierPolylines.map((polyline) =>
                alignPolyline({
                    polyline,
                    kind: 'inter_owner',
                    endpointPositions,
                    ownerStars: params.ownerStars,
                    appliedMarginPx: params.appliedMarginPx,
                }),
            ),
        { frontiers: params.frontierPolylines.length },
    );
    const worldBorderPolylines = measurePerf(
        'territory.constraintAlign.align.world',
        () =>
            params.worldBorderPolylines.map((polyline) =>
                alignPolyline({
                    polyline,
                    kind: 'world',
                    endpointPositions,
                    ownerStars: params.ownerStars,
                    appliedMarginPx: params.appliedMarginPx,
                }),
            ),
        { world: params.worldBorderPolylines.length },
    );
    const territoryRegions = measurePerf(
        'territory.constraintAlign.align.resolvedRegions',
        () => buildResolvedRegions(frontierPolylines, worldBorderPolylines),
        {
            frontiers: frontierPolylines.length,
            world: worldBorderPolylines.length,
        },
    );
    const displayGeometry =
        params.includeDisplayGeometry === false
            ? {
                  displayFrontierPolylines: [],
                  displayWorldBorderPolylines: [],
              }
            : buildMeasuredDisplayGeometry(territoryRegions, params.appliedMarginPx);
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

function buildMeasuredDisplayGeometry(
    territoryRegions: ReadonlyArray<TerritoryRegionShape>,
    appliedMarginPx: number,
): {
    readonly displayFrontierPolylines: readonly ConstraintAlignedFrontierPolyline[];
    readonly displayWorldBorderPolylines: readonly ConstraintAlignedFrontierPolyline[];
} {
    return measurePerf(
        'territory.constraintAlign.align.displayGeometry',
        () =>
            buildDisplayGeometryFromResolvedRegions(
                territoryRegions,
                appliedMarginPx,
            ),
        { regions: territoryRegions.length },
    );
}

function withMeasuredDisplayGeometry(
    geometry: ConstraintAlignedTerritoryGeometry,
): ConstraintAlignedTerritoryGeometry {
    const displayGeometry = buildMeasuredDisplayGeometry(
        geometry.territoryRegions,
        geometry.appliedMarginPx,
    );
    return {
        ...geometry,
        displayFrontierPolylines: displayGeometry.displayFrontierPolylines,
        displayWorldBorderPolylines: displayGeometry.displayWorldBorderPolylines,
    };
}

function buildResolvedRegions(
    frontierPolylines: ReadonlyArray<ConstraintAlignedFrontierPolyline>,
    worldBorderPolylines: ReadonlyArray<ConstraintAlignedFrontierPolyline>,
): readonly TerritoryRegionShape[] {
    const fillInput = measurePerf(
        'territory.constraintAlign.resolvedRegions.inputs',
        () => ({
            frontiers: frontierPolylines.map(toSharedPolyline),
            worldBorders: worldBorderPolylines.map(toSharedPolyline),
        }),
        {
            frontiers: frontierPolylines.length,
            world: worldBorderPolylines.length,
        },
    );
    const fills = measurePerf(
        'territory.constraintAlign.resolvedRegions.constructFills',
        () =>
            constructFillsFromFrontierChain(
                fillInput.frontiers,
                fillInput.worldBorders,
            ),
        {
            frontiers: fillInput.frontiers.length,
            world: fillInput.worldBorders.length,
        },
    );
    return measurePerf(
        'territory.constraintAlign.resolvedRegions.adaptFills',
        () =>
            fills.map((territory, index) => ({
                regionId: `constraint:${territory.ownerId}:${index}`,
                ownerId: territory.ownerId,
                points: territory.points.map(([x, y]) => [x, y] as [number, number]),
                confidence: 1,
            })),
        { fills: fills.length },
    );
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

function addDisplaySegmentOwner(
    bucket: DisplaySegmentBucket,
    ownerId: string,
): void {
    if (ownerId === bucket.ownerA || ownerId === bucket.ownerB) return;
    if (bucket.ownerB === null) {
        if (ownerId < bucket.ownerA) {
            bucket.ownerB = bucket.ownerA;
            bucket.ownerA = ownerId;
        } else {
            bucket.ownerB = ownerId;
        }
        return;
    }
    bucket.hasExtraOwner = true;
}

function addOwnerToEndpointBucket(
    bucket: EndpointOwnerBucket,
    ownerId: string,
): void {
    if (ownerId === bucket.ownerA || ownerId === bucket.ownerB) return;
    if (bucket.ownerB === null) {
        bucket.ownerB = ownerId;
        return;
    }
    bucket.hasExtraOwner = true;
}

function addEndpointSegmentOwners(
    ownerBuckets: Map<string, EndpointOwnerBucket>,
    pointKey: string,
    ownerA: string,
    ownerB: string,
): void {
    const hasOwnerA = !isWorldOwner(ownerA);
    const hasOwnerB = !isWorldOwner(ownerB) && ownerB !== ownerA;
    if (!hasOwnerA && !hasOwnerB) return;

    let bucket = ownerBuckets.get(pointKey);
    if (!bucket) {
        bucket = {
            ownerA: hasOwnerA ? ownerA : ownerB,
            ownerB: null,
            hasExtraOwner: false,
        };
        ownerBuckets.set(pointKey, bucket);
        if (hasOwnerA && hasOwnerB) {
            addOwnerToEndpointBucket(bucket, ownerB);
        }
        return;
    }

    if (hasOwnerA) addOwnerToEndpointBucket(bucket, ownerA);
    if (hasOwnerB) addOwnerToEndpointBucket(bucket, ownerB);
}

function endpointOwnerCount(
    ownerBuckets: ReadonlyMap<string, EndpointOwnerBucket>,
    pointKey: string,
): number {
    const bucket = ownerBuckets.get(pointKey);
    if (!bucket) return 0;
    if (bucket.hasExtraOwner) return 3;
    return bucket.ownerB === null ? 1 : 2;
}

function buildDisplayGeometryFromResolvedRegions(
    territoryRegions: ReadonlyArray<TerritoryRegionShape>,
    appliedMarginPx: number,
): {
    readonly displayFrontierPolylines: readonly ConstraintAlignedFrontierPolyline[];
    readonly displayWorldBorderPolylines: readonly ConstraintAlignedFrontierPolyline[];
} {
    const segmentOccurrences = measurePerf(
        'territory.constraintAlign.display.collectSegments',
        () => {
            const collected = new Map<string, DisplaySegmentBucket>();

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
                    const bucket = collected.get(segmentKey);
                    if (bucket) {
                        addDisplaySegmentOwner(bucket, region.ownerId);
                    } else {
                        collected.set(segmentKey, {
                            ownerA: region.ownerId,
                            ownerB: null,
                            hasExtraOwner: false,
                            start: [start[0], start[1]],
                            end: [end[0], end[1]],
                            startKey,
                            endKey,
                        });
                    }
                }
            }
            return collected;
        },
        { regions: territoryRegions.length },
    );

    const { frontierSegments, worldSegments } = measurePerf(
        'territory.constraintAlign.display.classifySegments',
        () => {
            const frontierSegments: DisplayBoundarySegment[] = [];
            const worldSegments: DisplayBoundarySegment[] = [];

            for (const segment of segmentOccurrences.values()) {
                if (segment.ownerB === null) {
                    const ownerA = segment.ownerA;
                    worldSegments.push({
                        ownerA,
                        ownerB: 'world',
                        ownerPairKey: `${ownerA}|world`,
                        kind: 'world',
                        start: segment.start,
                        end: segment.end,
                        startKey: segment.startKey,
                        endKey: segment.endKey,
                    });
                    continue;
                }
                if (segment.hasExtraOwner) continue;
                frontierSegments.push({
                    ownerA: segment.ownerA,
                    ownerB: segment.ownerB,
                    ownerPairKey: `${segment.ownerA}|${segment.ownerB}`,
                    kind: 'inter_owner',
                    start: segment.start,
                    end: segment.end,
                    startKey: segment.startKey,
                    endKey: segment.endKey,
                });
            }
            return { frontierSegments, worldSegments };
        },
        { segments: segmentOccurrences.size },
    );

    return {
        displayFrontierPolylines: measurePerf(
            'territory.constraintAlign.display.frontierPolylines',
            () =>
                buildDisplayPolylinesFromSegments(
                    frontierSegments,
                    appliedMarginPx,
                ),
            { segments: frontierSegments.length },
        ),
        displayWorldBorderPolylines: measurePerf(
            'territory.constraintAlign.display.worldPolylines',
            () =>
                buildDisplayPolylinesFromSegments(
                    worldSegments,
                    appliedMarginPx,
                ),
            { segments: worldSegments.length },
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

    const ownerCountByPoint = new Map<string, EndpointOwnerBucket>();
    for (const segment of segments) {
        addEndpointSegmentOwners(
            ownerCountByPoint,
            segment.startKey,
            segment.ownerA,
            segment.ownerB,
        );
        addEndpointSegmentOwners(
            ownerCountByPoint,
            segment.endKey,
            segment.ownerA,
            segment.ownerB,
        );
    }

    const result: ConstraintAlignedFrontierPolyline[] = [];
    let displayIndex = 0;

    for (const [ownerPairKey, group] of byOwnerPair.entries()) {
        const endpointMap = new Map<string, { segmentIndex: number; at: 'start' | 'end' }[]>();
        for (let index = 0; index < group.length; index++) {
            const segment = group[index]!;
            const startEntries = endpointMap.get(segment.startKey);
            if (startEntries) {
                startEntries.push({ segmentIndex: index, at: 'start' });
            } else {
                endpointMap.set(segment.startKey, [
                    { segmentIndex: index, at: 'start' },
                ]);
            }
            const endEntries = endpointMap.get(segment.endKey);
            if (endEntries) {
                endEntries.push({ segmentIndex: index, at: 'end' });
            } else {
                endpointMap.set(segment.endKey, [
                    { segmentIndex: index, at: 'end' },
                ]);
            }
        }

        const used = new Uint8Array(group.length);
        const startCandidates = group
            .map((segment, index) => {
                const startDegree = endpointMap.get(segment.startKey)?.length ?? 0;
                const endDegree = endpointMap.get(segment.endKey)?.length ?? 0;
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

        const directionForSegment = (
            segment: DisplayBoundarySegment,
            startAt: 'start' | 'end',
        ): number => {
            const start = startAt === 'start' ? segment.start : segment.end;
            const end = startAt === 'start' ? segment.end : segment.start;
            return Math.atan2(end[1] - start[1], end[0] - start[0]);
        };

        const pickNextRef = (
            currentEndKey: string,
            currentDirection: number,
        ): { segmentIndex: number; at: 'start' | 'end' } | null => {
            const candidates = endpointMap.get(currentEndKey);
            if (!candidates) return null;
            let best: { segmentIndex: number; at: 'start' | 'end' } | null = null;
            let bestDelta = Infinity;
            for (const candidate of candidates) {
                if (used[candidate.segmentIndex] === 1) continue;
                const segment = group[candidate.segmentIndex]!;
                const nextDirection = directionForSegment(segment, candidate.at);
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
        ): {
            points: [number, number][];
            closed: boolean;
            startKey: string;
            endKey: string;
        } => {
            const first = group[startIndex]!;
            const points = [...orientSegment(first, startAt)];
            used[startIndex] = 1;
            let currentDirection = directionForSegment(first, startAt);
            let currentEndKey =
                startAt === 'start' ? first.endKey : first.startKey;
            const startKey =
                startAt === 'start' ? first.startKey : first.endKey;
            let closed = false;
            let safety = group.length * 4;
            while (safety-- > 0) {
                const nextRef = pickNextRef(currentEndKey, currentDirection);
                if (!nextRef) break;
                const next = group[nextRef.segmentIndex]!;
                const oriented = orientSegment(next, nextRef.at);
                used[nextRef.segmentIndex] = 1;
                points.push(oriented[1]);
                currentDirection = directionForSegment(next, nextRef.at);
                currentEndKey =
                    nextRef.at === 'start' ? next.endKey : next.startKey;
                if (currentEndKey === startKey) {
                    points.pop();
                    closed = true;
                    break;
                }
            }
            return { points, closed, startKey, endKey: currentEndKey };
        };

        for (const candidate of startCandidates) {
            if (used[candidate.index] === 1) continue;
            const chain = buildChainFrom(candidate.index, candidate.endpoint);
            const length = polylineLength(chain.points);
            const startOwnerCount = endpointOwnerCount(
                ownerCountByPoint,
                chain.startKey,
            );
            const endOwnerCount = endpointOwnerCount(
                ownerCountByPoint,
                chain.endKey,
            );
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
    const appliedMarginPx = measurePerf(
        'territory.constraintAlign.appliedMargin',
        () => resolveAppliedMinStarMarginPx(params.stars, params.requestedMarginPx),
        {
            stars: params.stars.length,
            requestedMarginPx: params.requestedMarginPx,
        },
    );
    if (
        params.geometry.territoryRegions.length > 0 &&
        !params.preferSharedBoundaryResolution
    ) {
        const territoryRegions = measurePerf(
            'territory.constraintAlign.regions.clone',
            () => cloneTerritoryRegions(params.geometry.territoryRegions),
            { regions: params.geometry.territoryRegions.length },
        );
        const displayGeometry = measurePerf(
            'territory.constraintAlign.regions.displayGeometry',
            () =>
                buildDisplayGeometryFromResolvedRegions(
                    territoryRegions,
                    appliedMarginPx,
                ),
            { regions: territoryRegions.length },
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
    const ownerStars = measurePerf(
        'territory.constraintAlign.ownerStars',
        () => buildOwnerStars(params.stars),
        { stars: params.stars.length },
    );
    const provisional = measurePerf(
        'territory.constraintAlign.provisionalAlign',
        () =>
            alignGeometry({
                frontierPolylines: params.geometry.frontierPolylines,
                worldBorderPolylines: params.geometry.worldBorderPolylines,
                ownerStars,
                appliedMarginPx,
                includeDisplayGeometry: false,
            }),
        {
            frontiers: params.geometry.frontierPolylines.length,
            world: params.geometry.worldBorderPolylines.length,
        },
    );
    const filtered = measurePerf(
        'territory.constraintAlign.filter',
        () =>
            filterPolylinesByResolvedRegions({
                frontierPolylines: provisional.frontierPolylines,
                worldBorderPolylines: provisional.worldBorderPolylines,
                territoryRegions: provisional.territoryRegions,
            }),
        {
            regions: provisional.territoryRegions.length,
            frontiers: provisional.frontierPolylines.length,
            world: provisional.worldBorderPolylines.length,
        },
    );
    const filteredCount =
        filtered.frontierPolylines.length + filtered.worldBorderPolylines.length;
    const provisionalCount =
        provisional.frontierPolylines.length + provisional.worldBorderPolylines.length;
    if (filteredCount === 0 || filteredCount === provisionalCount) {
        return withMeasuredDisplayGeometry(provisional);
    }

    const keptFrontierIds = new Set(
        filtered.frontierPolylines.map((polyline) => polyline.frontierId),
    );
    const keptWorldIds = new Set(
        filtered.worldBorderPolylines.map((polyline) => polyline.frontierId),
    );
    return measurePerf(
        'territory.constraintAlign.filteredRealign',
        () =>
            alignGeometry({
                frontierPolylines: params.geometry.frontierPolylines.filter(
                    (polyline) => keptFrontierIds.has(polyline.frontierId),
                ),
                worldBorderPolylines: params.geometry.worldBorderPolylines.filter(
                    (polyline) => keptWorldIds.has(polyline.frontierId),
                ),
                ownerStars,
                appliedMarginPx,
            }),
        {
            keptFrontiers: keptFrontierIds.size,
            keptWorld: keptWorldIds.size,
        },
    );
}

export function readConstraintAlignedTerritoryGeometryFromSnapshot(
    geometry: ResolvedGeometrySnapshot,
): ConstraintAlignedTerritoryGeometry | null {
    const ladder = geometry.diagnostics.stageLadder;
    if (!ladder) return null;
    return {
        territoryRegions: ladder.resolvedRegions.map((region) => ({
            ...region,
            points: region.points.map(([x, y]) => [x, y] as [number, number]),
        })),
        frontierPolylines: ladder.resolvedSharedBoundaryFrontiers.map((polyline) =>
            cloneConstraintAlignedPolyline({
                ...polyline,
                kind: 'inter_owner',
            }),
        ),
        worldBorderPolylines: ladder.resolvedWorldBorders.map((polyline) =>
            cloneConstraintAlignedPolyline({
                ...polyline,
                kind: 'world',
            }),
        ),
        displayFrontierPolylines: ladder.displayFrontierPolylines.map((polyline) =>
            cloneConstraintAlignedPolyline({
                ...polyline,
                kind: 'inter_owner',
            }),
        ),
        displayWorldBorderPolylines: ladder.displayWorldBorderPolylines.map(
            (polyline) =>
                cloneConstraintAlignedPolyline({
                    ...polyline,
                    kind: 'world',
                }),
        ),
        junctions: [],
        appliedMarginPx: ladder.appliedMarginPx,
    };
}
