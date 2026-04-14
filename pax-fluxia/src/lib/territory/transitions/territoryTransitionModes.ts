export interface TransitionModeOption<T extends string = string> {
    id: T;
    label: string;
    description: string;
}

export type LegacyVsTransitionModeId =
    | 'dual_ghost'
    | 'no_loser'
    | 'no_ghosts'
    | 'matched_ease'
    | 'sequential'
    | 'linear';

export type MetaballTransitionModeId =
    | 'metaball_lane_push'
    | 'metaball_hold_then_switch'
    | 'metaball_six_slice_burst';

export type VsTransitionModeId =
    | LegacyVsTransitionModeId
    | MetaballTransitionModeId;

export type MetaballBurstBoundaryBasis =
    | 't0_region_contour'
    | 'per_ray_contour_hits'
    | 'approximate_radius';

export const LEGACY_VS_TRANSITION_MODE_OPTIONS: readonly TransitionModeOption<LegacyVsTransitionModeId>[] =
    [
        {
            id: 'dual_ghost',
            label: 'Dual Ghost',
            description: 'Victor and loser ghosts move together on the legacy VS path.',
        },
        {
            id: 'no_loser',
            label: 'No Loser Ghost',
            description: 'Only the victor ghost moves; loser area dissolves without a retreat site.',
        },
        {
            id: 'no_ghosts',
            label: 'No Ghosts',
            description: 'Legacy fill ramps with no moving ghost sites.',
        },
        {
            id: 'matched_ease',
            label: 'Matched Ease',
            description: 'Legacy ghost travel and weight curves share the same easing.',
        },
        {
            id: 'sequential',
            label: 'Sequential',
            description: 'Legacy loser fade finishes before the victor completes travel.',
        },
        {
            id: 'linear',
            label: 'Linear',
            description: 'Legacy ghost travel and fade stay linear across the transition.',
        },
    ] as const;

export const METABALL_TRANSITION_MODE_OPTIONS: readonly TransitionModeOption<MetaballTransitionModeId>[] =
    [
        {
            id: 'metaball_lane_push',
            label: 'Lane Push',
            description: 'Advancing attacker influence pushes through the conquest lane.',
        },
        {
            id: 'metaball_hold_then_switch',
            label: 'Hold Then Switch',
            description: 'Keep the conquered star on the old owner until it fades out, while victor sites travel in at full strength.',
        },
        {
            id: 'metaball_six_slice_burst',
            label: 'Six-Slice Burst',
            description: 'Five loser shards burst away while victor influence rides the lane.',
        },
    ] as const;

export const METABALL_BURST_BOUNDARY_BASIS_OPTIONS: readonly TransitionModeOption<MetaballBurstBoundaryBasis>[] =
    [
        {
            id: 't0_region_contour',
            label: 'T0 Region Contour',
            description: 'Use the nearest T0 old-owner contour distance around the conquered star.',
        },
        {
            id: 'per_ray_contour_hits',
            label: 'Per-Ray Contour Hits',
            description: 'Use the shortest contour hit across the five loser burst rays.',
        },
        {
            id: 'approximate_radius',
            label: 'Approximate Radius',
            description: 'Use an equivalent-circle radius derived from the T0 burst profile.',
        },
    ] as const;

const LEGACY_VS_TRANSITION_MODE_IDS = new Set<string>(
    LEGACY_VS_TRANSITION_MODE_OPTIONS.map((option) => option.id),
);
const METABALL_TRANSITION_MODE_IDS = new Set<string>(
    METABALL_TRANSITION_MODE_OPTIONS.map((option) => option.id),
);

export function isLegacyVsTransitionMode(
    mode: string | null | undefined,
): mode is LegacyVsTransitionModeId {
    return typeof mode === 'string' && LEGACY_VS_TRANSITION_MODE_IDS.has(mode);
}

export function isMetaballTransitionMode(
    mode: string | null | undefined,
): mode is MetaballTransitionModeId {
    return typeof mode === 'string' && METABALL_TRANSITION_MODE_IDS.has(mode);
}

export function getTransitionModeOptionsForRenderMode(
    renderMode: string | null | undefined,
): readonly TransitionModeOption<VsTransitionModeId>[] {
    if (renderMode === 'metaball') {
        return METABALL_TRANSITION_MODE_OPTIONS;
    }
    return LEGACY_VS_TRANSITION_MODE_OPTIONS;
}

export function coerceVsTransitionModeForRenderMode(
    renderMode: string | null | undefined,
    mode: string | null | undefined,
): VsTransitionModeId {
    if (renderMode === 'metaball') {
        return isMetaballTransitionMode(mode) ? mode : 'metaball_lane_push';
    }
    return isLegacyVsTransitionMode(mode) ? mode : 'no_loser';
}
