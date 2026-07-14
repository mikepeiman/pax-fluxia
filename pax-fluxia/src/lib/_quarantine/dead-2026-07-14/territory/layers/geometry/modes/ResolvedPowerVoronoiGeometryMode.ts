import type {
    ResolvedGeometrySnapshot,
    GeometryLayerInput,
    GeometryMode,
} from '../GeometryMode';
import { compileVectorGeometry } from '../compiler_UnifiedVectorGeometry';

export class ResolvedPowerVoronoiGeometryMode implements GeometryMode {
    readonly id = 'resolved_power_voronoi' as const;
    readonly label = 'Resolved Power Voronoi Geometry';

    compute(input: GeometryLayerInput): ResolvedGeometrySnapshot {
        return compileVectorGeometry(input, {
            sourceMode: 'resolved_power_voronoi',
        });
    }
}
