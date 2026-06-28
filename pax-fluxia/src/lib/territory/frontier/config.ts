import type {
    TerritoryFrontierBenchmarkPresetId,
    TerritoryFrontierBorderGeometryMode,
    TerritoryFrontierFxMode,
    TerritoryFrontierJunctionRenderMode,
    TerritoryFrontierTechniqueId,
    TerritoryFrontierTriangleDiagonalPolicy,
} from './types';

export const territoryFrontierConfigDefaults = {
    // Default = shader_frontier_band so Phase Edges + Ember render the SMOOTH
    // phase-surface fill that meets the border by default (the recipe gives
    // usesPhaseFill ONLY for 'shader_frontier_band' — every other technique
    // falls back to the raster scene-cell staircase). Only CellGridPhaseEdgesFamily
    // reads this at render time, so this is effectively the EDGES/EMBER default;
    // it falls back to 'control' automatically when there's no renderer or the
    // distribution isn't square. Explicit user selections still win + persist.
    TERRITORY_FRONTIER_TECHNIQUE: 'shader_frontier_band' as TerritoryFrontierTechniqueId,
    TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE:
        'shared_edge' as TerritoryFrontierBorderGeometryMode,
    // Smooth fill samples the phase field linearly (the shader-band fill + border
    // now force 'linear' in CellGridPhaseEdgesFamily regardless — 'nearest' rendered
    // the smooth fill as a cell staircase). Kept for stats/back-compat.
    TERRITORY_FRONTIER_PHASE_SAMPLING: 'linear' as const,
    TERRITORY_FRONTIER_BLUR_PASSES: 0,
    TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY:
        'fixed' as TerritoryFrontierTriangleDiagonalPolicy,
    TERRITORY_FRONTIER_CHAIKIN_PASSES: 0,
    TERRITORY_FRONTIER_SHADER_SOFTNESS_PX: 5,
    TERRITORY_FRONTIER_BAND_WIDTH_PX: 2,
    TERRITORY_FRONTIER_JUNCTION_RENDER_MODE:
        'gap' as TerritoryFrontierJunctionRenderMode,
    TERRITORY_FRONTIER_JUNCTION_RADIUS_PX: 6,
    TERRITORY_FRONTIER_OUTER_BORDER_ENABLED: false,
    TERRITORY_FRONTIER_FX_MODE: 'off' as TerritoryFrontierFxMode,
    TERRITORY_FRONTIER_FX_WIDTH_PX: 24,
    TERRITORY_FRONTIER_FX_STRENGTH: 0.75,
    TERRITORY_FRONTIER_FX_STEPS: 4,
    TERRITORY_FRONTIER_FX_SOFTNESS: 1.2,
    TERRITORY_FRONTIER_FX_EMISSIVE: 1,
    TERRITORY_FRONTIER_FX_PARTICLE_DENSITY: 0.45,
    TERRITORY_FRONTIER_FX_PULSE_SPEED: 1,
    TERRITORY_FRONTIER_FX_APPLY_STEADY_STATE: true,
    TERRITORY_FRONTIER_FX_APPLY_TRANSITION: true,
} as const;

export const TERRITORY_FRONTIER_FX_TUNABLE_KEYS = [
    'TERRITORY_FRONTIER_FX_MODE',
    'TERRITORY_FRONTIER_FX_WIDTH_PX',
    'TERRITORY_FRONTIER_FX_STRENGTH',
    'TERRITORY_FRONTIER_FX_STEPS',
    'TERRITORY_FRONTIER_FX_SOFTNESS',
    'TERRITORY_FRONTIER_FX_EMISSIVE',
    'TERRITORY_FRONTIER_FX_PARTICLE_DENSITY',
    'TERRITORY_FRONTIER_FX_PULSE_SPEED',
    'TERRITORY_FRONTIER_FX_APPLY_STEADY_STATE',
    'TERRITORY_FRONTIER_FX_APPLY_TRANSITION',
] as const;

export const TERRITORY_FRONTIER_TUNABLE_KEYS = [
    'TERRITORY_FRONTIER_TECHNIQUE',
    'TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE',
    'TERRITORY_FRONTIER_PHASE_SAMPLING',
    'TERRITORY_FRONTIER_BLUR_PASSES',
    'TERRITORY_FRONTIER_TRIANGLE_DIAGONAL_POLICY',
    'TERRITORY_FRONTIER_CHAIKIN_PASSES',
    'TERRITORY_FRONTIER_SHADER_SOFTNESS_PX',
    'TERRITORY_FRONTIER_BAND_WIDTH_PX',
    'TERRITORY_FRONTIER_JUNCTION_RENDER_MODE',
    'TERRITORY_FRONTIER_JUNCTION_RADIUS_PX',
    'TERRITORY_FRONTIER_OUTER_BORDER_ENABLED',
    ...TERRITORY_FRONTIER_FX_TUNABLE_KEYS,
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
