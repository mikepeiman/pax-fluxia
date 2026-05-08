export const ACTIVE_FRONT_DEBUG_COLORS = {
    unchangedSection: 0x4b5573,
    noMotionSection: 0x8b93b2,
    activeSection: 0xf0b400,
    activeFront: 0x52ff8f,
    prevFront: 0xff73c6,
    prevNoMotionSection: 0xc88dff,
    defectMissingFrontier: 0xff4d6d,
    defectSplitMerge: 0xff8c42,
    stableAnchor: 0x3cdcff,
    changeAnchor: 0x72ff5e,
    defectAnchor: 0xff4d6d,
    transitionVertex: 0x7de7ff,
    structuralVertex: 0xa0a8c8,
    prevVertex: 0xffb5e8,
    sampleDot: 0xc88dff,
    labelFill: 0xf4f7ff,
} as const;

export type ActiveFrontLegendKind =
    | 'dashed'
    | 'line'
    | 'thick'
    | 'ring'
    | 'diamond'
    | 'square'
    | 'dot';

export interface ActiveFrontLegendItem {
    id: string;
    label: string;
    color: number;
    kind: ActiveFrontLegendKind;
}

export const ACTIVE_FRONT_LEGEND_ITEMS: readonly ActiveFrontLegendItem[] = [
    { id: 'prev-front', label: 'PRE front', color: ACTIVE_FRONT_DEBUG_COLORS.prevFront, kind: 'dashed' },
    { id: 'post-front', label: 'POST front', color: ACTIVE_FRONT_DEBUG_COLORS.activeSection, kind: 'line' },
    { id: 'active-front', label: 'Active front', color: ACTIVE_FRONT_DEBUG_COLORS.activeFront, kind: 'thick' },
    {
        id: 'no-motion-front',
        label: 'No-motion front',
        color: ACTIVE_FRONT_DEBUG_COLORS.noMotionSection,
        kind: 'line',
    },
    {
        id: 'defect-front-missing',
        label: 'Defect front (missing corresponding frontier)',
        color: ACTIVE_FRONT_DEBUG_COLORS.defectMissingFrontier,
        kind: 'line',
    },
    {
        id: 'defect-front-split',
        label: 'Defect front (split/merge mismatch)',
        color: ACTIVE_FRONT_DEBUG_COLORS.defectSplitMerge,
        kind: 'line',
    },
    { id: 'stable-anchor', label: 'Stable anchor', color: ACTIVE_FRONT_DEBUG_COLORS.stableAnchor, kind: 'ring' },
    { id: 'change-anchor', label: 'Change anchor', color: ACTIVE_FRONT_DEBUG_COLORS.changeAnchor, kind: 'diamond' },
    { id: 'defect-anchor', label: 'Defect anchor', color: ACTIVE_FRONT_DEBUG_COLORS.defectAnchor, kind: 'square' },
    { id: 'tv', label: 'Transition vertices (TVs)', color: ACTIVE_FRONT_DEBUG_COLORS.transitionVertex, kind: 'dot' },
    { id: 'sample-dot', label: 'Sample points', color: ACTIVE_FRONT_DEBUG_COLORS.sampleDot, kind: 'dot' },
] as const;

export function activeFrontColorToCssHex(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
}
