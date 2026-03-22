import type { GeometryMode } from './GeometryMode';
import { BoundaryConstrainedFrontierGeometryMode } from './modes/BoundaryConstrainedFrontierGeometryMode';
import { SeedGraphClusterSplitGeometryMode } from './modes/SeedGraphClusterSplitGeometryMode';
import { WeightedPowerVoronoiGeometryMode } from './modes/WeightedPowerVoronoiGeometryMode';

export const GEOMETRY_MODES: readonly GeometryMode[] = [
    new WeightedPowerVoronoiGeometryMode(),
    new BoundaryConstrainedFrontierGeometryMode(),
    new SeedGraphClusterSplitGeometryMode(),
];

export const GEOMETRY_MODE_BY_ID: ReadonlyMap<GeometryMode['id'], GeometryMode> =
    new Map(GEOMETRY_MODES.map((mode) => [mode.id, mode]));
