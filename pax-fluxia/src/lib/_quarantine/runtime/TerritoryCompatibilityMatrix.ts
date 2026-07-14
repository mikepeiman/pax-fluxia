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
        selection.geometryMode === 'resolved_power_voronoi' &&
        selection.fillTransitionMode !== 'pv_frontline'
    ) {
        warnings.push(
            'resolved_power_voronoi geometry is intended to run with pv_frontline transitions.',
        );
    }

    if (
        selection.fillTransitionMode === 'pv_frontline' &&
        selection.borderTransitionMode !== 'off'
    ) {
        warnings.push(
            'pv_frontline currently requires borderTransitionMode=off so fills and borders stay on the resolved PV surface.',
        );
    }

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
        selection.fillTransitionMode === 'crossfade'
    ) {
        warnings.push('pixel style + crossfade may look blurred at low resolutions.');
    }

    return {
        ok: true,
        warnings,
    };
}
