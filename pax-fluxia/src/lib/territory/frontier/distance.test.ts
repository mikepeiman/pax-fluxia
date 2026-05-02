import { describe, expect, it } from 'vitest';
import {
    buildOwnershipGridFrontierDistanceField,
    computeVisibleSquareBoundsFromDistance,
} from './distance';

describe('buildOwnershipGridFrontierDistanceField', () => {
    it('tracks multi-ring right-side distance from an ownership frontier', () => {
        const ownerIndexByCell = Int32Array.from([
            0, 0, 0, 1, 1,
        ]);
        const field = buildOwnershipGridFrontierDistanceField({
            cols: 5,
            rows: 1,
            ownerIndexByCell,
            spacingPx: 32,
            includeWorldEdge: false,
        });

        expect(field.rightDistancePxByCell[0]).toBe(64);
        expect(field.rightDistancePxByCell[1]).toBe(32);
        expect(field.rightDistancePxByCell[2]).toBe(0);
        expect(field.leftDistancePxByCell[3]).toBe(0);
        expect(field.leftDistancePxByCell[4]).toBe(32);
    });
});

describe('computeVisibleSquareBoundsFromDistance', () => {
    it('keeps flush first-ring boundary sides at zero inset when boundary offset is zero', () => {
        const ownerIndexByCell = Int32Array.from([0, 1]);
        const field = buildOwnershipGridFrontierDistanceField({
            cols: 2,
            rows: 1,
            ownerIndexByCell,
            spacingPx: 32,
            includeWorldEdge: true,
        });

        const bounds = computeVisibleSquareBoundsFromDistance({
            x: 16,
            y: 16,
            halfSizePx: 16,
            nativeInsetPx: 2,
            boundaryOffsetPx: 0,
            cellIndex: 0,
            distanceField: field,
        });

        expect(bounds).not.toBeNull();
        expect(bounds?.left).toBe(0);
        expect(bounds?.right).toBe(32);
    });

    it('propagates offset into deeper rows when the requested boundary offset exceeds one cell', () => {
        const ownerIndexByCell = Int32Array.from([
            0, 0, 0, 1,
        ]);
        const field = buildOwnershipGridFrontierDistanceField({
            cols: 4,
            rows: 1,
            ownerIndexByCell,
            spacingPx: 32,
            includeWorldEdge: false,
        });

        const secondRingBounds = computeVisibleSquareBoundsFromDistance({
            x: 48,
            y: 16,
            halfSizePx: 16,
            nativeInsetPx: 2,
            boundaryOffsetPx: 40,
            cellIndex: 1,
            distanceField: field,
        });

        expect(secondRingBounds).not.toBeNull();
        expect(secondRingBounds?.right).toBe(56);
        expect(secondRingBounds?.left).toBe(34);
    });
});
