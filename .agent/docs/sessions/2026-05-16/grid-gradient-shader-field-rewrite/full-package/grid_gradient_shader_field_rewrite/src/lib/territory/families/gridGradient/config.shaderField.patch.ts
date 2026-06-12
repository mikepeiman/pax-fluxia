// Patch into pax-fluxia/src/lib/territory/families/gridGradient/config.ts
// Add these exported unions and defaults alongside the existing Grid Gradient config.

export type GridGradientDrawBackend = 'graphics' | 'shader_field' | 'mesh_quads';
export type GridGradientShaderNeighborMode = 'center' | 'cross' | 'eight';
export type GridGradientShaderDebugMode =
    | 'off'
    | 'cell_grid'
    | 'owner_index'
    | 'distance_band'
    | 'flip_time'
    | 'role';

// Append to gridGradientFamilyConfigDefaults:
export const gridGradientShaderFieldConfigDefaults = {
    GRID_GRADIENT_DRAW_BACKEND: 'shader_field' as const,
    GRID_GRADIENT_SHADER_NEIGHBOR_MODE: 'eight' as const,
    GRID_GRADIENT_SHADER_RESOLUTION_SCALE: 1,
    GRID_GRADIENT_SHADER_MARK_SOFTNESS: 0.18,
    GRID_GRADIENT_SHADER_EDGE_SOFTNESS_PX: 0.85,
    GRID_GRADIENT_SHADER_NOISE_STRENGTH: 0.35,
    GRID_GRADIENT_SHADER_PULSE_STRENGTH: 0.06,
    GRID_GRADIENT_SHADER_PULSE_SPEED: 3.0,
    GRID_GRADIENT_SHADER_FIELD_DRIFT_PX: 0,
    GRID_GRADIENT_SHADER_FIELD_DRIFT_SPEED: 0.25,
    GRID_GRADIENT_SHADER_GLOW_STRENGTH: 0.08,
    GRID_GRADIENT_SHADER_BLUR_STRENGTH: 0,
    GRID_GRADIENT_SHADER_INTERIOR_ALPHA_BOOST: 1,
    GRID_GRADIENT_SHADER_EDGE_ALPHA_BOOST: 0.88,
    GRID_GRADIENT_SHADER_COLOR_MIX_POWER: 1,
    GRID_GRADIENT_SHADER_DEBUG_MODE: 'off' as const,
} as const;
