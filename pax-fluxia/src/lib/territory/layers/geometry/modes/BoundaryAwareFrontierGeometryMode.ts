import type { GeometryLayerInput, ResolvedGeometrySnapshot } from '../GeometryMode';
import { compileVectorGeometry } from '../compiler_UnifiedVectorGeometry';

/**
 * Deprecated compatibility wrapper for the removed pre-unification mode.
 * The runtime registry no longer dispatches this mode; old imports delegate
 * into the single unified vector compiler.
 */
export class BoundaryAwareFrontierGeometryMode {
    readonly id = 'boundary_aware_frontier' as const;
    readonly label = 'Boundary-Constrained Frontier Geometry';

    compute(input: GeometryLayerInput): ResolvedGeometrySnapshot {
        return compileVectorGeometry(input);
    }
}
