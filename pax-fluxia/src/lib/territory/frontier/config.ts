import type {
    TerritoryFrontierBenchmarkPresetId,
    TerritoryFrontierBorderGeometryMode,
    TerritoryFrontierTechniqueId,
    TerritoryFrontierTriangleDiagonalPolicy,
} from './types';

export const territoryFrontierConfigDefaults = {
    TERRITORY_FRONTIER_TECHNIQUE: 'control' as TerritoryFrontierTechniqueId,
    TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE:
        'shared_edge' as TerritoryFrontierBorderGeometryMode,
    TERRITORY_FRONTIER_PHASE_SAMPLING: 'nearest' as const,
    TERRITORY_FRONTIER_BLUR_PASSES: 0,
    TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY:
        'fixed' as TerritoryFrontierTriangleDiagonalPolicy,
    TERRITORY_FRONTIER_CHAIKIN_PASSES: 0,
    TERRITORY_FRONTIER_SHADER_SOFTNESS_PX: 5,
    TERRITORY_FRONTIER_BAND_WIDTH_PX: 2,
} as const;

export const TERRITORY_FRONTIER_TUNABLE_KEYS = [
    'TERRITORY_FRONTIER_TECHNIQUE',
    'TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE',
    'TERRITORY_FRONTIER_PHASE_SAMPLING',
    'TERRITORY_FRONTIER_BLUR_PASSES',
    'TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY',
    'TERRITORY_FRONTIER_CHAIKIN_PASSES',
    'TERRITORY_FRONTIER_SHADER_SOFTNESS_PX',
    'TERRITORY_FRONTIER_BAND_WIDTH_PX',
] as const;

export interface TerritoryFrontierBenchmarkPreset {
    readonly id: TerritoryFrontierBenchmarkPresetId;
    readonly label: string;
    readonly description: string;
    readonly values: Readonly<Record<string, string | number | boolean>>;
}

