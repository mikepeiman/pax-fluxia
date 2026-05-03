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

export interface TerritoryFrontierFxSampleField {
    readonly length: number;
    readonly activeMaskByCell: Uint8Array;
    readonly alphaMultiplierByCell: Float32Array;
    readonly saturationMultiplierByCell: Float32Array;
    readonly lightnessMultiplierByCell: Float32Array;
    readonly hotBlendAmountByCell: Float32Array;
}

export interface TerritoryFrontierFxSampleFieldParams {
    readonly distanceField: OwnershipGridFrontierDistanceField;
    readonly tuning: TerritoryFrontierFxTuning;
    readonly nowMs: number;
    readonly hasActiveTransition: boolean;
    readonly reuseField?: TerritoryFrontierFxSampleField | null;
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

function ensureFloat32Field(
    field: Float32Array | undefined,
    length: number,
): Float32Array {
    return field && field.length === length ? field : new Float32Array(length);
}

function ensureUint8Field(
    field: Uint8Array | undefined,
    length: number,
): Uint8Array {
    return field && field.length === length ? field : new Uint8Array(length);
}

export function createTerritoryFrontierFxSampleField(
    length: number,
): TerritoryFrontierFxSampleField {
    return {
        length,
        activeMaskByCell: new Uint8Array(length),
        alphaMultiplierByCell: new Float32Array(length),
        saturationMultiplierByCell: new Float32Array(length),
        lightnessMultiplierByCell: new Float32Array(length),
        hotBlendAmountByCell: new Float32Array(length),
    };
}

export function isTerritoryFrontierFxActive(
    tuning: TerritoryFrontierFxTuning,
    hasActiveTransition: boolean,
): boolean {
    if (tuning.mode === 'off') return false;
    if (!(tuning.widthPx > 0) || !(tuning.strength > 0)) return false;
    return hasActiveTransition ? tuning.applyTransition : tuning.applySteadyState;
}

function resolveTerritoryFrontierFxSampleValues(params: {
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

export function evaluateTerritoryFrontierFxSample(params: {
    readonly tuning: TerritoryFrontierFxTuning;
    readonly nearestBoundaryPx: number;
    readonly nowMs: number;
    readonly hasActiveTransition: boolean;
}): TerritoryFrontierFxSample | null {
    return resolveTerritoryFrontierFxSampleValues(params);
}

export function buildTerritoryFrontierFxSampleField(
    params: TerritoryFrontierFxSampleFieldParams,
): TerritoryFrontierFxSampleField | null {
    const { distanceField, tuning, nowMs, hasActiveTransition } = params;
    if (!isTerritoryFrontierFxActive(tuning, hasActiveTransition)) return null;

    const length = distanceField.nearestBoundaryPxByCell.length;
    const reuseField = params.reuseField ?? null;
    const samples: TerritoryFrontierFxSampleField = {
        length,
        activeMaskByCell: ensureUint8Field(
            reuseField?.activeMaskByCell,
            length,
        ),
        alphaMultiplierByCell: ensureFloat32Field(
            reuseField?.alphaMultiplierByCell,
            length,
        ),
        saturationMultiplierByCell: ensureFloat32Field(
            reuseField?.saturationMultiplierByCell,
            length,
        ),
        lightnessMultiplierByCell: ensureFloat32Field(
            reuseField?.lightnessMultiplierByCell,
            length,
        ),
        hotBlendAmountByCell: ensureFloat32Field(
            reuseField?.hotBlendAmountByCell,
            length,
        ),
    };
    samples.activeMaskByCell.fill(0);
    samples.alphaMultiplierByCell.fill(1);
    samples.saturationMultiplierByCell.fill(1);
    samples.lightnessMultiplierByCell.fill(1);
    samples.hotBlendAmountByCell.fill(0);
    for (let i = 0; i < length; i++) {
        if (distanceField.bandIndexByCell[i] < 0) {
            continue;
        }
        const nearestBoundaryPx =
            distanceField.nearestBoundaryPxByCell[i] ?? Infinity;
        const widthPx = Math.max(1, tuning.widthPx);
        const strength = clamp01(tuning.strength);
        const edgeFactor = resolveEdgeFactor(
            nearestBoundaryPx,
            widthPx,
            tuning.softness,
        );
        if (edgeFactor <= 0) continue;

        let alphaMultiplier = 1;
        let saturationMultiplier = 1;
        let lightnessMultiplier = 1;
        let hotBlendAmount = 0;

        switch (tuning.mode) {
            case 'soft_fade':
                alphaMultiplier = Math.max(
                    0,
                    1 - 0.42 * strength * edgeFactor,
                );
                saturationMultiplier = 1 + 0.08 * strength * edgeFactor;
                lightnessMultiplier = 1 + 0.22 * strength * edgeFactor;
                break;
            case 'stepped_moat': {
                const steps = Math.max(1, Math.round(tuning.steps));
                const quantized = Math.ceil(edgeFactor * steps) / steps;
                alphaMultiplier = Math.max(
                    0,
                    1 - 0.55 * strength * quantized,
                );
                saturationMultiplier = 1 + 0.08 * strength * quantized;
                lightnessMultiplier = Math.max(
                    0.05,
                    1 - 0.32 * strength * quantized,
                );
                break;
            }
            case 'plasma_rim': {
                const pulseSpeed = Math.max(0.1, tuning.pulseSpeed);
                const phase =
                    nowMs * 0.004 * pulseSpeed
                    - (nearestBoundaryPx / Math.max(1, widthPx)) * Math.PI * 3;
                const pulse = 0.5 + 0.5 * Math.sin(phase);
                const wave = edgeFactor * (0.45 + 0.55 * pulse);
                alphaMultiplier = Math.max(
                    0,
                    1 - 0.18 * strength * edgeFactor,
                );
                saturationMultiplier = 1 + 0.26 * strength * edgeFactor;
                lightnessMultiplier = 1 + 0.28 * strength * edgeFactor;
                hotBlendAmount = clamp01(
                    0.18 * strength * edgeFactor + 0.42 * strength * wave,
                );
                break;
            }
            case 'off':
            default:
                continue;
        }

        samples.activeMaskByCell[i] = 1;
        samples.alphaMultiplierByCell[i] = alphaMultiplier;
        samples.saturationMultiplierByCell[i] = saturationMultiplier;
        samples.lightnessMultiplierByCell[i] = lightnessMultiplier;
        samples.hotBlendAmountByCell[i] = hotBlendAmount;
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

export function applyTerritoryFrontierFxFieldToFill(
    baseFillHex: number,
    field: TerritoryFrontierFxSampleField | null,
    cellIndex: number,
): number {
    if (!field) return baseFillHex;
    if (field.activeMaskByCell[cellIndex] === 0) return baseFillHex;
    let colorHex = adjustColorHSL(
        baseFillHex,
        field.saturationMultiplierByCell[cellIndex] ?? 1,
        field.lightnessMultiplierByCell[cellIndex] ?? 1,
    );
    const hotBlendAmount = field.hotBlendAmountByCell[cellIndex] ?? 0;
    if (hotBlendAmount > 0) {
        colorHex = blendColors(colorHex, PLASMA_HOT_HEX, hotBlendAmount);
    }
    return colorHex;
}
