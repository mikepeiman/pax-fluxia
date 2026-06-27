import type {
    GeometryLayerInput,
    GeometryMode,
    ResolvedGeometrySnapshot,
} from '../GeometryMode';
import { compileVectorGeometry } from '../compiler_UnifiedVectorGeometry';

export class PowerCoreCandidateGeometryMode implements GeometryMode {
    readonly id = 'power_core_candidate' as const;
    readonly label = 'Power Core Candidate';

    compute(input: GeometryLayerInput): ResolvedGeometrySnapshot {
        return compileVectorGeometry(input, {
            sourceMode: 'power_core_candidate',
        });
    }
}
