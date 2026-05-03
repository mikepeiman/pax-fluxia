import type {
    CanonicalGeometrySnapshot,
    GeometryLayerInput,
    GeometryMode,
} from '../GeometryMode';
import { compileVectorGeometry } from '../compiler_UnifiedVectorGeometry';

export class CanonicalPowerVoronoiGeometryMode implements GeometryMode {
    readonly id = 'canonical_power_voronoi' as const;
    readonly label = 'Canonical Power Voronoi Geometry';

    compute(input: GeometryLayerInput): CanonicalGeometrySnapshot {
        return compileVectorGeometry(input, {
            sourceMode: 'canonical_power_voronoi',
        });
    }
}
