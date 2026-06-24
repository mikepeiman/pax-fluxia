export const metaballGridFamilyConfigDefaults = {
    CELL_GRID_ENABLED: true,
    CELL_GRID_SPACING_PX: 12,
    CELL_GRID_PATTERN_SPACING_PX: 64,
    CELL_GRID_ORIGIN_MODE: 'centered' as const,
    CELL_GRID_DISTRIBUTION: 'square' as const,
    CELL_GRID_POSITION_JITTER: 0,
    CELL_GRID_MAX_CELLS: 0,
    CELL_GRID_INWARD_OFFSET_PX: 0,
    CELL_GRID_BOUNDARY_FILL_FLUSH: false,
    CELL_GRID_CELL_SHAPE: 'square' as const,
    CELL_GRID_CELL_INSET_PX: 0,
    CELL_GRID_CELL_CORNER_PX: 0,
    CELL_GRID_BORDER_MODE: 'territory_edge' as const,
    CELL_GRID_BORDER_BLEND: true,
    CELL_GRID_EDGE_SMOOTHING_PASSES: 0,
    CELL_GRID_EDGE_TRIM_PX: 0,
    CELL_GRID_BORDER_CHAIKIN_PASSES: 4,
    CELL_GRID_ADJACENCY: '8' as const,
    CELL_GRID_WAVE_GEOMETRY: 'euclidean_band' as const,
    CELL_GRID_WAVE_SEEDING: 'winner_natives' as const,
    // Smooth gameplay default: always crossfade ownership during conquest
    // instead of hard-flipping cells frame-by-frame.
    CELL_GRID_FLIP_TRANSITION: 'dual_pass_blend' as const,
    CELL_GRID_FLIP_WINDOW: 0.14,
    CELL_GRID_WAVE_EASE: 'ease_in_out' as const,
    CELL_GRID_FLIP_WINDOW_JITTER: 0.275,
    CELL_GRID_PHASE_FIELD_FINISH_FADE_START: 0.82,
    CELL_GRID_PHASE_FIELD_FINISH_FADE_END: 1,
    CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_START: 0.72,
    CELL_GRID_PHASE_FIELD_SIZE_COLLAPSE_END: 1,
    CELL_GRID_PHASE_FIELD_FINAL_CELL_SIZE_PX: 1,
    CELL_GRID_PHASE_FIELD_FRONTIER_HIGHLIGHT: true,
    CELL_GRID_PHASE_FIELD_FRONTIER_FADE_START: 0.8,
    CELL_GRID_PHASE_FIELD_FRONTIER_FADE_END: 0.96,
} as const;

export const metaballGridPhaseEdgesModeDefaults = {
    CELL_GRID_WAVE_GEOMETRY: 'pre_to_post_frontier' as const,
    CELL_GRID_BORDER_MODE: 'territory_edge' as const,
    CELL_GRID_BORDER_BLEND: true,
    CELL_GRID_EDGE_SMOOTHING_PASSES: 0,
    CELL_GRID_EDGE_TRIM_PX: 0,
    CELL_GRID_BORDER_CHAIKIN_PASSES: 4,
    CELL_GRID_BOUNDARY_FILL_FLUSH: true,
    TERRITORY_FRONTIER_BORDER_GEOMETRY_MODE: 'contour_matched' as const,
    TERRITORY_FRONTIER_OUTER_BORDER_ENABLED: true,
} as const;

export const metaballGridPhaseEdgesGeometryDefaults = {
    MODIFIED_VORONOI_DISCONNECT_ENABLED: true,
    MODIFIED_VORONOI_DISCONNECT_DISTANCE: 295,
    TERRITORY_DX_WEIGHT: 0.3,
} as const;

export const metaballGridPhaseFieldModeDefaults = {
    CELL_GRID_WAVE_GEOMETRY: 'pre_to_post_frontier' as const,
    CELL_GRID_PATTERN_SPACING_PX: 64,
    CELL_GRID_BORDER_MODE: 'territory_edge' as const,
    CELL_GRID_BORDER_BLEND: true,
    CELL_GRID_EDGE_SMOOTHING_PASSES: 0,
    CELL_GRID_EDGE_TRIM_PX: 0,
    CELL_GRID_BORDER_CHAIKIN_PASSES: 4,
} as const;

export const metaballGridPhaseFieldGeometryDefaults = {
    MODIFIED_VORONOI_DISCONNECT_ENABLED: true,
    MODIFIED_VORONOI_DISCONNECT_DISTANCE: 295,
    TERRITORY_DX_WEIGHT: 0.3,
} as const;
