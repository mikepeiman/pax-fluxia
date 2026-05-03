import type {
    TerritoryFrontierPhaseFieldLayer,
    TerritoryFrontierPhaseFieldPayload,
} from './types';

function blurScalarField3Tap(
    values: Float32Array,
    cols: number,
    rows: number,
    validMask?: Uint8Array,
): Float32Array {
    const horizontal = new Float32Array(values.length);
    const output = new Float32Array(values.length);
    const kernel = [0.25, 0.5, 0.25] as const;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const index = y * cols + x;
            if (validMask && validMask[index] === 0) {
                horizontal[index] = values[index];
                continue;
            }
            let sum = 0;
            let weightSum = 0;
            for (let offset = -1; offset <= 1; offset++) {
                const nx = x + offset;
                if (nx < 0 || nx >= cols) continue;
                const neighborIndex = y * cols + nx;
                if (validMask && validMask[neighborIndex] === 0) continue;
                const weight = kernel[offset + 1];
                sum += values[neighborIndex] * weight;
                weightSum += weight;
            }
            horizontal[index] = weightSum > 0 ? sum / weightSum : values[index];
        }
    }

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const index = y * cols + x;
            if (validMask && validMask[index] === 0) {
                output[index] = horizontal[index];
                continue;
            }
            let sum = 0;
            let weightSum = 0;
            for (let offset = -1; offset <= 1; offset++) {
                const ny = y + offset;
                if (ny < 0 || ny >= rows) continue;
                const neighborIndex = ny * cols + x;
                if (validMask && validMask[neighborIndex] === 0) continue;
                const weight = kernel[offset + 1];
                sum += horizontal[neighborIndex] * weight;
                weightSum += weight;
            }
            output[index] = weightSum > 0 ? sum / weightSum : horizontal[index];
        }
    }

    return output;
}

export function blurTerritoryFrontierLayer(
    layer: TerritoryFrontierPhaseFieldLayer,
    passes: number,
): TerritoryFrontierPhaseFieldLayer {
    if (passes <= 0 || layer.cols <= 0 || layer.rows <= 0) {
        return layer;
    }
    let values = layer.values.slice();
    for (let pass = 0; pass < passes; pass++) {
        values = blurScalarField3Tap(values, layer.cols, layer.rows, layer.validMask);
    }
    return {
        ...layer,
        values,
    };
}

export function blurTerritoryFrontierPhaseField(
    phaseField: TerritoryFrontierPhaseFieldPayload,
    passes: number,
): TerritoryFrontierPhaseFieldPayload {
    if (passes <= 0) return phaseField;
    return {
        layers: phaseField.layers.map((layer) =>
            blurTerritoryFrontierLayer(layer, passes),
        ),
    };
}
