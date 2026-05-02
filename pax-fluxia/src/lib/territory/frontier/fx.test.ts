import { describe, expect, it } from 'vitest';
import {
    applyTerritoryFrontierFxToFill,
    buildTerritoryFrontierFxSampleField,
    evaluateTerritoryFrontierFxSample,
    isTerritoryFrontierFxActive,
    type TerritoryFrontierFxTuning,
} from './fx';
import { buildOwnershipGridFrontierDistanceField } from './distance';

const BASE_TUNING: TerritoryFrontierFxTuning = {
    mode: 'soft_fade',
    widthPx: 24,
    strength: 0.75,
    steps: 4,
    softness: 1.2,
    pulseSpeed: 1,
    applySteadyState: true,
    applyTransition: true,
};

describe('frontier FX helpers', () => {
    it('stays inactive when mode is off', () => {
        expect(
            isTerritoryFrontierFxActive(
                { ...BASE_TUNING, mode: 'off' },
                false,
            ),
        ).toBe(false);
    });

    it('soft fade affects fill near the frontier', () => {
        const sample = evaluateTerritoryFrontierFxSample({
            tuning: BASE_TUNING,
            nearestBoundaryPx: 0,
            nowMs: 0,
            hasActiveTransition: false,
        });

        expect(sample).not.toBeNull();
        expect(sample!.alphaMultiplier).toBeLessThan(1);
        expect(sample!.lightnessMultiplier).toBeGreaterThan(1);
    });

    it('stepped moat quantizes stronger outer bands', () => {
        const tuning: TerritoryFrontierFxTuning = {
            ...BASE_TUNING,
            mode: 'stepped_moat',
            steps: 3,
        };
        const near = evaluateTerritoryFrontierFxSample({
            tuning,
            nearestBoundaryPx: 2,
            nowMs: 0,
            hasActiveTransition: false,
        });
        const farther = evaluateTerritoryFrontierFxSample({
            tuning,
            nearestBoundaryPx: 16,
            nowMs: 0,
            hasActiveTransition: false,
        });

        expect(near).not.toBeNull();
        expect(farther).not.toBeNull();
        expect(near!.alphaMultiplier).toBeLessThan(farther!.alphaMultiplier);
    });

    it('plasma rim animates over time', () => {
        const tuning: TerritoryFrontierFxTuning = {
            ...BASE_TUNING,
            mode: 'plasma_rim',
        };
        const early = evaluateTerritoryFrontierFxSample({
            tuning,
            nearestBoundaryPx: 4,
            nowMs: 0,
            hasActiveTransition: true,
        });
        const later = evaluateTerritoryFrontierFxSample({
            tuning,
            nearestBoundaryPx: 4,
            nowMs: 400,
            hasActiveTransition: true,
        });

        expect(early).not.toBeNull();
        expect(later).not.toBeNull();
        expect(later!.hotBlendAmount).not.toBe(early!.hotBlendAmount);
    });

    it('respects steady/transition application toggles', () => {
        const tuning: TerritoryFrontierFxTuning = {
            ...BASE_TUNING,
            applySteadyState: false,
            applyTransition: true,
        };
        expect(
            evaluateTerritoryFrontierFxSample({
                tuning,
                nearestBoundaryPx: 0,
                nowMs: 0,
                hasActiveTransition: false,
            }),
        ).toBeNull();
        expect(
            evaluateTerritoryFrontierFxSample({
                tuning,
                nearestBoundaryPx: 0,
                nowMs: 0,
                hasActiveTransition: true,
            }),
        ).not.toBeNull();
    });

    it('builds a reusable sample field from the ownership distance field', () => {
        const distanceField = buildOwnershipGridFrontierDistanceField({
            cols: 3,
            rows: 1,
            ownerIndexByCell: Int32Array.from([0, 0, 0]),
            spacingPx: 12,
            includeWorldEdge: true,
        });
        const samples = buildTerritoryFrontierFxSampleField({
            distanceField,
            tuning: BASE_TUNING,
            nowMs: 0,
            hasActiveTransition: false,
        });

        expect(samples).not.toBeNull();
        expect(samples!.length).toBe(3);
        expect(samples![0]).not.toBeNull();
        expect(samples![1]).not.toBeNull();
    });

    it('applies a visible color change when the sample is active', () => {
        const sample = evaluateTerritoryFrontierFxSample({
            tuning: {
                ...BASE_TUNING,
                mode: 'plasma_rim',
            },
            nearestBoundaryPx: 0,
            nowMs: 0,
            hasActiveTransition: false,
        });
        const base = 0x3366ff;
        const next = applyTerritoryFrontierFxToFill(base, sample);
        expect(next).not.toBe(base);
    });
});
