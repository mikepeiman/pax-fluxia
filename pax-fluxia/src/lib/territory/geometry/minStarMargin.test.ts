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
    it('rewrites intrusive runs so every resulting point stays outside the applied margin', () => {
        const originalPointCount = 8;
        const territories = [
            {
                ownerId: 'A',
                points: [
                    [40, -30],
                    [12, -8],
                    [8, 0],
                    [12, 8],
                    [40, 30],
                    [80, 30],
                    [80, -30],
                    [40, -30],
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
        expect(territories[0]!.points.length).toBeGreaterThan(originalPointCount);
        for (const [x, y] of territories[0]!.points) {
            expect(Math.hypot(x, y)).toBeGreaterThanOrEqual(19.999);
        }
    });
});
