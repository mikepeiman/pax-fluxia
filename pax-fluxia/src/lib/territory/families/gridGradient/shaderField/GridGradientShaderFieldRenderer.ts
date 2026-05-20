import * as PIXI from 'pixi.js';
import { compileHighShaderGlProgram, localUniformBitGl, roundPixelsBitGl } from 'pixi.js';
import { gridGradientShaderFieldBitGl } from './gridGradientShaderFieldShaders';
import type {
    GridGradientShaderFieldStats,
    GridGradientShaderFieldUpdateParams,
    GridGradientShaderNeighborMode,
} from './gridGradientShaderFieldTypes';

interface BufferTextureState {
    source: PIXI.BufferImageSource;
    texture: PIXI.Texture;
    width: number;
    height: number;
    byteLength: number;
}

let cachedProgram: ReturnType<typeof compileHighShaderGlProgram> | null = null;

function getProgram(): ReturnType<typeof compileHighShaderGlProgram> {
    if (!cachedProgram) {
        cachedProgram = compileHighShaderGlProgram({
            bits: [roundPixelsBitGl, localUniformBitGl, gridGradientShaderFieldBitGl],
            name: 'grid-gradient-shader-field',
        });
    }
    return cachedProgram;
}

function now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function neighborModeToNumber(mode: GridGradientShaderNeighborMode): number {
    if (mode === 'center') return 0;
    if (mode === 'cross') return 1;
    return 2;
}

function shapeToNumber(shape: string): number {
    if (shape === 'square') return 1;
    if (shape === 'noise') return 2;
    return 0;
}

function createBufferTexture(
    data: Uint8Array,
    width: number,
    height: number,
): BufferTextureState {
    const source = new PIXI.BufferImageSource({
        resource: data,
        width,
        height,
        format: 'rgba8unorm',
        alphaMode: 'no-premultiply-alpha',
        scaleMode: 'nearest',
        autoGarbageCollect: false,
    });
    return {
        source,
        texture: new PIXI.Texture({ source }),
        width,
        height,
        byteLength: data.byteLength,
    };
}

function updateBufferTexture(
    state: BufferTextureState | null,
    data: Uint8Array,
    width: number,
    height: number,
): BufferTextureState {
    if (!state) {
        return createBufferTexture(data, width, height);
    }
    state.source.resource = data;
    state.source.width = width;
    state.source.height = height;
    state.width = width;
    state.height = height;
    state.byteLength = data.byteLength;
    state.source.update();
    return state;
}

function destroyBufferTexture(state: BufferTextureState | null): void {
    if (!state) return;
    state.texture.destroy(true);
}

function makeQuadGeometry(params: {
    worldMinX: number;
    worldMinY: number;
    worldWidth: number;
    worldHeight: number;
}): PIXI.MeshGeometry {
    const x0 = params.worldMinX;
    const y0 = params.worldMinY;
    const x1 = params.worldMinX + params.worldWidth;
    const y1 = params.worldMinY + params.worldHeight;
    return new PIXI.MeshGeometry({
        positions: new Float32Array([x0, y0, x1, y0, x1, y1, x0, y1]),
        uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
        topology: 'triangle-list',
    });
}

function setTextureResource(
    shader: PIXI.Shader,
    key: string,
    source: PIXI.TextureSource,
): void {
    (shader.resources as Record<string, unknown>)[key] = source;
}

function updateUniformGroup(shader: PIXI.Shader, values: Record<string, unknown>): void {
    const group = (shader.resources as any).gridGradientShaderUniforms;
    const uniforms = group?.uniforms as Record<string, unknown> | undefined;
    if (!uniforms) return;
    for (const [key, value] of Object.entries(values)) {
        uniforms[key] = value;
    }
    group.update?.();
}

export class GridGradientShaderFieldRenderer {
    private readonly root = new PIXI.Container();
    private ownerTexture: BufferTextureState | null = null;
    private metricsTexture: BufferTextureState | null = null;
    private paletteTexture: BufferTextureState | null = null;
    private shader: PIXI.Shader | null = null;
    private geometry: PIXI.MeshGeometry | null = null;
    private mesh: PIXI.Mesh | null = null;
    private textureSignature: string | null = null;
    private geometrySignature: string | null = null;

    get container(): PIXI.Container {
        return this.root;
    }

