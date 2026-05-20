import { describe, expect, it } from 'vitest';
import type { GridClassification, GridWavePlan } from '$lib/territory/families/metaballGrid/metaballGridTypes';
import { buildGridGradientShaderFieldTexturePlan, resolvePackedOwnerIndexAtProgress } from '$lib/territory/families/gridGradient/shaderField';

function makeClassification(): GridClassification {
    const vstars = [
        { id: 'g:0:0', ix: 0, iy: 0, x: 5, y: 5, prevOwnerId: 'red', nextOwnerId: 'red', role: 'native', eventId: null },
        { id: 'g:1:0', ix: 1, iy: 0, x: 15, y: 5, prevOwnerId: 'red', nextOwnerId: 'blue', role: 'dispossessed', eventId: 'e:1' },
        { id: 'g:0:1', ix: 0, iy: 1, x: 5, y: 15, prevOwnerId: null, nextOwnerId: 'blue', role: 'emergent', eventId: 'e:1' },
        { id: 'g:1:1', ix: 1, iy: 1, x: 15, y: 15, prevOwnerId: null, nextOwnerId: null, role: 'outside', eventId: null },
    ] as const;
    return {
        cols: 2,
        rows: 2,
        spacingPx: 10,
        requestedSpacingPx: 10,
        originMode: 'centered',
        distribution: 'square',
        vstars,
        emittableVstars: vstars.slice(0, 3),
        byRole: {
            native: ['g:0:0'],
            dispossessed: ['g:1:0'],
            emergent: ['g:0:1'],
            vacating: [],
            outside: ['g:1:1'],
        },
        dispossessedByEventId: { 'e:1': ['g:1:0', 'g:0:1'] },
        defaultEventId: '__default__',
    };
}

function makeWavePlan(): GridWavePlan {
    return {
        perEvent: [],
        flipTimeByVId: new Map([
            ['g:1:0', 0.5],
            ['g:0:1', 0.25],
        ]),
        orderedTransitionVIds: ['g:0:1', 'g:1:0'],
        orderedFlipTimes: [0.25, 0.5],
    };
}

describe('buildGridGradientShaderFieldTexturePlan', () => {
    it('packs owner and metric textures row-major', () => {
        const classification = makeClassification();
        const plan = buildGridGradientShaderFieldTexturePlan({
            planKey: 'p1',
            presentationKey: 'v1',
            classification,
            wavePlan: makeWavePlan(),
            palette: {
                ownerColorIdx: new Map([['red', 0], ['blue', 1]]),
                fillHexByColorIdx: [0xff0000, 0x0000ff],
                fillColorByOwnerId: new Map([['red', 0xff0000], ['blue', 0x0000ff]]),
                colorByOwnerId: new Map([['red', 0xff0000], ['blue', 0x0000ff]]),
            },
            settings: {
                fillAlpha: 0.5,
                borderOffsetPx: 0,
                edgeSizePx: 1,
                centerSizePx: 8,
                curvePower: 1,
            } as never,
            distanceField: {
                nearestBoundaryPxByCell: new Float32Array([0, 5, 10, 0]),
            } as never,
            ownerIndexByCell: new Int32Array([0, 1, 1, -1]),
            ownerMaxDistancePxByIndex: [10, 10],
            world: { width: 20, height: 20, minX: 0, minY: 0 },
        });

        expect(plan.cols).toBe(2);
        expect(plan.rows).toBe(2);
        expect(plan.paletteSize).toBe(3);
        expect(plan.ownerTextureData).toHaveLength(16);
        expect(plan.metricsTextureData).toHaveLength(16);
        expect(plan.paletteTextureData).toHaveLength(12);
        expect(plan.activeTransitionCells).toBe(2);
        expect(plan.outsideCells).toBe(1);
        expect(resolvePackedOwnerIndexAtProgress({ plan, cellIndex: 1, progress: 0.25 })).toBe(1);
        expect(resolvePackedOwnerIndexAtProgress({ plan, cellIndex: 1, progress: 0.75 })).toBe(2);
    });
});
