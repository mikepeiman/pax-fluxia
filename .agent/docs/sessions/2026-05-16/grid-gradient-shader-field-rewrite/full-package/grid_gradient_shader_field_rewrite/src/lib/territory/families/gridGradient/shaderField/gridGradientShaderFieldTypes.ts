import type * as PIXI from 'pixi.js';
import type { GridClassification, GridWavePlan } from '../../metaballGrid/metaballGridTypes';
import type { GridGradientSettings } from '../settings';
import type { GridGradientPalette } from '../paint';
import type { OwnershipGridFrontierDistanceField } from '$lib/territory/frontier';

export type GridGradientDrawBackend = 'graphics' | 'shader_field' | 'mesh_quads';

export type GridGradientShaderNeighborMode = 'center' | 'cross' | 'eight';

export type GridGradientShaderFieldShape = 'circle' | 'square' | 'diamond' | 'noise';

export type GridGradientShaderDebugMode =
    | 'off'
    | 'cell_grid'
    | 'owner_index'
    | 'distance_band'
    | 'flip_time'
    | 'role';

export interface GridGradientShaderFieldSettings {
    readonly backend: GridGradientDrawBackend;
    readonly neighborMode: GridGradientShaderNeighborMode;
    readonly shaderResolutionScale: number;
    readonly shaderMarkSoftness: number;
    readonly shaderEdgeSoftnessPx: number;
    readonly shaderNoiseStrength: number;
    readonly shaderPulseStrength: number;
    readonly shaderPulseSpeed: number;
    readonly shaderFieldDriftPx: number;
    readonly shaderFieldDriftSpeed: number;
    readonly shaderGlowStrength: number;
    readonly shaderBlurStrength: number;
    readonly shaderInteriorAlphaBoost: number;
    readonly shaderEdgeAlphaBoost: number;
    readonly shaderColorMixPower: number;
    readonly shaderDebugMode: GridGradientShaderDebugMode;
}

export interface GridGradientShaderFieldTexturePlan {
    readonly planKey: string;
    readonly presentationKey: string;
    readonly cols: number;
    readonly rows: number;
    readonly worldMinX: number;
    readonly worldMinY: number;
    readonly worldWidth: number;
    readonly worldHeight: number;
    readonly spacingPx: number;
    readonly requestedSpacingPx: number;

    /** RGBA8: prevOwnerLo, prevOwnerHi, nextOwnerLo, nextOwnerHi. */
    readonly ownerTextureData: Uint8Array;
    /** RGBA8: distanceBand, flipTime, role, noise. */
    readonly metricsTextureData: Uint8Array;
    /** RGBA8 row texture. Index 0 is transparent outside/null owner. */
    readonly paletteTextureData: Uint8Array;
    readonly paletteSize: number;

    /** Original owner ids in palette order. Index 0 is null/outside. */
    readonly ownerIdByPaletteIndex: readonly (string | null)[];

    readonly totalCells: number;
    readonly emittableCells: number;
    readonly activeTransitionCells: number;
    readonly outsideCells: number;

    readonly texturePackMs: number;
    readonly distanceBuildMs: number;
    readonly ownerSummaryBuildMs: number;
    readonly textureBytes: number;
}

export interface GridGradientShaderFieldUpdateParams {
    readonly plan: GridGradientShaderFieldTexturePlan;
    readonly settings: GridGradientSettings;
    readonly shaderSettings: GridGradientShaderFieldSettings;
    readonly progress: number;
    readonly nowMs: number;
    readonly renderer?: PIXI.Renderer;
}

export interface GridGradientShaderFieldStats {
    readonly drawBackend: GridGradientDrawBackend;
    readonly neighborMode: GridGradientShaderNeighborMode;
    readonly textureUploaded: boolean;
    readonly textureUploadMs: number;
    readonly uniformUpdateMs: number;
    readonly ownerTextureBytes: number;
    readonly metricsTextureBytes: number;
    readonly paletteTextureBytes: number;
    readonly textureBytes: number;
    readonly totalCells: number;
    readonly emittableCells: number;
    readonly activeTransitionCells: number;
}

export interface BuildGridGradientShaderFieldTexturePlanParams {
    readonly planKey: string;
    readonly presentationKey: string;
    readonly classification: GridClassification;
    readonly wavePlan: GridWavePlan;
    readonly palette: GridGradientPalette;
    readonly settings: GridGradientSettings;
    readonly distanceField: OwnershipGridFrontierDistanceField;
    readonly ownerIndexByCell: Int32Array;
    readonly ownerMaxDistancePxByIndex: readonly number[];
    readonly world: { width: number; height: number; minX?: number; minY?: number };
}
