export interface LaneMarginConfigLike {
    MAPGEN_LANE_MARGIN_ENABLED?: boolean;
    MAPGEN_LANE_MARGIN_PX?: number;
    MODIFIED_VORONOI_STAR_MARGIN?: number;
}

export function resolveEffectiveLaneMarginPx(
    config: LaneMarginConfigLike,
): number {
    const msr = Math.max(0, config.MODIFIED_VORONOI_STAR_MARGIN ?? 45);
    if (config.MAPGEN_LANE_MARGIN_ENABLED === false) {
        return msr;
    }
    return Math.max(0, config.MAPGEN_LANE_MARGIN_PX ?? 75);
}

export function patchTouchesLaneTopology(
    patch: Record<string, unknown>,
    currentConfig: LaneMarginConfigLike,
): boolean {
    if (
        'MAPGEN_LANE_MARGIN_PX' in patch
        || 'MAPGEN_LANE_MARGIN_ENABLED' in patch
        || 'MAPGEN_LANE_CURVE_VS_PRUNE_BIAS' in patch
    ) {
        return true;
    }

    const nextLaneMarginEnabled =
        'MAPGEN_LANE_MARGIN_ENABLED' in patch
            ? Boolean(patch.MAPGEN_LANE_MARGIN_ENABLED)
            : currentConfig.MAPGEN_LANE_MARGIN_ENABLED ?? true;

    return (
        !nextLaneMarginEnabled && 'MODIFIED_VORONOI_STAR_MARGIN' in patch
    );
}
