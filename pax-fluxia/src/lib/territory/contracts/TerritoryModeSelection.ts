export type OwnershipModeId = 'star_ownership_snapshot';

export type GeometryModeId =
    | 'power_voronoi'
    | 'boundary_aware_frontier'
    | 'seed_graph';

export type FillTransitionModeId =
    | 'frontier_morph'
    | 'crossfade'
    | 'off';

export type BorderTransitionModeId =
    | 'optimal_transport'
    | 'rope_morph'
    | 'off';

export type TerritoryStyleModeId =
    | 'canonical'
    | 'distance_field'
    | 'pixel';

export interface TerritoryModeSelection {
    ownershipMode: OwnershipModeId;
    geometryMode: GeometryModeId;
    fillTransitionMode: FillTransitionModeId;
    borderTransitionMode: BorderTransitionModeId;
    styleMode: TerritoryStyleModeId;
}

export const DEFAULT_TERRITORY_MODE_SELECTION: TerritoryModeSelection = {
    ownershipMode: 'star_ownership_snapshot',
    geometryMode: 'boundary_aware_frontier',
    fillTransitionMode: 'frontier_morph',
    borderTransitionMode: 'optimal_transport',
    styleMode: 'canonical',
};
