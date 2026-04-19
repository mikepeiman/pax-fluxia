import type { StarState } from '$lib/types/game.types';

type MarginTerritory = {
    ownerId: string;
    points: [number, number][];
};

export interface MinStarMarginResult {
    requestedMarginPx: number;
    appliedMarginPx: number;
}

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
        if (bucket) {
            bucket.push(star);
        } else {
            ownerStars.set(star.ownerId, [star]);
        }
    }

    for (const territory of territories) {
        const starsForOwner = ownerStars.get(territory.ownerId);
        if (!starsForOwner?.length) continue;

        for (let i = 0; i < territory.points.length; i++) {
            const [vx, vy] = territory.points[i]!;
            let nearestStar: StarState | null = null;
            let nearestDistance = Infinity;

            for (const star of starsForOwner) {
                const dx = vx - star.x;
                const dy = vy - star.y;
                const distance = Math.hypot(dx, dy);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestStar = star;
                }
            }

            if (
                !nearestStar
                || nearestDistance >= appliedMarginPx
                || nearestDistance <= 0.001
            ) {
                continue;
            }

            const dx = vx - nearestStar.x;
            const dy = vy - nearestStar.y;
            const scale = appliedMarginPx / nearestDistance;
            territory.points[i] = [
                nearestStar.x + dx * scale,
                nearestStar.y + dy * scale,
            ];
        }
    }

    return { requestedMarginPx, appliedMarginPx };
}