    update(params: GridGradientShaderFieldUpdateParams): GridGradientShaderFieldStats {
        const uploadStartMs = now();
        const textureUploaded = this.ensureTextures(params);
        const textureUploadMs = now() - uploadStartMs;

        this.ensureMesh(params);

        const uniformStartMs = now();
        this.updateUniforms(params);
        const uniformUpdateMs = now() - uniformStartMs;

        this.root.visible = true;
        return {
            drawBackend: 'shader_field',
            neighborMode: params.shaderSettings.neighborMode,
            textureUploaded,
            textureUploadMs,
            uniformUpdateMs,
            ownerTextureBytes: params.plan.ownerTextureData.byteLength,
            metricsTextureBytes: params.plan.metricsTextureData.byteLength,
            paletteTextureBytes: params.plan.paletteTextureData.byteLength,
            textureBytes: params.plan.textureBytes,
            totalCells: params.plan.totalCells,
            emittableCells: params.plan.emittableCells,
            activeTransitionCells: params.plan.activeTransitionCells,
            outsideCells: params.plan.outsideCells,
            fallbackReason: null,
        };
    }

    hide(): void {
        this.root.visible = false;
    }

    private ensureTextures(params: GridGradientShaderFieldUpdateParams): boolean {
        const signature = [
            params.plan.presentationKey,
            params.plan.cols,
            params.plan.rows,
            params.plan.paletteSize,
        ].join('|');
        if (
            this.textureSignature === signature &&
            this.ownerTexture &&
            this.metricsTexture &&
            this.paletteTexture
        ) {
            return false;
        }

        this.ownerTexture = updateBufferTexture(
            this.ownerTexture,
            params.plan.ownerTextureData,
            Math.max(1, params.plan.cols),
            Math.max(1, params.plan.rows),
        );
        this.metricsTexture = updateBufferTexture(
            this.metricsTexture,
            params.plan.metricsTextureData,
            Math.max(1, params.plan.cols),
            Math.max(1, params.plan.rows),
        );
        this.paletteTexture = updateBufferTexture(
            this.paletteTexture,
            params.plan.paletteTextureData,
            Math.max(1, params.plan.paletteSize),
            1,
        );
        this.textureSignature = signature;

        if (this.shader) {
            setTextureResource(this.shader, 'uOwnerTex', this.ownerTexture.texture.source);
            setTextureResource(this.shader, 'uMetricsTex', this.metricsTexture.texture.source);
            setTextureResource(this.shader, 'uPaletteTex', this.paletteTexture.texture.source);
        }
        return true;
    }

    private ensureMesh(params: GridGradientShaderFieldUpdateParams): void {
        if (!this.ownerTexture || !this.metricsTexture || !this.paletteTexture) {
            throw new Error('Grid Gradient shader textures are not initialized.');
        }

        const geometrySignature = [
            params.plan.worldMinX,
            params.plan.worldMinY,
            params.plan.worldWidth,
            params.plan.worldHeight,
        ].join('|');
        if (this.mesh && this.shader && this.geometrySignature === geometrySignature) {
            return;
        }

        if (this.mesh) {
            this.root.removeChild(this.mesh);
            this.mesh.destroy();
            this.mesh = null;
        }
        this.geometry?.destroy();
        this.geometry = makeQuadGeometry(params.plan);

        if (!this.shader) {
            this.shader = new PIXI.Shader({
                glProgram: getProgram(),
                resources: {
                    gridGradientShaderUniforms: this.makeUniforms(params),
                    uOwnerTex: this.ownerTexture.texture.source,
                    uMetricsTex: this.metricsTexture.texture.source,
                    uPaletteTex: this.paletteTexture.texture.source,
                },
            });
        }

        this.mesh = new PIXI.Mesh({
            geometry: this.geometry,
            shader: this.shader,
        }) as PIXI.Mesh;
        this.root.addChild(this.mesh);
        this.geometrySignature = geometrySignature;
    }

