import type { SectionInfluence } from '../contracts/FrontierTopologyContracts';

type Vec2 = [number, number];

export interface SectionInfluenceStar {
    id: string;
    x: number;
    y: number;
    ownerId?: string | null;
}

export interface BuildSectionInfluenceInput {
    ownerId: string;
    points: ReadonlyArray<Vec2>;
    stars: ReadonlyArray<SectionInfluenceStar>;
    starOwners?: ReadonlyMap<string, string>;
}

function distance(a: Vec2, b: Vec2): number {
    return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function pointAtHalfArcLength(points: ReadonlyArray<Vec2>): Vec2 {
    if (points.length === 0) return [0, 0];
    if (points.length === 1) return [points[0][0], points[0][1]];

    let total = 0;
    const cumulative: number[] = [0];
    for (let i = 1; i < points.length; i += 1) {
        total += distance(points[i - 1], points[i]);
        cumulative.push(total);
    }

    const target = total * 0.5;
    for (let i = 1; i < cumulative.length; i += 1) {
        if (cumulative[i] < target) continue;
        const segStart = cumulative[i - 1];
        const segLength = cumulative[i] - segStart;
        if (segLength <= 1e-6) {
            return [points[i][0], points[i][1]];
        }
        const t = (target - segStart) / segLength;
        const ax = points[i - 1][0];
        const ay = points[i - 1][1];
        const bx = points[i][0];
        const by = points[i][1];
        return [ax + (bx - ax) * t, ay + (by - ay) * t];
    }

    const last = points[points.length - 1];
    return [last[0], last[1]];
}

function resolveOwnerId(
    star: SectionInfluenceStar,
    starOwners?: ReadonlyMap<string, string>,
): string | null {
    const explicitOwner = starOwners?.get(star.id);
    if (explicitOwner) return explicitOwner;
    return star.ownerId ?? null;
}

export function buildSectionInfluence(
    input: BuildSectionInfluenceInput,
): SectionInfluence {
    if (input.ownerId === 'world') {
        return {
            ownerId: 'world',
            primaryStarId: '',
            primaryScore: 0,
        };
    }

    const midpoint = pointAtHalfArcLength(input.points);
    const ownedStars = input.stars
        .filter((star) => resolveOwnerId(star, input.starOwners) === input.ownerId)
        .map((star) => ({
            star,
            distance: distance(midpoint, [star.x, star.y]),
        }))
        .sort((a, b) => a.distance - b.distance);

    if (ownedStars.length === 0) {
        return {
            ownerId: input.ownerId,
            primaryStarId: '',
            primaryScore: 0,
        };
    }

    const primary = ownedStars[0]!;
    const secondary = ownedStars[1];
    if (!secondary) {
        return {
            ownerId: input.ownerId,
            primaryStarId: primary.star.id,
            primaryScore: 1,
        };
    }

    const primaryWeight = 1 / Math.max(primary.distance, 1);
    const secondaryWeight = 1 / Math.max(secondary.distance, 1);
    const totalWeight = primaryWeight + secondaryWeight;

    return {
        ownerId: input.ownerId,
        primaryStarId: primary.star.id,
        primaryScore: totalWeight > 0 ? primaryWeight / totalWeight : 1,
        secondaryStarId: secondary.star.id,
        secondaryScore: totalWeight > 0 ? secondaryWeight / totalWeight : 0,
    };
}
