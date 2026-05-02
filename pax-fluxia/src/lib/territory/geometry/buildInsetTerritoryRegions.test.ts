import { describe, expect, it } from 'vitest';
import type { TerritoryRegionShape } from '../contracts/GeometryContracts';
import { pointInPolygon } from './geometryUtils';
import { buildInsetTerritoryRegions } from './buildInsetTerritoryRegions';

function makeRegion(
    ownerId: string,
    points: ReadonlyArray<[number, number]>,
): TerritoryRegionShape {
    return {
        regionId: `region:${ownerId}`,
        ownerId,
        points: points.map(([x, y]) => [x, y] as [number, number]),
        confidence: 1,
    };
}

function bounds(points: ReadonlyArray<[number, number]>): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
} {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, y] of points) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    }
    return { minX, maxX, minY, maxY };
}

describe('buildInsetTerritoryRegions', () => {
    it('returns the original regions when inset is zero', () => {
        const regions = [
            makeRegion('blue', [
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
            ]),
        ];

        const inset = buildInsetTerritoryRegions({
            territoryRegions: regions,
            insetPx: 0,
        });

        expect(inset).toBe(regions);
    });

    it('contracts a simple square by the requested inset distance', () => {
        const source = makeRegion('blue', [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
        ]);

        const inset = buildInsetTerritoryRegions({
            territoryRegions: [source],
            insetPx: 2,
            sampleSpacingPx: 4,
        });

        expect(inset).toHaveLength(1);
        const ring = inset[0]!.points;
        const box = bounds(ring);
        expect(box.minX).toBeGreaterThan(1.3);
        expect(box.maxX).toBeLessThan(8.7);
        expect(box.minY).toBeGreaterThan(1.3);
        expect(box.maxY).toBeLessThan(8.7);
    });

    it('keeps inset points inside the resolved source region', () => {
        const source = makeRegion('green', [
            [0, 0],
            [14, 0],
            [14, 4],
            [8, 4],
            [8, 12],
            [0, 12],
        ]);

        const inset = buildInsetTerritoryRegions({
            territoryRegions: [source],
            insetPx: 2,
            sampleSpacingPx: 4,
        });

        expect(inset).toHaveLength(1);
        for (const [x, y] of inset[0]!.points) {
            expect(pointInPolygon(x, y, source.points)).toBe(true);
        }
    });
});
