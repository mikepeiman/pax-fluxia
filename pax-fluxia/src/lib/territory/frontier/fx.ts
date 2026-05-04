import { adjustColorHSL, blendColors } from '$lib/utils/colorUtils';
import type { OwnershipGridFrontierDistanceField } from './distance';
import type { TerritoryFrontierFxMode } from './types';

const PLASMA_HOT_HEX = 0xffc86b;
const TWO_PI = Math.PI * 2;

export interface TerritoryFrontierFxTuning {
    readonly mode: TerritoryFrontierFxMode;
    readonly widthPx: number;
    readonly strength: number;
    readonly steps: number;
    readonly softness: number;
    readonly emissive: number;
    readonly particleDensity: number;
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

function resolveCellNoise(cellIndex: number, cols: number): number {
    const safeCols = Math.max(1, cols);
    const ix = cellIndex % safeCols;
    const iy = Math.floor(cellIndex / safeCols);
    const seed = Math.sin(ix * 12.9898 + iy * 78.233) * 43758.5453;
    return seed - Math.floor(seed);
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
    readonly bandIndex?: number;
    readonly cellIndex?: number;
    readonly cols?: number;
}): TerritoryFrontierFxSample | null {
    const { tuning, nearestBoundaryPx, nowMs, hasActiveTransition } = params;
    if (!isTerritoryFrontierFxActive(tuning, hasActiveTransition)) return null;

    const widthPx = Math.max(1, tuning.widthPx);
    const strength = clamp01(tuning.strength);
    const emissive = Math.max(0, tuning.emissive);
    const particleDensity = clamp01(tuning.particleDensity);
    const edgeFactor = resolveEdgeFactor(
        nearestBoundaryPx,
        widthPx,
        tuning.softness,
    );
    if (edgeFactor <= 0) return null;

    const bandIndex = Math.max(0, params.bandIndex ?? 0);
    const cols = Math.max(1, params.cols ?? 1);
    const cellIndex = Math.max(0, params.cellIndex ?? 0);
    const ix = cellIndex % cols;
    const iy = Math.floor(cellIndex / cols);
    const noise = resolveCellNoise(cellIndex, cols);

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
                lightnessMultiplier:
                    1 + 0.28 * strength * edgeFactor * (0.5 + 0.5 * emissive),
                hotBlendAmount: clamp01(
                    (
                        0.18 * strength * edgeFactor
                        + 0.42 * strength * wave
                    ) * emissive,
                ),
            };
        }
        case 'ion_drift': {
            const pulseSpeed = Math.max(0.1, tuning.pulseSpeed);
            const phase =
                nowMs * 0.0035 * pulseSpeed
                + ix * 0.61
                + iy * 1.37
                + bandIndex * 0.47
                + noise * TWO_PI;
            const drift = 0.5 + 0.5 * Math.sin(phase);
            const threshold = 1 - particleDensity * 0.9;
            const spark =
                drift > threshold
                    ? (drift - threshold) / Math.max(0.001, 1 - threshold)
                    : 0;
            return {
                alphaMultiplier: Math.max(
                    0,
                    1 - (0.08 * edgeFactor + 0.12 * spark) * strength,
                ),
                saturationMultiplier:
                    1
                    + 0.1 * strength * edgeFactor
                    + 0.34 * strength * spark,
                lightnessMultiplier:
                    1
                    + 0.08 * strength * edgeFactor
                    + 0.5 * strength * spark * (0.4 + 0.6 * emissive),
                hotBlendAmount: clamp01(
                    0.08 * strength * edgeFactor
                    + 0.55 * strength * spark * emissive,
                ),
            };
        }
        case 'geometry_strip': {
            const pulseSpeed = Math.max(0.1, tuning.pulseSpeed);
            const steps = Math.max(2, Math.round(tuning.steps));
            const bandPosition =
                clamp01(nearestBoundaryPx / Math.max(1, widthPx)) * (steps - 1);
            const travel = (nowMs * 0.0018 * pulseSpeed + noise * 0.65) % steps;
            const directDistance = Math.abs(bandPosition - travel);
            const wrappedDistance = Math.min(
                directDistance,
                Math.abs(directDistance - steps),
            );
            const strip = Math.max(
                0,
                1 - wrappedDistance / Math.max(0.8, tuning.softness + 0.35),
            );
            const quantized = Math.ceil(edgeFactor * steps) / steps;
            const stripWeight = Math.max(quantized, strip);
            return {
                alphaMultiplier: Math.max(0, 1 - 0.38 * strength * stripWeight),
                saturationMultiplier:
                    1
                    + 0.12 * strength * quantized
                    + 0.24 * strength * strip,
                lightnessMultiplier:
                    1
                    + 0.08 * strength * quantized
                    + 0.3 * strength * strip * (0.5 + 0.5 * emissive),
                hotBlendAmount: clamp01(
                    0.08 * strength * quantized
                    + 0.32 * strength * strip * emissive,
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
    readonly bandIndex?: number;
    readonly cellIndex?: number;
    readonly cols?: number;
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
        const sample = resolveTerritoryFrontierFxSampleValues({
            tuning,
            nearestBoundaryPx:
                distanceField.nearestBoundaryPxByCell[i] ?? Infinity,
            nowMs,
            hasActiveTransition,
            bandIndex: distanceField.bandIndexByCell[i] ?? -1,
            cellIndex: i,
            cols: distanceField.cols,
        });
        if (!sample) continue;

        samples.activeMaskByCell[i] = 1;
        samples.alphaMultiplierByCell[i] = sample.alphaMultiplier;
        samples.saturationMultiplierByCell[i] = sample.saturationMultiplier;
        samples.lightnessMultiplierByCell[i] = sample.lightnessMultiplier;
        samples.hotBlendAmountByCell[i] = sample.hotBlendAmount;
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
