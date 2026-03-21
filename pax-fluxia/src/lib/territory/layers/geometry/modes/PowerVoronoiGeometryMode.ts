import { generateVoronoiTerritoryGeometry } from '../../../compiler/powerVoronoiTerritoryGeometryGenerator';
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

export class PowerVoronoiGeometryMode implements GeometryMode {
    readonly id = 'power_voronoi' as const;
    readonly label = 'Power Voronoi Geometry';

    compute(input: Parameters<GeometryMode['compute']>[0]): GeometrySnapshot {
        const settings = buildGeneratorSettings(input.world, input.tunables);
        const version = buildGeometryVersion(
            this.id,
            input.stars,
            settings,
            input.ownership.version,
        );

        const result = generateVoronoiTerritoryGeometry(
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
