export const metaballGridFamilyConfigDefaults = {
    METABALL_GRID_ENABLED: true,
    METABALL_GRID_SPACING_PX: 32,
    METABALL_GRID_ORIGIN_MODE: 'centered' as const,
    METABALL_GRID_DISTRIBUTION: 'square' as const,
    METABALL_GRID_POSITION_JITTER: 0,
    METABALL_GRID_MAX_CELLS: 0,
    METABALL_GRID_INWARD_OFFSET_PX: 0,
    METABALL_GRID_CELL_SHAPE: 'square' as const,
    METABALL_GRID_CELL_INSET_PX: 0,
    METABALL_GRID_CELL_CORNER_PX: 0,
    METABALL_GRID_BORDER_MODE: 'off' as const,
    METABALL_GRID_BORDER_BLEND: false,
    METABALL_GRID_BORDER_CHAIKIN_PASSES: 0,
    METABALL_GRID_ADJACENCY: '8' as const,
    METABALL_GRID_WAVE_GEOMETRY: 'grid_bfs' as const,
    METABALL_GRID_WAVE_SEEDING: 'winner_natives' as const,
    // Smooth gameplay default: always crossfade ownership during conquest
    // instead of hard-flipping cells frame-by-frame.
    METABALL_GRID_FLIP_TRANSITION: 'dual_pass_blend' as const,
    METABALL_GRID_FLIP_WINDOW: 0.14,
    METABALL_GRID_WAVE_EASE: 'ease_in_out' as const,
    METABALL_GRID_FLIP_WINDOW_JITTER: 0,
} as const;
