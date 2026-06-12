import { describe, expect, it } from 'vitest';
import type { GridClassification } from '../metaballGrid/metaballGridTypes';
import {
    buildGridGradientBorderDots,
    buildGridGradientNoisePolygon,
    resolveGridGradientCellSize,
    resolveGridGradientDrawableCellSize,
    resolveGridGradientTransitionFloorSizePx,
    resolveGridGradientTransitionBlendT,
    resolveGridGradientTransitionOffset,
    resolveGridGradientTransitionSideAlphas,
    resolveGridGradientTransitionScale,
} from './gridGradientScene';

function makeClassification(): GridClassification {
    const vstars = [
        {
            id: 'g:0:0',
            ix: 0,
            iy: 0,
            x: 5,
            y: 5,
            prevOwnerId: 'red',
            nextOwnerId: 'red',
            role: 'native',
            eventId: null,
        },
        {
            id: 'g:1:0',
            ix: 1,
            iy: 0,
            x: 15,
            y: 5,
            prevOwnerId: 'blue',
            nextOwnerId: 'blue',
            role: 'native',
            eventId: null,
        },
        {
            id: 'g:0:1',
            ix: 0,
            iy: 1,
            x: 5,
            y: 15,
            prevOwnerId: 'red',
            nextOwnerId: 'red',
            role: 'native',
            eventId: null,
        },
        {
            id: 'g:1:1',
            ix: 1,
            iy: 1,
            x: 15,
            y: 15,
            prevOwnerId: 'blue',
            nextOwnerId: 'blue',
            role: 'native',
            eventId: null,
        },
    ] as const;

    return {
        cols: 2,
        rows: 2,
        spacingPx: 10,
        requestedSpacingPx: 10,
        originMode: 'centered',
        distribution: 'square',
        vstars,
        emittableVstars: vstars,
        byRole: {
            native: vstars.map((v) => v.id),
            dispossessed: [],
            emergent: [],
            vacating: [],
            outside: [],
        },
        dispossessedByEventId: {},
        defaultEventId: '__default__',
    };
}

