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
    // Include BOTH inter-owner shared polylines AND world-boundary polylines.
    // The compiler produces both: sharedPolylines (Red↔Blue borders) and
    // worldBorderPolylines (Red↔world edges). Both are needed for complete
    // border rendering.
    const all: FrontierPolylineShape[] = [];
    for (const polyline of geometry.sharedPolylines) {
        all.push({ ownerPairKey: polyline.ownerPairKey, points: polyline.points });
    }
    for (const polyline of geometry.worldBorderPolylines) {
        all.push({ ownerPairKey: polyline.ownerPairKey, points: polyline.points });
    }
    return all;
}

export function buildSharedFrontierMap(
    polylines: readonly FrontierPolylineShape[],
): SharedFrontierMap {
    // D-90: ownerPairKey is NOT unique — two owners can share multiple
    // disconnected border segments. Accumulate arrays, never overwrite.
    const map = new Map<string, FrontierPolylineShape[]>();
    for (const p of polylines) {
        const arr = map.get(p.ownerPairKey);
        if (arr) {
            arr.push(p);
        } else {
            map.set(p.ownerPairKey, [p]);
        }
    }
    return map;
}
