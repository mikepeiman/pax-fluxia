export type TerritoryFrontierTechniqueId =
    | 'control'
    | 'shader_frontier_band'
    | 'marching_squares_midpoint'
    | 'marching_squares_scalar'
    | 'marching_triangles_fixed'
    | 'marching_triangles_checkerboard'
    | 'marching_triangles_gradient';

export type TerritoryFrontierContourTechniqueId =
    | 'marching_squares_midpoint'
    | 'marching_squares_scalar'
    | 'marching_triangles_fixed'
    | 'marching_triangles_checkerboard'
    | 'marching_triangles_gradient';

export type TerritoryFrontierPhaseSamplingMode = 'nearest' | 'linear';

export type TerritoryFrontierBorderGeometryMode =
    | 'shared_edge'
    | 'contour_matched';

export type TerritoryFrontierSurfaceGeometryFamily =
    | 'shared_edge'
    | 'phase_contour'
    | 'phase_band';

export type TerritoryFrontierTriangleDiagonalPolicy =
    | 'fixed'
    | 'checkerboard'
    | 'gradient';

export interface TerritoryFrontierPhaseFieldLayer {
    readonly id: string;
    readonly label: string;
    readonly cols: number;
    readonly rows: number;
    readonly originX: number;
    readonly originY: number;
    readonly cellSizePx: number;
    readonly threshold: number;
    readonly values: Float32Array;
    readonly ownerIndexByCell: Int32Array;
    readonly validMask?: Uint8Array;
    readonly ownerIndex?: number;
    readonly opposingOwnerIndex?: number | null;
}

export interface TerritoryFrontierPhaseFieldPayload {
    readonly layers: readonly TerritoryFrontierPhaseFieldLayer[];
}

export interface TerritoryFrontierPolyline {
    readonly points: number[];
    readonly closed: boolean;
}

export interface TerritoryFrontierContourLayerResult {
    readonly id: string;
    readonly label: string;
    readonly ownerIndex?: number;
    readonly opposingOwnerIndex?: number | null;
    readonly threshold: number;
    readonly polylines: readonly TerritoryFrontierPolyline[];
    readonly segmentCount: number;
    readonly vertexCount: number;
}

export interface TerritoryFrontierContourRequest {
    readonly phaseField: TerritoryFrontierPhaseFieldPayload;
    readonly technique: TerritoryFrontierContourTechniqueId;
    readonly triangleDiagonalPolicy: TerritoryFrontierTriangleDiagonalPolicy;
}

export interface TerritoryFrontierContourResult {
    readonly technique: TerritoryFrontierContourTechniqueId;
    readonly layers: readonly TerritoryFrontierContourLayerResult[];
    readonly polylineCount: number;
    readonly vertexCount: number;
    readonly segmentCount: number;
}

export interface TerritoryFrontierPresentationMetrics {
    readonly phaseLayerCount: number;
    readonly phaseGridCols: number;
    readonly phaseGridRows: number;
    readonly blurMs: number;
    readonly contourExtractionMs: number;
    readonly smoothingMs: number;
    readonly polylineCount: number;
    readonly emittedVertexCount: number;
}

export interface TerritoryFrontierPresentationAdapterResult {
    readonly technique: TerritoryFrontierTechniqueId;
    readonly phaseField: TerritoryFrontierPhaseFieldPayload;
    readonly fillLayers: readonly TerritoryFrontierPhaseFieldLayer[];
    readonly frontierBandLayers: readonly TerritoryFrontierPhaseFieldLayer[];
    readonly contourLayers: readonly TerritoryFrontierContourLayerResult[];
    readonly outlineLayers: readonly TerritoryFrontierContourLayerResult[];
    readonly glowLayers: readonly TerritoryFrontierContourLayerResult[];
    readonly metrics: TerritoryFrontierPresentationMetrics;
}

export type TerritoryFrontierBenchmarkPresetId =
    | 'current_control'
    | 'shader_linear'
    | 'shader_linear_blur'
    | 'marching_squares_midpoint'
    | 'marching_squares_scalar'
    | 'marching_squares_scalar_chaikin_1'
    | 'marching_squares_scalar_blur_chaikin_1'
    | 'marching_triangles_fixed'
    | 'marching_triangles_checkerboard'
    | 'marching_triangles_gradient';
