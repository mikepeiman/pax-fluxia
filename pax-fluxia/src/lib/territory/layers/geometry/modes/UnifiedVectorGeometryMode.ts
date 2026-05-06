/**
 * @file UnifiedVectorGeometryMode.ts
 *
 * Single vector-native geometry mode — delegates entirely to the
 * resolved geometry compiler (compileVectorGeometry).
 *
 * Layer: Geometry (Layer 2)
 * PIXI imports: NEVER
 */

import type { GeometryMode, GeometryLayerInput, ResolvedGeometrySnapshot } from '../GeometryMode';
import { compileVectorGeometry } from '../compiler_UnifiedVectorGeometry';

export class UnifiedVectorGeometryMode implements GeometryMode {
    readonly id = 'unified_vector' as const;
    readonly label = 'Unified Vector Geometry';

    compute(input: GeometryLayerInput): ResolvedGeometrySnapshot {
        return compileVectorGeometry(input);
    }
}
