import { describe, expect, it } from 'vitest';
import {
    VIRTUAL_SITE_REFERENCE_RADIUS_PX,
    buildRealSiteWeight,
    buildVirtualSiteWeight,
    clampVirtualSiteWeightForRealStarOwnership,
    deriveLegacyTerritoryMsrStarBias,
    normalizeTerritoryMsrStarBias,
} from './powerVoronoiWeights';

describe('buildRealSiteWeight', () => {
    it('returns zero when star bias is zero', () => {
        expect(buildRealSiteWeight(75, 0)).toBe(0);
    });

    it('uses a saturating normalized response against the virtual-site reference scale', () => {
        const weight = buildRealSiteWeight(75, 1);
        expect(weight).toBeCloseTo(
            VIRTUAL_SITE_REFERENCE_RADIUS_PX ** 2 * 0.5,
            6,
        );
    });

    it('grows smoothly with local MSR without exploding', () => {
        const low = buildRealSiteWeight(5, 1);
        const medium = buildRealSiteWeight(75, 1);
        const high = buildRealSiteWeight(500, 1);

        expect(low).toBeGreaterThan(0);
        expect(medium).toBeGreaterThan(low);
        expect(high).toBeGreaterThan(medium);
        expect(high).toBeLessThan(
            VIRTUAL_SITE_REFERENCE_RADIUS_PX ** 2 * 1.01,
        );
    });
});

describe('deriveLegacyTerritoryMsrStarBias', () => {
    it('maps disabled legacy star power to zero bias', () => {
        expect(
            deriveLegacyTerritoryMsrStarBias({
                enabled: false,
                mode: 'squared',
                gain: 1,
                exponent: 2,
                capPx: 500,
            }),
        ).toBe(0);
    });

    it('derives a bounded fallback bias from legacy settings', () => {
        expect(
            deriveLegacyTerritoryMsrStarBias({
                enabled: true,
                mode: 'squared',
                gain: 1,
                exponent: 2,
                capPx: 500,
            }),
        ).toBe(2);
        expect(
            deriveLegacyTerritoryMsrStarBias({
                enabled: true,
                mode: 'linear',
                gain: 0.5,
                exponent: 2,
                capPx: 500,
            }),
        ).toBeGreaterThan(0);
    });
});

describe('normalizeTerritoryMsrStarBias', () => {
    it('clamps to the surfaced range', () => {
        expect(normalizeTerritoryMsrStarBias(-1)).toBe(0);
        expect(normalizeTerritoryMsrStarBias(5)).toBe(2);
    });
});

describe('buildVirtualSiteWeight', () => {
    it('keeps virtual-site weights on the fixed 75px reference scale', () => {
        expect(buildVirtualSiteWeight(0.5)).toBeCloseTo(
            VIRTUAL_SITE_REFERENCE_RADIUS_PX ** 2 * 0.5,
            6,
        );
    });

    it('treats zero and negative multipliers as disabled', () => {
        expect(buildVirtualSiteWeight(0)).toBe(0);
        expect(buildVirtualSiteWeight(-1)).toBe(0);
    });
});

describe('clampVirtualSiteWeightForRealStarOwnership', () => {
    it('clamps a virtual site so it cannot beat a real star at the star position', () => {
        expect(
            clampVirtualSiteWeightForRealStarOwnership({
                x: 110,
                y: 100,
                weight: 1000,
                realSites: [{ x: 100, y: 100, weight: 0 }],
            }),
        ).toBeLessThan(100);
    });

    it('returns zero when the clamp would fully suppress the virtual site', () => {
        expect(
            clampVirtualSiteWeightForRealStarOwnership({
                x: 100.2,
                y: 100,
                weight: 1000,
                realSites: [{ x: 100, y: 100, weight: 0 }],
            }),
        ).toBe(0);
    });

    it('suppresses a virtual site placed inside a star clearance disk', () => {
        expect(
            clampVirtualSiteWeightForRealStarOwnership({
                x: 125,
                y: 100,
                weight: 1000,
                realSites: [
                    {
                        x: 100,
                        y: 100,
                        weight: 0,
                        clearanceRadiusPx: 40,
                    },
                ],
            }),
        ).toBe(0);
    });

    it('clamps against the nearest clearance ring, not only the star center', () => {
        const clamped = clampVirtualSiteWeightForRealStarOwnership({
            x: 155,
            y: 100,
            weight: 1000,
            realSites: [
                {
                    x: 100,
                    y: 100,
                    weight: 0,
                    clearanceRadiusPx: 40,
                },
            ],
        });
        expect(clamped).toBeGreaterThan(0);
        expect(clamped).toBeLessThan(250);
    });
});
