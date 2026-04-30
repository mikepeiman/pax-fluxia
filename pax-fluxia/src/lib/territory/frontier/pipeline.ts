import { blurTerritoryFrontierPhaseField } from './blur';
import { smoothTerritoryFrontierContourLayers } from './chaikin';
import { extractTerritoryFrontierContours } from './contours';
import type {
    TerritoryFrontierContourLayerResult,
    TerritoryFrontierContourTechniqueId,
    TerritoryFrontierPhaseFieldPayload,
    TerritoryFrontierPresentationAdapterResult,
    TerritoryFrontierTechniqueId,
    TerritoryFrontierTriangleDiagonalPolicy,
} from './types';

export interface BuildTerritoryFrontierPresentationParams {
    readonly phaseField: TerritoryFrontierPhaseFieldPayload;
    readonly technique: TerritoryFrontierTechniqueId;
    readonly blurPasses: number;
    readonly chaikinPasses: number;
    readonly triangleDiagonalPolicy: TerritoryFrontierTriangleDiagonalPolicy;
}

function isContourTechnique(
    technique: TerritoryFrontierTechniqueId,
): technique is TerritoryFrontierContourTechniqueId {
    return technique !== 'control' && technique !== 'shader_frontier_band';
}

export function buildTerritoryFrontierPresentation(
    params: BuildTerritoryFrontierPresentationParams,
): TerritoryFrontierPresentationAdapterResult {
    const blurStartMs = performance.now();
    const phaseField =
        params.blurPasses > 0
            ? blurTerritoryFrontierPhaseField(params.phaseField, params.blurPasses)
            : params.phaseField;
    const blurMs = performance.now() - blurStartMs;

    let contourExtractionMs = 0;
    let smoothingMs = 0;
    let contourLayers: TerritoryFrontierContourLayerResult[] = [];
    let polylineCount = 0;
    let emittedVertexCount = 0;

    if (isContourTechnique(params.technique)) {
        const contourStartMs = performance.now();
        const contourResult = extractTerritoryFrontierContours({
            phaseField,
            technique: params.technique,
            triangleDiagonalPolicy: params.triangleDiagonalPolicy,
        });
        contourExtractionMs = performance.now() - contourStartMs;

        const smoothStartMs = performance.now();
        contourLayers =
            params.chaikinPasses > 0
                ? smoothTerritoryFrontierContourLayers(
                      contourResult.layers,
                      params.chaikinPasses,
                  )
                : contourResult.layers.map((layer) => ({ ...layer }));
        smoothingMs = performance.now() - smoothStartMs;
        polylineCount = contourLayers.reduce(
            (total, layer) => total + layer.polylines.length,
            0,
        );
        emittedVertexCount = contourLayers.reduce(
            (total, layer) => total + layer.vertexCount,
            0,
        );
    }

    const phaseGridCols = phaseField.layers.reduce(
        (maxCols, layer) => Math.max(maxCols, layer.cols),
        0,
    );
    const phaseGridRows = phaseField.layers.reduce(
        (maxRows, layer) => Math.max(maxRows, layer.rows),
        0,
    );

    return {
        technique: params.technique,
        phaseField,
        fillLayers: phaseField.layers,
        frontierBandLayers:
            params.technique === 'shader_frontier_band' ? phaseField.layers : [],
        contourLayers,
        outlineLayers: contourLayers,
        glowLayers: contourLayers,
        metrics: {
            phaseLayerCount: phaseField.layers.length,
            phaseGridCols,
            phaseGridRows,
            blurMs,
            contourExtractionMs,
            smoothingMs,
            polylineCount,
            emittedVertexCount,
        },
    };
}