    private makeUniforms(params: GridGradientShaderFieldUpdateParams): Record<string, unknown> {
        return {
            uGridSize: {
                value: new Float32Array([params.plan.cols, params.plan.rows]),
                type: 'vec2<f32>',
            },
            uWorldOrigin: {
                value: new Float32Array([params.plan.gridOriginX, params.plan.gridOriginY]),
                type: 'vec2<f32>',
            },
            uWorldSize: {
                value: new Float32Array([params.plan.worldWidth, params.plan.worldHeight]),
                type: 'vec2<f32>',
            },
            uSpacingPx: { value: params.plan.spacingPx, type: 'f32' },
            uPaletteSize: { value: params.plan.paletteSize, type: 'f32' },
            uProgress: { value: params.progress, type: 'f32' },
            uTimeSec: { value: params.nowMs / 1000, type: 'f32' },
            uFillAlpha: { value: params.settings.fillAlpha, type: 'f32' },
            uCenterSizePx: { value: params.settings.centerSizePx, type: 'f32' },
            uEdgeSizePx: { value: params.settings.edgeSizePx, type: 'f32' },
            uBorderOffsetPx: { value: params.settings.borderOffsetPx, type: 'f32' },
            uCurvePower: { value: params.settings.curvePower, type: 'f32' },
            uMarkSoftness: { value: params.shaderSettings.shaderMarkSoftness, type: 'f32' },
            uEdgeSoftnessPx: {
                value: params.shaderSettings.shaderEdgeSoftnessPx,
                type: 'f32',
            },
            uNoiseStrength: {
                value: params.shaderSettings.shaderNoiseStrength,
                type: 'f32',
            },
            uPulseStrength: {
                value: params.shaderSettings.shaderPulseStrength,
                type: 'f32',
            },
            uPulseSpeed: { value: params.shaderSettings.shaderPulseSpeed, type: 'f32' },
            uFieldDriftPx: {
                value: params.shaderSettings.shaderFieldDriftPx,
                type: 'f32',
            },
            uFieldDriftSpeed: {
                value: params.shaderSettings.shaderFieldDriftSpeed,
                type: 'f32',
            },
            uGlowStrength: {
                value: params.shaderSettings.shaderGlowStrength,
                type: 'f32',
            },
            uInteriorAlphaBoost: {
                value: params.shaderSettings.shaderInteriorAlphaBoost,
                type: 'f32',
            },
            uEdgeAlphaBoost: {
                value: params.shaderSettings.shaderEdgeAlphaBoost,
                type: 'f32',
            },
            uColorMixPower: {
                value: params.shaderSettings.shaderColorMixPower,
                type: 'f32',
            },
            uShapeMode: { value: shapeToNumber(params.settings.cellShape), type: 'f32' },
            uNeighborMode: {
                value: neighborModeToNumber(params.shaderSettings.neighborMode),
                type: 'f32',
            },
        };
    }

    private updateUniforms(params: GridGradientShaderFieldUpdateParams): void {
        if (!this.shader) return;
        updateUniformGroup(this.shader, {
            uGridSize: new Float32Array([params.plan.cols, params.plan.rows]),
            uWorldOrigin: new Float32Array([params.plan.gridOriginX, params.plan.gridOriginY]),
            uWorldSize: new Float32Array([params.plan.worldWidth, params.plan.worldHeight]),
            uSpacingPx: params.plan.spacingPx,
            uPaletteSize: params.plan.paletteSize,
            uProgress: params.progress,
            uTimeSec: params.nowMs / 1000,
            uFillAlpha: params.settings.fillAlpha,
            uCenterSizePx: params.settings.centerSizePx,
            uEdgeSizePx: params.settings.edgeSizePx,
            uBorderOffsetPx: params.settings.borderOffsetPx,
            uCurvePower: params.settings.curvePower,
            uMarkSoftness: params.shaderSettings.shaderMarkSoftness,
            uEdgeSoftnessPx: params.shaderSettings.shaderEdgeSoftnessPx,
            uNoiseStrength: params.shaderSettings.shaderNoiseStrength,
            uPulseStrength: params.shaderSettings.shaderPulseStrength,
            uPulseSpeed: params.shaderSettings.shaderPulseSpeed,
            uFieldDriftPx: params.shaderSettings.shaderFieldDriftPx,
            uFieldDriftSpeed: params.shaderSettings.shaderFieldDriftSpeed,
            uGlowStrength: params.shaderSettings.shaderGlowStrength,
            uInteriorAlphaBoost: params.shaderSettings.shaderInteriorAlphaBoost,
            uEdgeAlphaBoost: params.shaderSettings.shaderEdgeAlphaBoost,
            uColorMixPower: params.shaderSettings.shaderColorMixPower,
            uShapeMode: shapeToNumber(params.settings.cellShape),
            uNeighborMode: neighborModeToNumber(params.shaderSettings.neighborMode),
        });
    }

    dispose(): void {
        destroyBufferTexture(this.ownerTexture);
        destroyBufferTexture(this.metricsTexture);
        destroyBufferTexture(this.paletteTexture);
        this.mesh?.destroy();
        this.geometry?.destroy();
        this.root.destroy({ children: true });
        this.ownerTexture = null;
        this.metricsTexture = null;
        this.paletteTexture = null;
        this.shader = null;
        this.geometry = null;
        this.mesh = null;
        this.textureSignature = null;
        this.geometrySignature = null;
    }
}
