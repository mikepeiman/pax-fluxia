import { computeGeometry0319 } from '../../../compiler/Geometry_0319';
import type { GeometryMode, GeometrySnapshot } from '../GeometryMode';
import { buildGeometryVersion } from '../planners/GeometryFingerprint';
import {
    buildFrontierPolylineShapes,
    buildTerritoryRegionShapes,
} from '../planners/FrontierTopologyBuilder';
import {
    buildGeneratorSettings,
    createEmptyTerritoryGeometryData,
    isCompileError,
} from './geometryModeUtils';

export class BoundaryAwareFrontierGeometryMode implements GeometryMode {
    readonly id = 'boundary_aware_frontier' as const;
    readonly label = 'Boundary-Constrained Frontier Geometry';

    compute(input: Parameters<GeometryMode['compute']>[0]): GeometrySnapshot {
        const settings = buildGeneratorSettings(input.world, input.tunables);
        const version = buildGeometryVersion(
            this.id,
            input.stars,
            settings,
            input.ownership.version,
        );

        const result = computeGeometry0319(
            [...input.stars],
            [...input.lanes],
            settings,
        );

        const geometry = isCompileError(result)
            ? input.previousSnapshot?.territoryGeometry ??
              createEmptyTerritoryGeometryData(`${version}:empty`)
            : result;

        return {
            version,
            sourceMode: this.id,
            sourceStyle: input.styleMode,
            ownershipVersion: input.ownership.version,
            territoryGeometry: geometry,
            territoryRegions: buildTerritoryRegionShapes(geometry),
            frontierPolylines: buildFrontierPolylineShapes(geometry),
        };
    }
}
