import type {
    TerritoryFrontierContourLayerResult,
    TerritoryFrontierPolyline,
} from './types';
import { chaikinFlatOnce } from '../geometry/kernel';

export function smoothTerritoryFrontierPolyline(
    polyline: TerritoryFrontierPolyline,
    passes: number,
): TerritoryFrontierPolyline {
    if (passes <= 0) return polyline;
    let points = polyline.points.slice();
    for (let pass = 0; pass < passes; pass++) {
        points = chaikinFlatOnce(points, polyline.closed);
    }
    return {
        ...polyline,
        points,
    };
}

export function smoothTerritoryFrontierContourLayers(
    layers: readonly TerritoryFrontierContourLayerResult[],
    passes: number,
): TerritoryFrontierContourLayerResult[] {
    if (passes <= 0) return layers.map((layer) => ({ ...layer }));
    return layers.map((layer) => {
        const polylines = layer.polylines.map((polyline) =>
            smoothTerritoryFrontierPolyline(polyline, passes),
        );
        const vertexCount = polylines.reduce(
            (total, polyline) => total + (polyline.points.length >> 1),
            0,
        );
        return {
            ...layer,
            polylines,
            vertexCount,
        };
    });
}
