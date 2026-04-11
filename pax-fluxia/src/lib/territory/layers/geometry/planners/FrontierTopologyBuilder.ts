import type {
    CanonicalFrontierPolyline,
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
        points: territory.points,
        confidence: 1,
    }));
}

export function buildFrontierPolylineShapes(
    geometry: TerritoryGeometryData,
): CanonicalFrontierPolyline[] {
    const all: CanonicalFrontierPolyline[] = [];
    for (const [index, polyline] of geometry.sharedPolylines.entries()) {
        all.push(buildCanonicalPolyline('frontier', polyline.ownerPairKey, polyline.points, index));
    }
    for (const [index, polyline] of geometry.worldBorderPolylines.entries()) {
        all.push(buildCanonicalPolyline('world-border', polyline.ownerPairKey, polyline.points, index));
    }
    return all;
}

export function buildSharedFrontierMap(
    polylines: readonly CanonicalFrontierPolyline[],
): SharedFrontierMap {
    const map = new Map<string, CanonicalFrontierPolyline[]>();
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

function buildCanonicalPolyline(
    prefix: 'frontier' | 'world-border',
    ownerPairKey: string,
    points: [number, number][],
    index: number,
): CanonicalFrontierPolyline {
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
