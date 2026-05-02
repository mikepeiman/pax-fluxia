const DEFAULT_POWER_VORONOI_WEIGHT_RADIUS_PX = 45;

export function resolvePowerVoronoiBaseWeight(): number {
    return (
        DEFAULT_POWER_VORONOI_WEIGHT_RADIUS_PX *
        DEFAULT_POWER_VORONOI_WEIGHT_RADIUS_PX
    );
}

export function resolvePowerVoronoiWeightedSite(
    multiplier = 1,
): number {
    const clampedMultiplier =
        Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
    return resolvePowerVoronoiBaseWeight() * clampedMultiplier;
}
