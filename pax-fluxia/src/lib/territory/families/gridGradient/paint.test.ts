import { describe, expect, it } from 'vitest';
import { buildGridGradientVectorBorderChains } from './paint';

describe('buildGridGradientVectorBorderChains', () => {
    it('joins touching sections for the same owner pair into one stroke chain', () => {
        const chains = buildGridGradientVectorBorderChains([
            {
                ownerA: 'red',
                ownerB: 'blue',
                ownerPairKey: 'red|blue',
                points: [
                    [0, 0],
                    [10, 0],
                ],
            },
            {
                ownerA: 'blue',
                ownerB: 'red',
                ownerPairKey: 'blue|red',
                points: [
                    [10, 0],
                    [20, 0],
                ],
            },
        ]);

        expect(chains).toHaveLength(1);
        expect(chains[0]?.ownerPairKey).toBe('blue|red');
        expect(chains[0]?.ownerA).toBe('blue');
        expect(chains[0]?.ownerB).toBe('red');
        expect(chains[0]?.points).toEqual([
            [0, 0],
            [10, 0],
            [20, 0],
        ]);
    });

    it('keeps disconnected sections separate even when owner pair matches', () => {
        const chains = buildGridGradientVectorBorderChains([
            {
                ownerA: 'red',
                ownerB: 'blue',
                ownerPairKey: 'red|blue',
                points: [
                    [0, 0],
                    [10, 0],
                ],
            },
            {
                ownerA: 'blue',
                ownerB: 'red',
                ownerPairKey: 'blue|red',
                points: [
                    [20, 0],
                    [30, 0],
                ],
            },
        ]);

        expect(chains).toHaveLength(2);
    });

    it('normalizes world owner labels for world-border grouping', () => {
        const chains = buildGridGradientVectorBorderChains([
            {
                ownerA: 'red',
                ownerB: '__world__',
                ownerPairKey: 'red|__world__',
                points: [
                    [0, 0],
                    [0, 10],
                ],
            },
            {
                ownerA: 'red',
                ownerB: 'world',
                ownerPairKey: 'red|world',
                points: [
                    [0, 10],
                    [0, 20],
                ],
            },
        ]);

        expect(chains).toHaveLength(1);
        expect(chains[0]?.ownerPairKey).toBe('red|world');
        expect(chains[0]?.ownerB).toBe('world');
    });
});
