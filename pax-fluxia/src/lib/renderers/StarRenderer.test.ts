import { describe, expect, it } from 'vitest';
import { resolveStarOwnerBlendVisual } from './StarRenderer';

describe('resolveStarOwnerBlendVisual', () => {
    it('blends pending conquest ownership instead of holding then snapping', () => {
        const early = resolveStarOwnerBlendVisual({
            currentOwner: 'blue',
            nowMs: 250,
            pending: {
                previousOwner: 'red',
                newOwner: 'blue',
                startedAtMs: 0,
                durationMs: 1000,
                transitionTime: 1000,
            },
        });
        const late = resolveStarOwnerBlendVisual({
            currentOwner: 'blue',
            nowMs: 750,
            pending: {
                previousOwner: 'red',
                newOwner: 'blue',
                startedAtMs: 0,
                durationMs: 1000,
                transitionTime: 1000,
            },
        });

        expect(early.active).toBe(true);
        expect(early.effectiveOwner).toBe('red');
        expect(early.progress).toBeGreaterThan(0);
        expect(early.progress).toBeLessThan(0.5);
        expect(late.active).toBe(true);
        expect(late.effectiveOwner).toBe('blue');
        expect(late.progress).toBeGreaterThan(0.5);
        expect(late.progress).toBeLessThan(1);
    });

    it('lets the render-family transition override pending conquest timing', () => {
        const visual = resolveStarOwnerBlendVisual({
            currentOwner: 'blue',
            nowMs: 100,
            pending: {
                previousOwner: 'red',
                newOwner: 'blue',
                startedAtMs: 0,
                durationMs: 1000,
                transitionTime: 1000,
            },
            transition: {
                previousOwner: 'red',
                newOwner: 'blue',
                progress: 0.75,
            },
        });

        expect(visual.active).toBe(true);
        expect(visual.effectiveOwner).toBe('blue');
        expect(visual.progress).toBeGreaterThan(0.5);
    });

    it('expires pending conquest ownership after the fade finishes', () => {
        const visual = resolveStarOwnerBlendVisual({
            currentOwner: 'blue',
            nowMs: 1000,
            pending: {
                previousOwner: 'red',
                newOwner: 'blue',
                startedAtMs: 0,
                durationMs: 1000,
                transitionTime: 1000,
            },
        });

        expect(visual.active).toBe(false);
        expect(visual.expired).toBe(true);
        expect(visual.effectiveOwner).toBe('blue');
    });
});
