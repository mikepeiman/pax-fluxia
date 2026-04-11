import type { GeometryLayerInput, CanonicalGeometrySnapshot } from '../GeometryMode';
import { compileVectorGeometry } from '../compiler_UnifiedVectorGeometry';

/**
 * Deprecated compatibility wrapper for the removed pre-unification mode.
 * The runtime registry no longer dispatches this mode; old imports delegate
 * into the single canonical unified vector compiler.
 */
export class BoundaryAwareFrontierGeometryMode {
    readonly id = 'boundary_aware_frontier' as const;
    readonly label = 'Boundary-Constrained Frontier Geometry';

    compute(input: GeometryLayerInput): CanonicalGeometrySnapshot {
        return compileVectorGeometry(input);
    }
}
