import type {
    TerritoryFrontierBorderGeometryMode,
    TerritoryFrontierSurfaceGeometryFamily,
    TerritoryFrontierTechniqueId,
} from './types';

export type TerritoryFrontierSurfaceFillSource =
    | 'scene_cells'
    | 'phase_surface';

export type TerritoryFrontierSurfaceBorderSource =
    | 'shared_edge'
    | 'contour'
    | 'frontier_band';

export interface TerritoryFrontierSurfaceRecipe {
    readonly technique: TerritoryFrontierTechniqueId;
    readonly borderGeometryMode: TerritoryFrontierBorderGeometryMode;
    readonly geometryFamily: TerritoryFrontierSurfaceGeometryFamily;
    readonly stableGeometryFamily: TerritoryFrontierSurfaceGeometryFamily;
    readonly transitionGeometryFamily: TerritoryFrontierSurfaceGeometryFamily;
    readonly fillSource: TerritoryFrontierSurfaceFillSource;
    readonly borderSource: TerritoryFrontierSurfaceBorderSource;
    readonly usesBaseSceneBorders: boolean;
    readonly usesPhaseFill: boolean;
    readonly usesPhaseBorder: boolean;
    readonly invariantViolation: string | null;
}

export interface ResolveTerritoryFrontierSurfaceRecipeParams {
    readonly technique: TerritoryFrontierTechniqueId;
    readonly borderGeometryMode: TerritoryFrontierBorderGeometryMode;
}

export function resolveTerritoryFrontierSurfaceRecipe(
    params: ResolveTerritoryFrontierSurfaceRecipeParams,
): TerritoryFrontierSurfaceRecipe {
    const geometryFamily: TerritoryFrontierSurfaceGeometryFamily =
        params.technique === 'shader_frontier_band'
            ? 'phase_band'
            : params.technique === 'control'
              ? params.borderGeometryMode === 'contour_matched'
                    ? 'phase_contour'
                    : 'shared_edge'
              : 'phase_contour';

    const fillSource: TerritoryFrontierSurfaceFillSource =
        geometryFamily === 'phase_band' ? 'phase_surface' : 'scene_cells';
    const borderSource: TerritoryFrontierSurfaceBorderSource =
        geometryFamily === 'shared_edge'
            ? 'shared_edge'
            : geometryFamily === 'phase_band'
              ? 'frontier_band'
              : 'contour';
    const usesBaseSceneBorders = geometryFamily === 'shared_edge';
    const usesPhaseFill = geometryFamily === 'phase_band';
    const usesPhaseBorder = geometryFamily !== 'shared_edge';

    const stableGeometryFamily = geometryFamily;
    const transitionGeometryFamily = geometryFamily;
    const invariantViolation =
        stableGeometryFamily !== transitionGeometryFamily
            ? 'surface_geometry_family_mismatch'
            : null;

    return {
        technique: params.technique,
        borderGeometryMode: params.borderGeometryMode,
        geometryFamily,
        stableGeometryFamily,
        transitionGeometryFamily,
        fillSource,
        borderSource,
        usesBaseSceneBorders,
        usesPhaseFill,
        usesPhaseBorder,
        invariantViolation,
    };
}
