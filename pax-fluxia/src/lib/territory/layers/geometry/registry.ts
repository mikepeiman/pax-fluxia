import type { GeometryMode } from './GeometryMode';
import { BoundaryAwareFrontierGeometryMode } from './modes/BoundaryAwareFrontierGeometryMode';
import { PowerVoronoiGeometryMode } from './modes/PowerVoronoiGeometryMode';
import { SeedGraphGeometryMode } from './modes/SeedGraphGeometryMode';

export const GEOMETRY_MODES: readonly GeometryMode[] = [
    new PowerVoronoiGeometryMode(),
    new BoundaryAwareFrontierGeometryMode(),
    new SeedGraphGeometryMode(),
];

export const GEOMETRY_MODE_BY_ID: ReadonlyMap<GeometryMode['id'], GeometryMode> =
    new Map(GEOMETRY_MODES.map((mode) => [mode.id, mode]));
