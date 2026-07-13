import { describe, expect, it } from 'vitest';
import {
    shoelace,
    signedArea,
    polygonArea,
    chaikinSmoothPolyline,
    chaikinSmoothPolygon,
    chaikinFlat,
} from './index';

// A unit CCW square (area 1, signed +1, shoelace +2).
const SQUARE: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
const SQUARE_CW: [number, number][] = [[0, 0], [0, 1], [1, 1], [1, 0]];

describe('kernel/polygonArea', () => {
    it('shoelace = twice signed area, sign encodes winding', () => {
        expect(shoelace(SQUARE)).toBe(2);
        expect(shoelace(SQUARE_CW)).toBe(-2);
    });
    it('signedArea = shoelace/2', () => {
        expect(signedArea(SQUARE)).toBe(1);
        expect(signedArea(SQUARE_CW)).toBe(-1);
    });
    it('polygonArea is unsigned', () => {
        expect(polygonArea(SQUARE)).toBe(1);
        expect(polygonArea(SQUARE_CW)).toBe(1);
    });
    it('degenerate (<3 pts) → 0', () => {
        expect(polygonArea([[0, 0], [1, 1]])).toBe(0);
        expect(polygonArea([])).toBe(0);
    });
});

describe('kernel/chaikin', () => {
    it('polyline preserves endpoints, cuts interior corners', () => {
        const line: [number, number][] = [[0, 0], [10, 0], [10, 10]];
        const out = chaikinSmoothPolyline(line, 1);
        expect(out[0]).toEqual([0, 0]);
        expect(out[out.length - 1]).toEqual([10, 10]);
        expect(out.length).toBeGreaterThan(line.length);
    });
    it('polygon default args = plain uniform corner-cut (no pinning)', () => {
        const out = chaikinSmoothPolygon(SQUARE.slice() as [number, number][], 1);
        // 4 verts → 8 cut points, none preserved (unbounded, no pins)
        expect(out.length).toBe(8);
    });
    it('polygon pins world-boundary vertices', () => {
        // pad default 50, so x=-50 is on the padded boundary → pinned (preserved)
        const pts: [number, number][] = [[-50, -50], [100, -50], [100, 100], [-50, 100]];
        const out = chaikinSmoothPolygon(pts.slice() as [number, number][], 1, 200, 200);
        expect(out).toContainEqual([-50, -50]);
    });
    it('flat form: closed=false preserves ends, closed=true wraps', () => {
        const flat = [0, 0, 10, 0, 10, 10];
        const open = chaikinFlat(flat, 1, false);
        expect([open[0], open[1]]).toEqual([0, 0]);
        expect([open[open.length - 2], open[open.length - 1]]).toEqual([10, 10]);
        const closed = chaikinFlat(flat, 1, true);
        expect(closed.length).toBe(12); // 3 verts × 2 cut pts × 2 coords
    });
});
