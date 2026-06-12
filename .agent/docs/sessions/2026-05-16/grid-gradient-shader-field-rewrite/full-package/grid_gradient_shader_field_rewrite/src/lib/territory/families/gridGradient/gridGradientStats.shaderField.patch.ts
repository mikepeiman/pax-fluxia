// Patch into pax-fluxia/src/lib/territory/families/gridGradient/gridGradientStats.ts
// Extend GridGradientStats and INITIAL with these fields.

export interface GridGradientShaderFieldStatsFragment {
    readonly drawBackend: 'graphics' | 'shader_field' | 'mesh_quads';
    readonly planCacheHit: boolean;
    readonly planRebuildReason: string | null;
    readonly presentationCacheHit: boolean;
    readonly presentationRebuildReason: string | null;
    readonly textureUploaded: boolean;
    readonly textureUploadMs: number;
    readonly texturePackMs: number;
    readonly distanceBuildMs: number;
    readonly ownerSummaryBuildMs: number;
    readonly uniformUpdateMs: number;
    readonly ownerTextureBytes: number;
    readonly metricsTextureBytes: number;
    readonly paletteTextureBytes: number;
    readonly textureBytes: number;
    readonly activeTransitionCells: number;
    readonly outsideCells: number;
    readonly shaderNeighborMode: string;
    readonly shaderDebugMode: string;
}

export const GRID_GRADIENT_SHADER_FIELD_INITIAL_STATS: GridGradientShaderFieldStatsFragment = {
    drawBackend: 'graphics',
    planCacheHit: false,
    planRebuildReason: null,
    presentationCacheHit: false,
    presentationRebuildReason: null,
    textureUploaded: false,
    textureUploadMs: 0,
    texturePackMs: 0,
    distanceBuildMs: 0,
    ownerSummaryBuildMs: 0,
    uniformUpdateMs: 0,
    ownerTextureBytes: 0,
    metricsTextureBytes: 0,
    paletteTextureBytes: 0,
    textureBytes: 0,
    activeTransitionCells: 0,
    outsideCells: 0,
    shaderNeighborMode: 'eight',
    shaderDebugMode: 'off',
};
