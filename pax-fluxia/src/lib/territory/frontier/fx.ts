import { adjustColorHSL, blendColors } from '$lib/utils/colorUtils';
import type { OwnershipGridFrontierDistanceField } from './distance';
import type { TerritoryFrontierFxMode } from './types';

const PLASMA_HOT_HEX = 0xffc86b;

export interface TerritoryFrontierFxTuning {
    readonly mode: TerritoryFrontierFxMode;
    readonly widthPx: number;
    readonly strength: number;
    readonly steps: number;
    readonly softness: number;
    readonly pulseSpeed: number;
    readonly applySteadyState: boolean;
    readonly applyTransition: boolean;
}

export interface TerritoryFrontierFxSample {
    readonly alphaMultiplier: number;
    readonly saturationMultiplier: number;
    readonly lightnessMultiplier: number;
    readonly hotBlendAmount: number;
}

export interface TerritoryFrontierFxSampleFieldParams {
    readonly distanceField: OwnershipGridFrontierDistanceField;
    readonly tuning: TerritoryFrontierFxTuning;
    readonly nowMs: number;
    readonly hasActiveTransition: boolean;
}

function clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
}

function resolveEdgeFactor(
    nearestBoundaryPx: number,
    widthPx: number,
    softness: number,
): number {
    if (!(widthPx > 0) || !Number.isFinite(nearestBoundaryPx)) return 0;
    const raw = 1 - clamp01(nearestBoundaryPx / widthPx);
    if (raw <= 0) return 0;
    return Math.pow(raw, Math.max(0.35, softness));
}

export function isTerritoryFrontierFxActive(
    tuning: TerritoryFrontierFxTuning,
    hasActiveTransition: boolean,
): boolean {
    if (tuning.mode === 'off') return false;
    if (!(tuning.widthPx > 0) || !(tuning.strength > 0)) return false;
    return hasActiveTransition ? tuning.applyTransition : tuning.applySteadyState;
}

export function evaluateTerritoryFrontierFxSample(params: {
    readonly tuning: TerritoryFrontierFxTuning;
    readonly nearestBoundaryPx: number;
    readonly nowMs: number;
    readonly hasActiveTransition: boolean;
}): TerritoryFrontierFxSample | null {
    const { tuning, nearestBoundaryPx, nowMs, hasActiveTransition } = params;
    if (!isTerritoryFrontierFxActive(tuning, hasActiveTransition)) return null;

    const widthPx = Math.max(1, tuning.widthPx);
    const strength = clamp01(tuning.strength);
    const edgeFactor = resolveEdgeFactor(
        nearestBoundaryPx,
        widthPx,
        tuning.softness,
    );
    if (edgeFactor <= 0) return null;

    switch (tuning.mode) {
        case 'soft_fade':
            return {
                alphaMultiplier: Math.max(0, 1 - 0.42 * strength * edgeFactor),
                saturationMultiplier: 1 + 0.08 * strength * edgeFactor,
                lightnessMultiplier: 1 + 0.22 * strength * edgeFactor,
                hotBlendAmount: 0,
            };
        case 'stepped_moat': {
            const steps = Math.max(1, Math.round(tuning.steps));
            const quantized = Math.ceil(edgeFactor * steps) / steps;
            return {
                alphaMultiplier: Math.max(0, 1 - 0.55 * strength * quantized),
                saturationMultiplier: 1 + 0.08 * strength * quantized,
                lightnessMultiplier: Math.max(
                    0.05,
                    1 - 0.32 * strength * quantized,
                ),
                hotBlendAmount: 0,
            };
        }
        case 'plasma_rim': {
            const pulseSpeed = Math.max(0.1, tuning.pulseSpeed);
            const phase =
                nowMs * 0.004 * pulseSpeed
                - (nearestBoundaryPx / Math.max(1, widthPx)) * Math.PI * 3;
            const pulse = 0.5 + 0.5 * Math.sin(phase);
            const wave = edgeFactor * (0.45 + 0.55 * pulse);
            return {
                alphaMultiplier: Math.max(0, 1 - 0.18 * strength * edgeFactor),
                saturationMultiplier: 1 + 0.26 * strength * edgeFactor,
                lightnessMultiplier: 1 + 0.28 * strength * edgeFactor,
                hotBlendAmount: clamp01(
                    0.18 * strength * edgeFactor + 0.42 * strength * wave,
                ),
            };
        }
        case 'off':
        default:
            return null;
    }
}

export function buildTerritoryFrontierFxSampleField(
    params: TerritoryFrontierFxSampleFieldParams,
): Array<TerritoryFrontierFxSample | null> | null {
    const { distanceField, tuning, nowMs, hasActiveTransition } = params;
    if (!isTerritoryFrontierFxActive(tuning, hasActiveTransition)) return null;

    const samples = new Array<TerritoryFrontierFxSample | null>(
        distanceField.nearestBoundaryPxByCell.length,
    );
    for (let i = 0; i < distanceField.nearestBoundaryPxByCell.length; i++) {
        if (distanceField.bandIndexByCell[i] < 0) {
            samples[i] = null;
            continue;
        }
        samples[i] = evaluateTerritoryFrontierFxSample({
            tuning,
            nearestBoundaryPx: distanceField.nearestBoundaryPxByCell[i] ?? Infinity,
            nowMs,
            hasActiveTransition,
        });
    }
    return samples;
}

export function applyTerritoryFrontierFxToFill(
    baseFillHex: number,
    sample: TerritoryFrontierFxSample | null,
): number {
    if (!sample) return baseFillHex;
    let colorHex = adjustColorHSL(
        baseFillHex,
        sample.saturationMultiplier,
        sample.lightnessMultiplier,
    );
    if (sample.hotBlendAmount > 0) {
        colorHex = blendColors(colorHex, PLASMA_HOT_HEX, sample.hotBlendAmount);
    }
    return colorHex;
}
