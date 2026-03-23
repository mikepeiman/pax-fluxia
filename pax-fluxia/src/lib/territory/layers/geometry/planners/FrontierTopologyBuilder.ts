import type {
    FrontierPolylineShape,
    TerritoryRegionShape,
    SharedFrontierMap,
} from '../GeometryMode';
import type {
    TerritoryGeometryData,
} from '../../../compiler/powerVoronoiTerritoryGeometryGenerator';

export function buildTerritoryRegionShapes(
    geometry: TerritoryGeometryData,
): TerritoryRegionShape[] {
    return geometry.mergedTerritories.map((territory) => ({
        ownerId: territory.ownerId,
        points: territory.points,
    }));
}

export function buildFrontierPolylineShapes(
    geometry: TerritoryGeometryData,
): FrontierPolylineShape[] {
    return geometry.sharedPolylines.map((polyline) => ({
        ownerPairKey: polyline.ownerPairKey,
        points: polyline.points,
    }));
}

export function buildSharedFrontierMap(
    polylines: readonly FrontierPolylineShape[],
): SharedFrontierMap {
    const map = new Map<string, FrontierPolylineShape>();
    for (const p of polylines) {
        map.set(p.ownerPairKey, p);
    }
    return map;
}
