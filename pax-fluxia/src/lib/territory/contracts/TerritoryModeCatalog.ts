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
};

export const FILL_TRANSITION_MODE_CATALOG: Readonly<
    Record<FillTransitionModeId, ModeDescriptor>
> = {
    legacy_fill_active_front: {
        id: 'legacy_fill_active_front',
        name: 'Legacy Fill Active Front',
        summary:
            'Legacy fill-only fallback that interpolates changed frontier spans, but does not provide unified border output.',
    },
    topology_fill_rebuild: {
        id: 'topology_fill_rebuild',
        name: 'Topology Fill Rebuild',
        summary:
            'Selects the topology-driven fill rebuild path that plans active fronts from topology snapshots and rebuilds fills from that transition.',
    },
    legacy_fill_crossfade: {
        id: 'legacy_fill_crossfade',
        name: 'Legacy Fill Crossfade',
        summary:
            'Legacy fill-only alpha crossfade fallback with no unified border output.',
    },
    off: {
        id: 'off',
        name: 'Snap',
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
