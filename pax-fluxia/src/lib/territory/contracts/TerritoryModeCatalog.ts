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
    unified_vector: {
        id: 'unified_vector',
        name: 'Unified Vector Geometry',
        summary:
            'Consolidated vector geometry mode using the canonical compiler with world borders, shell classification, and frontier topology.',
    },
    canonical_power_voronoi: {
        id: 'canonical_power_voronoi',
        name: 'Power Voronoi 0427 Geometry',
        summary:
            'Exact Power Voronoi geometry path compiled from paired ownership snapshots for PVV4 transitions.',
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
    active_front: {
        id: 'active_front',
        name: 'Active Front Interpolation',
        summary:
            'Gap-free transitions by interpolating only changed frontier spans in the shared frontier graph, then rebuilding region loops from frozen + interpolated sections.',
    },
    unified_topology: {
        id: 'unified_topology',
        name: 'Unified Topology',
        summary:
            'Fills and borders derived from the same interpolated frontier sections. Eliminates fill/border divergence by construction.',
    },
    pv_frontline: {
        id: 'pv_frontline',
        name: 'PVV4 Frontline',
        summary:
            'Conquest-local Power Voronoi frontier transition with paired PRE and POST geometry truth and exact endpoint reconstruction.',
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
