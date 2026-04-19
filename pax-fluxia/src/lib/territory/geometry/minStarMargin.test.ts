import { describe, expect, it } from 'vitest';
import { applyExplicitMinStarMargin, resolveAppliedMinStarMarginPx } from './minStarMargin';

describe('resolveAppliedMinStarMarginPx', () => {
    it('caps the requested margin at half the minimum inter-star distance', () => {
        expect(
            resolveAppliedMinStarMarginPx(
                [
                    { id: 'a', x: 0, y: 0, ownerId: 'A' } as any,
                    { id: 'b', x: 60, y: 0, ownerId: 'B' } as any,
                    { id: 'c', x: 200, y: 0, ownerId: 'C' } as any,
                ],
                40,
            ),
        ).toBe(30);
    });
});

describe('applyExplicitMinStarMargin', () => {
    it('pushes boundary vertices out to the applied minimum star margin', () => {
        const territories = [
            {
                ownerId: 'A',
                points: [
                    [10, 0],
                    [10, 10],
                    [0, 10],
                    [10, 0],
                ] as [number, number][],
            },
        ];
        const result = applyExplicitMinStarMargin(
            territories,
            [
                { id: 'a', x: 0, y: 0, ownerId: 'A' } as any,
                { id: 'b', x: 100, y: 0, ownerId: 'B' } as any,
            ],
            20,
        );

        expect(result.appliedMarginPx).toBe(20);
        expect(territories[0]!.points[0]![0]).toBeCloseTo(20, 5);
        expect(territories[0]!.points[0]![1]).toBeCloseTo(0, 5);
        expect(territories[0]!.points[1]![0]).toBeCloseTo(14.142135, 5);
        expect(territories[0]!.points[1]![1]).toBeCloseTo(14.142135, 5);
    });
});
