export type GridGradientCellShape = 'circle' | 'square' | 'noise';
export type GridGradientBorderDotStyle = 'blended' | 'butted';

export const gridGradientFamilyConfigDefaults = {
    GRID_GRADIENT_ENABLED: true,
    GRID_GRADIENT_SPACING_PX: 6,
    GRID_GRADIENT_MAX_CELLS: 160000,
    GRID_GRADIENT_ORIGIN_MODE: 'centered' as const,
    GRID_GRADIENT_DISTRIBUTION: 'square' as const,
    GRID_GRADIENT_POSITION_JITTER: 0,
    GRID_GRADIENT_CENTER_SIZE_PX: 10,
    GRID_GRADIENT_EDGE_SIZE_PX: 1.5,
    GRID_GRADIENT_CURVE_POWER: 1.6,
    GRID_GRADIENT_BORDER_OFFSET_PX: 0,
    GRID_GRADIENT_CELL_SHAPE: 'circle' as const,
    GRID_GRADIENT_VECTOR_BORDERS_ENABLED: true,
    GRID_GRADIENT_BORDER_DOTS_ENABLED: false,
    GRID_GRADIENT_BORDER_DOT_SIZE_PX: 2.5,
    GRID_GRADIENT_BORDER_DOT_STYLE: 'blended' as const,
} as const;
