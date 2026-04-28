import type { TerritoryModeSelection } from '../contracts/TerritoryModeSelection';

export interface CompatibilityResult {
    ok: boolean;
    warnings: string[];
}

export function validateTerritoryModeSelection(
    selection: TerritoryModeSelection,
): CompatibilityResult {
    const warnings: string[] = [];

    if (
        selection.styleMode === 'distance_field' &&
        selection.borderTransitionMode === 'rope_morph'
    ) {
        warnings.push(
            'distance_field style currently prefers optimal_transport or off border transitions.',
        );
    }

    if (
        selection.styleMode === 'pixel' &&
        selection.fillTransitionMode === 'legacy_fill_crossfade'
    ) {
        warnings.push('pixel style + crossfade may look blurred at low resolutions.');
    }

    return {
        ok: true,
        warnings,
    };
}
