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
    readonly junctions: readonly ConstraintAlignedJunction[];
    readonly appliedMarginPx: number;
}

interface ResolveConstraintAlignedTerritoryGeometryParams {
    readonly geometry: CanonicalGeometrySnapshot;
    readonly stars: ReadonlyArray<StarState>;
    readonly requestedMarginPx: number;
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

export function resolveConstraintAlignedTerritoryGeometry(
    params: ResolveConstraintAlignedTerritoryGeometryParams,
): ConstraintAlignedTerritoryGeometry {
    const appliedMarginPx = resolveAppliedMinStarMarginPx(
        params.stars,
        params.requestedMarginPx,
    );
    const ownerStars = buildOwnerStars(params.stars);
    const endpointOwners = collectEndpointOwners(
        params.geometry.frontierPolylines,
        params.geometry.worldBorderPolylines,
    );
    const { positions: endpointPositions, junctions } = resolveEndpointPositions(
        {
            endpointOwners,
            ownerStars,
            appliedMarginPx,
        },
    );

    const frontierPolylines = params.geometry.frontierPolylines.map((polyline) =>
        alignPolyline({
            polyline,
            kind: 'inter_owner',
            endpointPositions,
            ownerStars,
            appliedMarginPx,
        }),
    );
    const worldBorderPolylines = params.geometry.worldBorderPolylines.map(
        (polyline) =>
            alignPolyline({
                polyline,
                kind: 'world',
                endpointPositions,
                ownerStars,
                appliedMarginPx,
            }),
    );

    return {
        territoryRegions: buildResolvedRegions(
            frontierPolylines,
            worldBorderPolylines,
        ),
        frontierPolylines,
        worldBorderPolylines,
        junctions,
        appliedMarginPx,
    };
}
