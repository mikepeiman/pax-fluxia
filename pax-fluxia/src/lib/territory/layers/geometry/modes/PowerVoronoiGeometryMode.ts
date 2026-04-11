import type { GeometryLayerInput, CanonicalGeometrySnapshot } from '../GeometryMode';
import { compileVectorGeometry } from '../compiler_UnifiedVectorGeometry';

/**
 * Deprecated compatibility wrapper for the removed pre-unification mode.
 * The runtime registry no longer dispatches this mode; old imports delegate
 * into the single canonical unified vector compiler.
 */
export class PowerVoronoiGeometryMode {
    readonly id = 'power_voronoi' as const;
    readonly label = 'Weighted Power Voronoi Geometry';

    compute(input: GeometryLayerInput): CanonicalGeometrySnapshot {
        return compileVectorGeometry(input);
    }
}
