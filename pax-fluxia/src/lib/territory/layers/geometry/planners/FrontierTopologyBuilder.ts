import type {
    ResolvedFrontierPolyline,
    TerritoryRegionShape,
    SharedFrontierMap,
} from '../GeometryMode';
import type {
    TerritoryGeometryData,
} from '../../../compiler/powerVoronoiTerritoryGeometryGenerator';

export function buildTerritoryRegionShapes(
    geometry: TerritoryGeometryData,
): TerritoryRegionShape[] {
    return geometry.mergedTerritories.map((territory, index) => ({
        regionId: `legacy-region:${territory.ownerId}:${index}`,
        ownerId: territory.ownerId,
        starIds: [...territory.starIds],
        points: territory.points,
        confidence: 1,
    }));
}

export function buildFrontierPolylineShapes(
    geometry: TerritoryGeometryData,
): ResolvedFrontierPolyline[] {
    const all: ResolvedFrontierPolyline[] = [];
    for (const [index, polyline] of geometry.sharedPolylines.entries()) {
        all.push(buildResolvedPolyline('frontier', polyline.ownerPairKey, polyline.points, index));
    }
    for (const [index, polyline] of geometry.worldBorderPolylines.entries()) {
        all.push(buildResolvedPolyline('world-border', polyline.ownerPairKey, polyline.points, index));
    }
    return all;
}

export function buildSharedFrontierMap(
    polylines: readonly ResolvedFrontierPolyline[],
): SharedFrontierMap {
    const map = new Map<string, ResolvedFrontierPolyline[]>();
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

function buildResolvedPolyline(
    prefix: 'frontier' | 'world-border',
    ownerPairKey: string,
    points: [number, number][],
    index: number,
): ResolvedFrontierPolyline {
    const [ownerA = 'unknown', ownerB = '__world__'] = ownerPairKey.split('|');
    return {
        frontierId: `${prefix}:${ownerPairKey}:${index}`,
        ownerA,
        ownerB,
        ownerPairKey,
        points,
        confidence: 1,
    };
}
