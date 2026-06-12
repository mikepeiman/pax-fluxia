export interface LaneMarginConfigLike {
    MAPGEN_LANE_MARGIN_ENABLED?: boolean;
    MAPGEN_LANE_MARGIN_PX?: number;
}

export function resolveEffectiveLaneMarginPx(
    config: LaneMarginConfigLike,
): number {
    if (config.MAPGEN_LANE_MARGIN_ENABLED !== true) return 0;
    return Math.max(0, config.MAPGEN_LANE_MARGIN_PX ?? 0);
}

export function patchTouchesLaneTopology(
    patch: Record<string, unknown>,
    _currentConfig: LaneMarginConfigLike,
): boolean {
    if (
        'MAPGEN_LANE_MARGIN_PX' in patch
        || 'MAPGEN_LANE_MARGIN_ENABLED' in patch
        || 'MAPGEN_LANE_CURVE_VS_PRUNE_BIAS' in patch
    ) {
        return true;
    }
    return false;
}
