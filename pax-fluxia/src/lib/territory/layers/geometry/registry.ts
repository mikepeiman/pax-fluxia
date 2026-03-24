import type { GeometryMode } from './GeometryMode';
import { UnifiedVectorGeometryMode } from './modes/UnifiedVectorGeometryMode';
import { BoundaryConstrainedFrontierGeometryMode } from './modes/BoundaryConstrainedFrontierGeometryMode';
import { SeedGraphClusterSplitGeometryMode } from './modes/SeedGraphClusterSplitGeometryMode';
import { WeightedPowerVoronoiGeometryMode } from './modes/WeightedPowerVoronoiGeometryMode';

export const GEOMETRY_MODES: readonly GeometryMode[] = [
    new UnifiedVectorGeometryMode(),
    // Legacy modes — kept for backwards compatibility, will be removed in Phase 4
    new WeightedPowerVoronoiGeometryMode(),
    new BoundaryConstrainedFrontierGeometryMode(),
    new SeedGraphClusterSplitGeometryMode(),
];

export const GEOMETRY_MODE_BY_ID: ReadonlyMap<GeometryMode['id'], GeometryMode> =
    new Map(GEOMETRY_MODES.map((mode) => [mode.id, mode]));

