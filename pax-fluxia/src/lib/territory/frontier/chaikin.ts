import type {
    TerritoryFrontierContourLayerResult,
    TerritoryFrontierPolyline,
} from './types';

function chaikinOnce(points: readonly number[], closed: boolean): number[] {
    const vertexCount = points.length >> 1;
    if (vertexCount < 3) return points.slice();
    const output: number[] = [];
    const limit = closed ? vertexCount : vertexCount - 1;
    if (!closed) {
        output.push(points[0], points[1]);
    }
    for (let index = 0; index < limit; index++) {
        const a = index * 2;
        const b = ((index + 1) % vertexCount) * 2;
        const x0 = points[a];
        const y0 = points[a + 1];
        const x1 = points[b];
        const y1 = points[b + 1];
        output.push(
            x0 + (x1 - x0) * 0.25,
            y0 + (y1 - y0) * 0.25,
            x0 + (x1 - x0) * 0.75,
            y0 + (y1 - y0) * 0.75,
        );
    }
    if (!closed) {
        output.push(points[points.length - 2], points[points.length - 1]);
    }
    return output;
}

export function smoothTerritoryFrontierPolyline(
    polyline: TerritoryFrontierPolyline,
    passes: number,
): TerritoryFrontierPolyline {
    if (passes <= 0) return polyline;
    let points = polyline.points.slice();
    for (let pass = 0; pass < passes; pass++) {
        points = chaikinOnce(points, polyline.closed);
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
