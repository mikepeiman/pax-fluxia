// Patch into pax-fluxia/src/lib/territory/families/gridGradient/settings.ts
// 1. Extend GRID_GRADIENT_TUNABLE_KEYS with these keys.
// 2. Extend GridGradientSettings with the readonly fields below.
// 3. Add readers in resolveGridGradientSettings using these defaults.

import type {
    GridGradientDrawBackend,
    GridGradientShaderDebugMode,
    GridGradientShaderNeighborMode,
} from './config';
import { gridGradientShaderFieldConfigDefaults } from './config';

export const GRID_GRADIENT_SHADER_FIELD_TUNABLE_KEYS = [
    'GRID_GRADIENT_DRAW_BACKEND',
    'GRID_GRADIENT_SHADER_NEIGHBOR_MODE',
    'GRID_GRADIENT_SHADER_RESOLUTION_SCALE',
    'GRID_GRADIENT_SHADER_MARK_SOFTNESS',
    'GRID_GRADIENT_SHADER_EDGE_SOFTNESS_PX',
    'GRID_GRADIENT_SHADER_NOISE_STRENGTH',
    'GRID_GRADIENT_SHADER_PULSE_STRENGTH',
    'GRID_GRADIENT_SHADER_PULSE_SPEED',
    'GRID_GRADIENT_SHADER_FIELD_DRIFT_PX',
    'GRID_GRADIENT_SHADER_FIELD_DRIFT_SPEED',
    'GRID_GRADIENT_SHADER_GLOW_STRENGTH',
    'GRID_GRADIENT_SHADER_BLUR_STRENGTH',
    'GRID_GRADIENT_SHADER_INTERIOR_ALPHA_BOOST',
    'GRID_GRADIENT_SHADER_EDGE_ALPHA_BOOST',
    'GRID_GRADIENT_SHADER_COLOR_MIX_POWER',
    'GRID_GRADIENT_SHADER_DEBUG_MODE',
] as const;

export interface GridGradientShaderFieldSettingsFragment {
    readonly drawBackend: GridGradientDrawBackend;
    readonly shaderNeighborMode: GridGradientShaderNeighborMode;
    readonly shaderResolutionScale: number;
    readonly shaderMarkSoftness: number;
    readonly shaderEdgeSoftnessPx: number;
    readonly shaderNoiseStrength: number;
    readonly shaderPulseStrength: number;
    readonly shaderPulseSpeed: number;
    readonly shaderFieldDriftPx: number;
    readonly shaderFieldDriftSpeed: number;
    readonly shaderGlowStrength: number;
    readonly shaderBlurStrength: number;
    readonly shaderInteriorAlphaBoost: number;
    readonly shaderEdgeAlphaBoost: number;
    readonly shaderColorMixPower: number;
    readonly shaderDebugMode: GridGradientShaderDebugMode;
}

// Add this block near the bottom of resolveGridGradientSettings return object.
export function resolveGridGradientShaderFieldSettingsFragment(input: any): GridGradientShaderFieldSettingsFragment {
    const defaults = gridGradientShaderFieldConfigDefaults;
    const readTunableString = input.__readTunableString;
    const readTunableNumber = input.__readTunableNumber;
    const clamp = input.__clamp;
    return {
        drawBackend: readTunableString(input, 'GRID_GRADIENT_DRAW_BACKEND', defaults.GRID_GRADIENT_DRAW_BACKEND, ['graphics', 'shader_field', 'mesh_quads']),
        shaderNeighborMode: readTunableString(input, 'GRID_GRADIENT_SHADER_NEIGHBOR_MODE', defaults.GRID_GRADIENT_SHADER_NEIGHBOR_MODE, ['center', 'cross', 'eight']),
        shaderResolutionScale: clamp(readTunableNumber(input, 'GRID_GRADIENT_SHADER_RESOLUTION_SCALE', defaults.GRID_GRADIENT_SHADER_RESOLUTION_SCALE), 0.25, 2),
        shaderMarkSoftness: clamp(readTunableNumber(input, 'GRID_GRADIENT_SHADER_MARK_SOFTNESS', defaults.GRID_GRADIENT_SHADER_MARK_SOFTNESS), 0, 1.5),
        shaderEdgeSoftnessPx: clamp(readTunableNumber(input, 'GRID_GRADIENT_SHADER_EDGE_SOFTNESS_PX', defaults.GRID_GRADIENT_SHADER_EDGE_SOFTNESS_PX), 0, 8),
        shaderNoiseStrength: clamp(readTunableNumber(input, 'GRID_GRADIENT_SHADER_NOISE_STRENGTH', defaults.GRID_GRADIENT_SHADER_NOISE_STRENGTH), 0, 2),
        shaderPulseStrength: clamp(readTunableNumber(input, 'GRID_GRADIENT_SHADER_PULSE_STRENGTH', defaults.GRID_GRADIENT_SHADER_PULSE_STRENGTH), 0, 1),
        shaderPulseSpeed: clamp(readTunableNumber(input, 'GRID_GRADIENT_SHADER_PULSE_SPEED', defaults.GRID_GRADIENT_SHADER_PULSE_SPEED), 0, 20),
        shaderFieldDriftPx: clamp(readTunableNumber(input, 'GRID_GRADIENT_SHADER_FIELD_DRIFT_PX', defaults.GRID_GRADIENT_SHADER_FIELD_DRIFT_PX), 0, 12),
        shaderFieldDriftSpeed: clamp(readTunableNumber(input, 'GRID_GRADIENT_SHADER_FIELD_DRIFT_SPEED', defaults.GRID_GRADIENT_SHADER_FIELD_DRIFT_SPEED), 0, 8),
        shaderGlowStrength: clamp(readTunableNumber(input, 'GRID_GRADIENT_SHADER_GLOW_STRENGTH', defaults.GRID_GRADIENT_SHADER_GLOW_STRENGTH), 0, 2),
        shaderBlurStrength: clamp(readTunableNumber(input, 'GRID_GRADIENT_SHADER_BLUR_STRENGTH', defaults.GRID_GRADIENT_SHADER_BLUR_STRENGTH), 0, 2),
        shaderInteriorAlphaBoost: clamp(readTunableNumber(input, 'GRID_GRADIENT_SHADER_INTERIOR_ALPHA_BOOST', defaults.GRID_GRADIENT_SHADER_INTERIOR_ALPHA_BOOST), 0, 3),
        shaderEdgeAlphaBoost: clamp(readTunableNumber(input, 'GRID_GRADIENT_SHADER_EDGE_ALPHA_BOOST', defaults.GRID_GRADIENT_SHADER_EDGE_ALPHA_BOOST), 0, 3),
        shaderColorMixPower: clamp(readTunableNumber(input, 'GRID_GRADIENT_SHADER_COLOR_MIX_POWER', defaults.GRID_GRADIENT_SHADER_COLOR_MIX_POWER), 0.1, 4),
        shaderDebugMode: readTunableString(input, 'GRID_GRADIENT_SHADER_DEBUG_MODE', defaults.GRID_GRADIENT_SHADER_DEBUG_MODE, ['off', 'cell_grid', 'owner_index', 'distance_band', 'flip_time', 'role']),
    };
}
