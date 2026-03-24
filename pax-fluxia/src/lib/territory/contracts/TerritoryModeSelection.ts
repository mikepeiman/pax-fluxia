export type OwnershipModeId = 'star_ownership_snapshot';

export type GeometryModeId =
    | 'unified_vector' // Unified Vector Geometry (Phase 2 — subsumes all below)
    | 'power_voronoi' // Weighted Power Voronoi Geometry (legacy)
    | 'boundary_aware_frontier' // Boundary-Constrained Frontier Geometry (legacy)
    | 'seed_graph'; // Seed-Graph Cluster-Split Geometry (legacy)

export type FillTransitionModeId =
    | 'frontier_morph' // Frontier Topology Morph Fill
    | 'crossfade' // Alpha Crossfade Fill
    | 'off';

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
    fillTransitionMode: 'frontier_morph',
    borderTransitionMode: 'optimal_transport',
    styleMode: 'canonical',
};
