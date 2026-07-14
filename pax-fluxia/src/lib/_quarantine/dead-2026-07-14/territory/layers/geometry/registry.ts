import type { GeometryMode } from './GeometryMode';
import { ResolvedPowerVoronoiGeometryMode } from './modes/ResolvedPowerVoronoiGeometryMode';
import { UnifiedVectorGeometryMode } from './modes/UnifiedVectorGeometryMode';

/**
 * Single geometry mode registry.
 * Legacy modes (PowerVoronoi, BoundaryAware, SeedGraph) have been removed.
 * All vector geometry goes through UnifiedVectorGeometryMode → compileVectorGeometry().
 */
export const GEOMETRY_MODES: readonly GeometryMode[] = [
    new UnifiedVectorGeometryMode(),
    new ResolvedPowerVoronoiGeometryMode(),
];

export const GEOMETRY_MODE_BY_ID: ReadonlyMap<GeometryMode['id'], GeometryMode> =
    new Map(GEOMETRY_MODES.map((mode) => [mode.id, mode]));
