import { describe, expect, it } from 'vitest';
import {
    computeBoundaryInset,
    computeSharedBoundaryCornerRadius,
    trimOpenPolylineEndpoints,
} from './edgeShaping';

describe('computeSharedBoundaryCornerRadius', () => {
    it('preserves base corner radius when shared smoothing is off', () => {
        expect(
            computeSharedBoundaryCornerRadius({
                cellShape: 'square',
                baseCornerPx: 3,
                halfSizePx: 10,
                smoothingPasses: 0,
            }),
        ).toBe(3);
    });

    it('adds extra rounding for square boundary cells when shared smoothing is on', () => {
        expect(
            computeSharedBoundaryCornerRadius({
                cellShape: 'square',
                baseCornerPx: 0,
                halfSizePx: 10,
                smoothingPasses: 2,
            }),
        ).toBeGreaterThan(0);
    });

    it('does not force rounding onto non-square shapes', () => {
        expect(
            computeSharedBoundaryCornerRadius({
                cellShape: 'hex',
                baseCornerPx: 0,
                halfSizePx: 10,
                smoothingPasses: 3,
            }),
        ).toBe(0);
    });
});

describe('trimOpenPolylineEndpoints', () => {
    it('trims both ends of an open chain along the local tangent', () => {
        expect(trimOpenPolylineEndpoints([0, 0, 10, 0, 20, 0], 3)).toEqual([
            3,
            0,
            10,
            0,
            17,
            0,
        ]);
    });

    it('leaves short paths alone when there is not enough geometry to trim', () => {
        expect(trimOpenPolylineEndpoints([0, 0, 10, 0], 3)).toEqual([0, 0, 10, 0]);
    });
});

describe('computeBoundaryInset', () => {
    it('keeps boundary fill flush when explicit pullback is zero', () => {
        expect(
            computeBoundaryInset({
                insetMax: 12,
                cellInsetPx: 2,
                inwardOffsetPx: 0,
                edgeTrimPx: 3,
                flushBoundaryFill: true,
            }),
        ).toBe(0);
    });

    it('preserves legacy inherited inset behavior when flush mode is off', () => {
        expect(
            computeBoundaryInset({
                insetMax: 12,
                cellInsetPx: 2,
                inwardOffsetPx: 1,
                edgeTrimPx: 3,
                flushBoundaryFill: false,
            }),
        ).toBe(6);
    });
});