export const TERRITORY_FRONTIER_BENCHMARK_PRESETS: readonly TerritoryFrontierBenchmarkPreset[] = [
    {
        id: 'current_control',
        label: 'Current control',
        description: 'Existing square shared-edge control path.',
        values: {
            TERRITORY_FRONTIER_TECHNIQUE: 'control',
            TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: 'shared_edge',
            TERRITORY_FRONTIER_PHASE_SAMPLING: 'nearest',
            TERRITORY_FRONTIER_BLUR_PASSES: 0,
            TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY: 'fixed',
            TERRITORY_FRONTIER_CHAIKIN_PASSES: 0,
            TERRITORY_FRONTIER_SHADER_SOFTNESS_PX: 5,
            TERRITORY_FRONTIER_BAND_WIDTH_PX: 2,
        },
    },
    {
        id: 'shader_linear',
        label: 'Shader linear',
        description: 'Linear phase sampling and smoothstep frontier band.',
        values: {
            TERRITORY_FRONTIER_TECHNIQUE: 'shader_frontier_band',
            TERRITORY_FRONTIER_PHASE_SAMPLING: 'linear',
            TERRITORY_FRONTIER_BLUR_PASSES: 0,
            TERRITORY_FRONTIER_CHAIKIN_PASSES: 0,
            TERRITORY_FRONTIER_SHADER_SOFTNESS_PX: 5,
            TERRITORY_FRONTIER_BAND_WIDTH_PX: 2,
        },
    },
    {
        id: 'shader_linear_blur',
        label: 'Shader linear + blur',
        description: 'Linear phase sampling plus one 3-tap blur pass.',
        values: {
            TERRITORY_FRONTIER_TECHNIQUE: 'shader_frontier_band',
            TERRITORY_FRONTIER_PHASE_SAMPLING: 'linear',
            TERRITORY_FRONTIER_BLUR_PASSES: 1,
            TERRITORY_FRONTIER_CHAIKIN_PASSES: 0,
            TERRITORY_FRONTIER_SHADER_SOFTNESS_PX: 6,
            TERRITORY_FRONTIER_BAND_WIDTH_PX: 3,
        },
    },
    {
        id: 'marching_squares_midpoint',
        label: 'Marching squares midpoint',
        description: 'Binary midpoint marching-squares contour.',
        values: {
            TERRITORY_FRONTIER_TECHNIQUE: 'marching_squares_midpoint',
            TERRITORY_FRONTIER_PHASE_SAMPLING: 'nearest',
            TERRITORY_FRONTIER_BLUR_PASSES: 0,
            TERRITORY_FRONTIER_CHAIKIN_PASSES: 0,
        },
    },
    {
        id: 'marching_squares_scalar',
        label: 'Marching squares scalar',
        description: 'Scalar-interpolated marching-squares contour.',
        values: {
            TERRITORY_FRONTIER_TECHNIQUE: 'marching_squares_scalar',
            TERRITORY_FRONTIER_PHASE_SAMPLING: 'nearest',
            TERRITORY_FRONTIER_BLUR_PASSES: 0,
            TERRITORY_FRONTIER_CHAIKIN_PASSES: 0,
        },
    },
    {
        id: 'marching_squares_scalar_chaikin_1',
        label: 'MS scalar + Chaikin(1)',
        description: 'Scalar marching squares with one Chaikin pass.',
        values: {
            TERRITORY_FRONTIER_TECHNIQUE: 'marching_squares_scalar',
            TERRITORY_FRONTIER_PHASE_SAMPLING: 'nearest',
            TERRITORY_FRONTIER_BLUR_PASSES: 0,
            TERRITORY_FRONTIER_CHAIKIN_PASSES: 1,
        },
    },
    {
        id: 'marching_squares_scalar_blur_chaikin_1',
        label: 'MS scalar + blur + Chaikin(1)',
        description: 'Blurred scalar marching squares with one Chaikin pass.',
        values: {
            TERRITORY_FRONTIER_TECHNIQUE: 'marching_squares_scalar',
            TERRITORY_FRONTIER_PHASE_SAMPLING: 'nearest',
            TERRITORY_FRONTIER_BLUR_PASSES: 1,
            TERRITORY_FRONTIER_CHAIKIN_PASSES: 1,
        },
    },
    {
        id: 'marching_triangles_fixed',
        label: 'Marching triangles fixed',
        description: 'Triangle contouring with a fixed diagonal.',
        values: {
            TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_fixed',
            TERRITORY_FRONTIER_PHASE_SAMPLING: 'nearest',
            TERRITORY_FRONTIER_BLUR_PASSES: 0,
            TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY: 'fixed',
            TERRITORY_FRONTIER_CHAIKIN_PASSES: 0,
        },
    },
    {
        id: 'marching_triangles_checkerboard',
        label: 'Marching triangles checkerboard',
        description: 'Triangle contouring with alternating diagonals.',
        values: {
            TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_checkerboard',
            TERRITORY_FRONTIER_PHASE_SAMPLING: 'nearest',
            TERRITORY_FRONTIER_BLUR_PASSES: 0,
            TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY: 'checkerboard',
            TERRITORY_FRONTIER_CHAIKIN_PASSES: 0,
        },
    },
    {
        id: 'marching_triangles_gradient',
        label: 'Marching triangles gradient',
        description: 'Triangle contouring with a gradient-driven diagonal.',
        values: {
            TERRITORY_FRONTIER_TECHNIQUE: 'marching_triangles_gradient',
            TERRITORY_FRONTIER_PHASE_SAMPLING: 'nearest',
            TERRITORY_FRONTIER_BLUR_PASSES: 0,
            TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY: 'gradient',
            TERRITORY_FRONTIER_CHAIKIN_PASSES: 0,
        },
    },
] as const;

export function getTerritoryFrontierBenchmarkPreset(
    presetId: TerritoryFrontierBenchmarkPresetId,
): TerritoryFrontierBenchmarkPreset {
    const preset = TERRITORY_FRONTIER_BENCHMARK_PRESETS.find(
        (entry) => entry.id === presetId,
    );
    if (!preset) {
        throw new Error(`Unknown frontier benchmark preset: ${presetId}`);
    }
    return preset;
}
