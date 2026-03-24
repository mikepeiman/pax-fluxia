import type {
    BorderTransitionModeId,
    FillTransitionModeId,
    GeometryModeId,
    OwnershipModeId,
    TerritoryStyleModeId,
} from './TerritoryModeSelection';

export interface ModeDescriptor {
    id: string;
    name: string;
    summary: string;
}

export const OWNERSHIP_MODE_CATALOG: Readonly<Record<OwnershipModeId, ModeDescriptor>> =
    {
        star_ownership_snapshot: {
            id: 'star_ownership_snapshot',
            name: 'Virtual-Star Ownership Snapshot',
            summary:
                'Computes current star ownership and emits time-decaying virtual stars for conquest transitions.',
        },
    };

export const GEOMETRY_MODE_CATALOG: Readonly<Record<GeometryModeId, ModeDescriptor>> =
    {
        power_voronoi: {
            id: 'power_voronoi',
            name: 'Weighted Power Voronoi Geometry',
            summary:
                'Builds ownership regions from weighted Voronoi cells using direct power-diagram generation.',
        },
        boundary_aware_frontier: {
            id: 'boundary_aware_frontier',
            name: 'Boundary-Constrained Frontier Geometry',
            summary:
                'Builds frontier loops with explicit world-boundary handling and ownership-aware contour extraction.',
        },
        seed_graph: {
            id: 'seed_graph',
            name: 'Seed-Graph Cluster-Split Geometry',
            summary:
                'Uses graph-aware seed clustering with split smoothing to produce stable territory boundaries.',
        },
    };

export const FILL_TRANSITION_MODE_CATALOG: Readonly<
    Record<FillTransitionModeId, ModeDescriptor>
> = {
    frontier_morph: {
        id: 'frontier_morph',
        name: 'Frontier Topology Morph Fill',
        summary:
            'Morphs fill geometry along frontier topology progression during ownership changes.',
    },
    crossfade: {
        id: 'crossfade',
        name: 'Alpha Crossfade Fill',
        summary:
            'Blends from previous to next fill geometry with alpha-weighted interpolation.',
    },
    off: {
        id: 'off',
        name: 'Fill Transition Disabled',
        summary: 'Disables fill interpolation and snaps to target geometry each frame.',
    },
};

export const BORDER_TRANSITION_MODE_CATALOG: Readonly<
    Record<BorderTransitionModeId, ModeDescriptor>
> = {
    optimal_transport: {
        id: 'optimal_transport',
        name: 'Optimal-Transport Correspondence Border',
        summary:
            'Uses correspondence planning to transport border samples between frontier states.',
    },
    rope_morph: {
        id: 'rope_morph',
        name: 'Rope-Interpolated Border',
        summary:
            'Interpolates border polylines as rope-like segments between previous and target frontier states.',
    },
    off: {
        id: 'off',
        name: 'Border Transition Disabled',
        summary: 'Disables border interpolation and snaps to target frontier geometry.',
    },
};

export const STYLE_MODE_CATALOG: Readonly<
    Record<TerritoryStyleModeId, ModeDescriptor>
> = {
    canonical: {
        id: 'canonical',
        name: 'Canonical Vector Polygon Style',
        summary:
            'Renders vector polygon fills and borders directly from transition snapshots.',
    },
    distance_field: {
        id: 'distance_field',
        name: 'Signed-Distance Field Style',
        summary:
            'Renders territory using distance-field-oriented presentation semantics and diagnostics.',
    },
    pixel: {
        id: 'pixel',
        name: 'Pixel-Quantized Style',
        summary:
            'Quantizes geometry onto pixel boundaries for crisp low-resolution territory rendering.',
    },
};
