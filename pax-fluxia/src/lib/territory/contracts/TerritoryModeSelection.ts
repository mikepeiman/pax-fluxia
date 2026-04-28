export type OwnershipModeId = 'star_ownership_snapshot';

export type GeometryModeId =
    | 'unified_vector'; // Unified Vector Geometry — sole canonical mode

export type FillTransitionModeId =
    | 'legacy_fill_active_front' // Legacy fill-only active-front interpolation fallback
    | 'topology_fill_rebuild' // Topology planner + fill resampling path; does not currently emit border transition frames
    | 'legacy_fill_crossfade' // Legacy fill-only alpha crossfade fallback
    | 'off'; // Snap directly to the target fill

export type BorderTransitionModeId =
    | 'optimal_transport' // Optimal-Transport Correspondence Border
    | 'rope_morph' // Rope-Interpolated Border
    | 'off';

export type TerritoryStyleModeId =
    | 'canonical' // Canonical Vector Polygon Style
    | 'distance_field' // Signed-Distance Field Style
    | 'pixel'; // Pixel-Quantized Style

export interface TerritoryModeSelection {
    ownershipMode: OwnershipModeId;
    geometryMode: GeometryModeId;
    fillTransitionMode: FillTransitionModeId;
    borderTransitionMode: BorderTransitionModeId;
    styleMode: TerritoryStyleModeId;
}

export const DEFAULT_TERRITORY_MODE_SELECTION: TerritoryModeSelection = {
    ownershipMode: 'star_ownership_snapshot',
    geometryMode: 'unified_vector',
    fillTransitionMode: 'topology_fill_rebuild',
    borderTransitionMode: 'optimal_transport',
    styleMode: 'canonical',
};
