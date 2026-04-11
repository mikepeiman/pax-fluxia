import type { GeometryLayerInput, CanonicalGeometrySnapshot } from '../GeometryMode';
import { compileVectorGeometry } from '../compiler_UnifiedVectorGeometry';

/**
 * Deprecated compatibility wrapper for the removed pre-unification mode.
 * The runtime registry no longer dispatches this mode; old imports delegate
 * into the single canonical unified vector compiler.
 */
export class SeedGraphGeometryMode {
    readonly id = 'seed_graph' as const;
    readonly label = 'Seed-Graph Cluster-Split Geometry';

    compute(input: GeometryLayerInput): CanonicalGeometrySnapshot {
        return compileVectorGeometry(input);
    }
}