describe('grid gradient scene helpers', () => {
    it('makes center cells larger than edge cells', () => {
        const edge = resolveGridGradientCellSize({
            distancePx: 0,
            ownerMaxDistancePx: 100,
            edgeSizePx: 1.5,
            centerSizePx: 10,
            curvePower: 1.6,
            borderOffsetPx: 0,
        });
        const center = resolveGridGradientCellSize({
            distancePx: 100,
            ownerMaxDistancePx: 100,
            edgeSizePx: 1.5,
            centerSizePx: 10,
            curvePower: 1.6,
            borderOffsetPx: 0,
        });

        expect(edge).toBeCloseTo(1.5);
        expect(center).toBeCloseTo(10);
        expect(center).toBeGreaterThan(edge);
    });

    it('uses border offset to suppress fill near borders', () => {
        const hidden = resolveGridGradientCellSize({
            distancePx: 4,
            ownerMaxDistancePx: 100,
            edgeSizePx: 1,
            centerSizePx: 8,
            curvePower: 1,
            borderOffsetPx: 8,
        });
        const visible = resolveGridGradientCellSize({
            distancePx: 12,
            ownerMaxDistancePx: 100,
            edgeSizePx: 1,
            centerSizePx: 8,
            curvePower: 1,
            borderOffsetPx: 8,
        });

        expect(hidden).toBe(0);
        expect(visible).toBeGreaterThan(0);
    });

    it('keeps changing cells drawable inside the border offset band', () => {
        const hiddenNative = resolveGridGradientDrawableCellSize({
            role: 'native',
            distancePx: 4,
            ownerMaxDistancePx: 100,
            edgeSizePx: 0.5,
            centerSizePx: 4,
            curvePower: 2.7,
            borderOffsetPx: 8,
            spacingPx: 6,
        });
        const visibleTransition = resolveGridGradientDrawableCellSize({
            role: 'dispossessed',
            distancePx: 4,
            ownerMaxDistancePx: 100,
            edgeSizePx: 0.5,
            centerSizePx: 4,
            curvePower: 2.7,
            borderOffsetPx: 8,
            spacingPx: 6,
        });

        expect(hiddenNative).toBe(0);
        expect(visibleTransition).toBe(
            resolveGridGradientTransitionFloorSizePx({
                spacingPx: 6,
                edgeSizePx: 0.5,
                centerSizePx: 4,
            }),
        );
        expect(visibleTransition).toBeGreaterThan(2);
    });

    it('uses settled sizing for a terminal next-side transition cell', () => {
        const midTransition = resolveGridGradientDrawableCellSize({
            role: 'dispossessed',
            distancePx: 4,
            ownerMaxDistancePx: 100,
            edgeSizePx: 0.5,
            centerSizePx: 4,
            curvePower: 2.7,
            borderOffsetPx: 8,
            spacingPx: 6,
            alpha: 0.5,
        });
        const terminalNext = resolveGridGradientDrawableCellSize({
            role: 'dispossessed',
            distancePx: 4,
            ownerMaxDistancePx: 100,
            edgeSizePx: 0.5,
            centerSizePx: 4,
            curvePower: 2.7,
            borderOffsetPx: 8,
            spacingPx: 6,
            alpha: 1,
        });

        expect(midTransition).toBeGreaterThan(0);
        expect(terminalNext).toBe(0);
    });

    it('lets curve power change size progression', () => {
        const gentle = resolveGridGradientCellSize({
            distancePx: 50,
            ownerMaxDistancePx: 100,
            edgeSizePx: 1,
            centerSizePx: 9,
            curvePower: 0.5,
            borderOffsetPx: 0,
        });
        const steep = resolveGridGradientCellSize({
            distancePx: 50,
            ownerMaxDistancePx: 100,
            edgeSizePx: 1,
            centerSizePx: 9,
            curvePower: 3,
            borderOffsetPx: 0,
        });

        expect(gentle).toBeGreaterThan(steep);
    });

    it('scales changing cells with their transition alpha while leaving native cells stable', () => {
        expect(resolveGridGradientTransitionScale({ role: 'native', alpha: 0 })).toBe(1);
        expect(resolveGridGradientTransitionScale({ role: 'dispossessed', alpha: 0 })).toBe(0);

        const low = resolveGridGradientTransitionScale({
            role: 'dispossessed',
            alpha: 0.25,
        });
        const high = resolveGridGradientTransitionScale({
            role: 'dispossessed',
            alpha: 1,
        });

        expect(low).toBeGreaterThan(0);
        expect(low).toBeLessThan(high);
        expect(low).toBeCloseTo(0.5);
        expect(high).toBeCloseTo(1);
    });

    it('separates transition-side dots only during the visible middle of a blend', () => {
        expect(resolveGridGradientTransitionOffset({
            role: 'native',
            alpha: 0.5,
            side: 'prev',
            ix: 2,
            iy: 3,
            spacingPx: 10,
        })).toEqual({ x: 0, y: 0 });
        expect(resolveGridGradientTransitionOffset({
            role: 'dispossessed',
            alpha: 0,
            side: 'prev',
            ix: 2,
            iy: 3,
            spacingPx: 10,
        })).toEqual({ x: 0, y: 0 });
        expect(resolveGridGradientTransitionOffset({
            role: 'dispossessed',
            alpha: 1,
            side: 'next',
            ix: 2,
            iy: 3,
            spacingPx: 10,
        })).toEqual({ x: 0, y: 0 });

        const prev = resolveGridGradientTransitionOffset({
            role: 'dispossessed',
            alpha: 0.5,
            side: 'prev',
            ix: 2,
            iy: 3,
            spacingPx: 10,
        });
        const next = resolveGridGradientTransitionOffset({
            role: 'dispossessed',
            alpha: 0.5,
            side: 'next',
            ix: 2,
            iy: 3,
            spacingPx: 10,
        });

        expect(Math.hypot(prev.x, prev.y)).toBeGreaterThan(0);
        expect(next.x).toBeCloseTo(-prev.x);
        expect(next.y).toBeCloseTo(-prev.y);
    });

    it('keeps every changing cell in the global fill transition for the full duration', () => {
        const dispossessed = resolveGridGradientTransitionSideAlphas({
            role: 'dispossessed',
            progress: 0.4,
        });
        expect(dispossessed.prevAlpha).toBeCloseTo(0.6);
        expect(dispossessed.nextAlpha).toBeCloseTo(0.4);
        expect(resolveGridGradientTransitionSideAlphas({
            role: 'emergent',
            progress: 0.4,
        })).toEqual({ prevAlpha: 0, nextAlpha: 0.4 });
        const vacating = resolveGridGradientTransitionSideAlphas({
            role: 'vacating',
            progress: 0.4,
        });
        expect(vacating.prevAlpha).toBeCloseTo(0.6);
        expect(vacating.nextAlpha).toBe(0);
        expect(resolveGridGradientTransitionSideAlphas({
            role: 'native',
            progress: 0.4,
        })).toEqual({ prevAlpha: 0, nextAlpha: 1 });
    });

    it('uses each cell flip time to create a visible fill transition wave', () => {
        expect(resolveGridGradientTransitionBlendT({
            progress: 0.15,
            flipTime: 0.5,
            flipWindow: 0.28,
        })).toBe(0);
        expect(resolveGridGradientTransitionBlendT({
            progress: 0.5,
            flipTime: 0.5,
            flipWindow: 0.28,
        })).toBeCloseTo(0.5);
        expect(resolveGridGradientTransitionBlendT({
            progress: 0.85,
            flipTime: 0.5,
            flipWindow: 0.28,
        })).toBe(1);

        const sideAlphas = resolveGridGradientTransitionSideAlphas({
            role: 'contested',
            progress: 0.5,
            flipTime: 0.5,
            flipWindow: 0.28,
        });
        expect(sideAlphas.prevAlpha).toBeGreaterThan(0.45);
        expect(sideAlphas.prevAlpha).toBeLessThan(0.55);
        expect(sideAlphas.nextAlpha).toBeGreaterThan(0.45);
        expect(sideAlphas.nextAlpha).toBeLessThan(0.55);
    });

    it('builds one blended dot per differing grid edge', () => {
        const dots = buildGridGradientBorderDots({
            classification: makeClassification(),
            colorByOwnerId: new Map([
                ['red', 0xff0000],
                ['blue', 0x0000ff],
            ]),
            dotSizePx: 2,
            style: 'blended',
            alpha: 0.5,
        });

        expect(dots).toHaveLength(2);
        expect(dots.every((dot) => dot.ownerId === null)).toBe(true);
        expect(dots.every((dot) => dot.color === 0x800080)).toBe(true);
    });

    it('builds two owner-colored dots for butted borders', () => {
        const dots = buildGridGradientBorderDots({
            classification: makeClassification(),
            colorByOwnerId: new Map([
                ['red', 0xff0000],
                ['blue', 0x0000ff],
            ]),
            dotSizePx: 2,
            style: 'butted',
            alpha: 0.5,
        });

        expect(dots).toHaveLength(4);
        expect(dots.filter((dot) => dot.ownerId === 'red')).toHaveLength(2);
        expect(dots.filter((dot) => dot.ownerId === 'blue')).toHaveLength(2);
    });

    it('generates stable noise polygons', () => {
        const first = buildGridGradientNoisePolygon({
            x: 10,
            y: 20,
            radiusPx: 5,
            cellId: 'g:1:2',
        });
        const second = buildGridGradientNoisePolygon({
            x: 10,
            y: 20,
            radiusPx: 5,
            cellId: 'g:1:2',
        });

        expect(first).toEqual(second);
        expect(first).toHaveLength(16);
    });
});
