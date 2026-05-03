import type { GeometryMode } from './GeometryMode';
import { UnifiedVectorGeometryMode } from './modes/UnifiedVectorGeometryMode';

/**
 * Single geometry mode registry.
 * Legacy modes (PowerVoronoi, BoundaryAware, SeedGraph) have been removed.
 * All vector geometry goes through UnifiedVectorGeometryMode → compileVectorGeometry().
 */
const unifiedVectorGeometryMode = new UnifiedVectorGeometryMode();

export const GEOMETRY_MODES: readonly GeometryMode[] = [
    unifiedVectorGeometryMode,
];

export const GEOMETRY_MODE_BY_ID: ReadonlyMap<string, GeometryMode> =
    new Map([
        [unifiedVectorGeometryMode.id, unifiedVectorGeometryMode],
        // Preserve the PVV4 public geometry id while routing it through the
        // current unified vector compiler.
        ['canonical_power_voronoi', unifiedVectorGeometryMode],
    ]);
