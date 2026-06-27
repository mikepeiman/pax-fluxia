export type OwnershipModeId = 'star_ownership_snapshot';

export type GeometryModeId =
    | 'unified_vector' // Unified Vector Geometry
    | 'resolved_power_voronoi' // Resolved Power Voronoi
    | 'power_core_candidate'; // Power-core comparison candidate, not default authority

export type FillTransitionModeId =
    | 'frontier_morph' // Frontier Topology Morph Fill (legacy OT — broken)
    | 'active_front'   // Active Front Interpolation (gap-free frontier-graph surgery)
    | 'unified_topology' // Unified Topology — fills + borders derived from same interpolated frontier sections
    | 'pv_frontline' // Power Voronoi frontline transition
    | 'crossfade' // Alpha Crossfade Fill
    | 'off';

export type BorderTransitionModeId =
    | 'optimal_transport' // Optimal-Transport Correspondence Border
    | 'rope_morph' // Rope-Interpolated Border
    | 'off';

export type TerritoryStyleModeId =
    | 'vector' // Vector Polygon Style
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
    geometryMode: 'resolved_power_voronoi',
    fillTransitionMode: 'pv_frontline',
    borderTransitionMode: 'off',
    styleMode: 'vector',
};
