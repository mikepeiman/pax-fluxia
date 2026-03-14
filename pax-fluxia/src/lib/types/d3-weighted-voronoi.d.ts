declare module 'd3-weighted-voronoi' {
    export interface WeightedVoronoiGenerator<T = any> {
        (data: T[]): (number[][] & { site: { originalObject: T } })[];
        x(): (d: T) => number;
        x(fn: (d: T) => number): this;
        y(): (d: T) => number;
        y(fn: (d: T) => number): this;
        weight(): (d: T) => number;
        weight(fn: (d: T) => number): this;
        clip(): [number, number][];
        clip(polygon: [number, number][]): this;
        extent(): [[number, number], [number, number]];
        extent(extent: [[number, number], [number, number]]): this;
        size(): [number, number];
        size(size: [number, number]): this;
    }
    export function weightedVoronoi<T = any>(): WeightedVoronoiGenerator<T>;
}
