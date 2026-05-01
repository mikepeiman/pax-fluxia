import type { StarState } from '$lib/types/game.types';
import type {
    CanonicalFrontierPolyline,
    CanonicalGeometrySnapshot,
} from '../contracts/GeometryContracts';
import { resolveAppliedMinStarMarginPx } from './minStarMargin';

export interface ConstraintAlignedFrontierPolyline
    extends CanonicalFrontierPolyline {
    readonly kind: 'inter_owner' | 'world';
}

interface ResolveConstraintAlignedFrontiersParams {
    readonly geometry: CanonicalGeometrySnapshot;
    readonly stars: ReadonlyArray<StarState>;
    readonly requestedMarginPx: number;
}

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

function alignInterOwnerPolyline(params: {
    polyline: CanonicalFrontierPolyline;
    ownerStars: ReadonlyMap<string, readonly StarState[]>;
    appliedMarginPx: number;
}): ConstraintAlignedFrontierPolyline {
    const { polyline, ownerStars, appliedMarginPx } = params;
    const ownerAStars = ownerStars.get(polyline.ownerA);
    const ownerBStars = ownerStars.get(polyline.ownerB);

    const points = polyline.points.map(([x, y]) => {
        const [ax, ay] = displacePointFromOwnerStars(
            x,
            y,
            ownerAStars,
            appliedMarginPx,
        );
        const [bx, by] = displacePointFromOwnerStars(
            x,
            y,
            ownerBStars,
            appliedMarginPx,
        );
        return [(ax + bx) * 0.5, (ay + by) * 0.5] as [number, number];
    });

    return {
        ...polyline,
        points,
        kind: 'inter_owner',
    };
}

function alignWorldBorderPolyline(params: {
    polyline: CanonicalFrontierPolyline;
    ownerStars: ReadonlyMap<string, readonly StarState[]>;
    appliedMarginPx: number;
}): ConstraintAlignedFrontierPolyline {
    const { polyline, ownerStars, appliedMarginPx } = params;
    const ownerAStars = ownerStars.get(polyline.ownerA);

    const points = polyline.points.map(([x, y]) =>
        displacePointFromOwnerStars(x, y, ownerAStars, appliedMarginPx),
    );

    return {
        ...polyline,
        points,
        kind: 'world',
    };
}

export function resolveConstraintAlignedFrontiers(
    params: ResolveConstraintAlignedFrontiersParams,
): {
    readonly frontierPolylines: readonly ConstraintAlignedFrontierPolyline[];
    readonly worldBorderPolylines: readonly ConstraintAlignedFrontierPolyline[];
    readonly appliedMarginPx: number;
} {
    const appliedMarginPx = resolveAppliedMinStarMarginPx(
        params.stars,
        params.requestedMarginPx,
    );
    const ownerStars = buildOwnerStars(params.stars);

    if (appliedMarginPx <= 0) {
        return {
            frontierPolylines: params.geometry.frontierPolylines.map((polyline) => ({
                ...polyline,
                kind: 'inter_owner',
            })),
            worldBorderPolylines: params.geometry.worldBorderPolylines.map((polyline) => ({
                ...polyline,
                kind: 'world',
            })),
            appliedMarginPx,
        };
    }

    return {
        frontierPolylines: params.geometry.frontierPolylines.map((polyline) =>
            alignInterOwnerPolyline({
                polyline,
                ownerStars,
                appliedMarginPx,
            }),
        ),
        worldBorderPolylines: params.geometry.worldBorderPolylines.map((polyline) =>
            alignWorldBorderPolyline({
                polyline,
                ownerStars,
                appliedMarginPx,
            }),
        ),
        appliedMarginPx,
    };
}
