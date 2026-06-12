import * as PIXI from 'pixi.js';
import {
    GRID_GRADIENT_SHADER_FIELD_FRAGMENT,
    GRID_GRADIENT_SHADER_FIELD_VERTEX,
} from './gridGradientShaderFieldShaders';
import type {
    GridGradientShaderDebugMode,
    GridGradientShaderFieldStats,
    GridGradientShaderFieldUpdateParams,
    GridGradientShaderNeighborMode,
} from './gridGradientShaderFieldTypes';

function asAny<T = any>(value: unknown): T {
    return value as T;
}

function now(): number {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function backendToNeighborNumber(mode: GridGradientShaderNeighborMode): number {
    if (mode === 'center') return 0;
    if (mode === 'cross') return 1;
    return 2;
}

function debugModeToNumber(mode: GridGradientShaderDebugMode): number {
    switch (mode) {
        case 'cell_grid': return 1;
        case 'owner_index': return 2;
        case 'distance_band': return 3;
        case 'flip_time': return 4;
        case 'role': return 5;
        default: return 0;
    }
}

function shapeToNumber(shape: string): number {
    if (shape === 'square') return 1;
    if (shape === 'diamond') return 2;
    if (shape === 'noise') return 3;
    return 0;
}

function createBufferTexture(data: Uint8Array, width: number, height: number): PIXI.Texture {
    const TextureAny = asAny(PIXI.Texture);
    if (typeof TextureAny.fromBuffer === 'function') {
        return TextureAny.fromBuffer(data, width, height, {
            format: asAny(PIXI).FORMATS?.RGBA,
            type: asAny(PIXI).TYPES?.UNSIGNED_BYTE,
            scaleMode: asAny(PIXI).SCALE_MODES?.NEAREST,
        });
    }

    // Pixi 8 environments may expose buffer sources differently. This fallback
    // keeps the integration point explicit for the in-project patch agent.
    const tex = TextureAny.from({ resource: data, width, height });
    return tex as PIXI.Texture;
}

function destroyTexture(texture: PIXI.Texture | null): void {
    if (!texture) return;
    try {
        texture.destroy(true);
    } catch {
        texture.destroy();
    }
}

function createQuadGeometry(worldMinX: number, worldMinY: number, worldWidth: number, worldHeight: number): PIXI.Geometry {
    const x0 = worldMinX;
    const y0 = worldMinY;
    const x1 = worldMinX + worldWidth;
    const y1 = worldMinY + worldHeight;

    const GeometryAny = asAny(PIXI.Geometry);
    const geometry = new GeometryAny();
    geometry.addAttribute('aVertexPosition', new Float32Array([
        x0, y0,
        x1, y0,
        x1, y1,
        x0, y1,
    ]), 2);
    geometry.addAttribute('aTextureCoord', new Float32Array([
        0, 0,
        1, 0,
        1, 1,
        0, 1,
    ]), 2);
    geometry.addIndex(new Uint16Array([0, 1, 2, 0, 2, 3]));
    return geometry as PIXI.Geometry;
}

function createShader(uniforms: Record<string, unknown>): PIXI.Shader {
    const ShaderAny = asAny(PIXI.Shader);
    const ProgramAny = asAny(PIXI).Program;

    if (typeof ShaderAny.from === 'function') {
        try {
            return ShaderAny.from(
                GRID_GRADIENT_SHADER_FIELD_VERTEX,
                GRID_GRADIENT_SHADER_FIELD_FRAGMENT,
                uniforms,
            ) as PIXI.Shader;
        } catch {
            // Continue to alternate Pixi 8 shape below.
        }
    }

    if (ProgramAny && typeof ProgramAny.from === 'function') {
        return new ShaderAny(
            ProgramAny.from(
                GRID_GRADIENT_SHADER_FIELD_VERTEX,
                GRID_GRADIENT_SHADER_FIELD_FRAGMENT,
            ),
            uniforms,
        ) as PIXI.Shader;
    }

    // Last-resort adapter point. The patch agent should replace this branch
    // with the exact Pixi 8 shader construction used in the app runtime.
    return new ShaderAny({
        glProgram: asAny(PIXI).GlProgram?.from?.({
            vertex: GRID_GRADIENT_SHADER_FIELD_VERTEX,
            fragment: GRID_GRADIENT_SHADER_FIELD_FRAGMENT,
        }),
        resources: { uniforms },
    }) as PIXI.Shader;
}

function setShaderUniform(shader: PIXI.Shader | null, key: string, value: unknown): void {
    if (!shader) return;
    const anyShader = asAny(shader);
    if (anyShader.uniforms && key in anyShader.uniforms) {
        anyShader.uniforms[key] = value;
        return;
    }
    if (anyShader.resources?.uniforms?.uniforms && key in anyShader.resources.uniforms.uniforms) {
        anyShader.resources.uniforms.uniforms[key] = value;
        return;
    }
    if (anyShader.resources?.uniforms && key in anyShader.resources.uniforms) {
        anyShader.resources.uniforms[key] = value;
    }
}

function setUniforms(shader: PIXI.Shader | null, values: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(values)) {
        setShaderUniform(shader, key, value);
    }
}

/**
 * Shader-field backend for Grid Gradient.
 *
 * This renderer intentionally replaces the dense Pixi Graphics cell-fill path.
 * It draws a single world-space quad and reconstructs stippled grid marks in
 * the fragment shader from packed owner/metrics/palette textures.
 */
export class GridGradientShaderFieldRenderer {
    private readonly root = new PIXI.Container();
    private mesh: PIXI.Mesh | null = null;
    private shader: PIXI.Shader | null = null;
    private geometry: PIXI.Geometry | null = null;

    private ownerTexture: PIXI.Texture | null = null;
    private metricsTexture: PIXI.Texture | null = null;
    private paletteTexture: PIXI.Texture | null = null;

    private textureSignature: string | null = null;
    private geometrySignature: string | null = null;

    get container(): PIXI.Container {
        return this.root;
    }

    update(params: GridGradientShaderFieldUpdateParams): GridGradientShaderFieldStats {
        const uploadStart = now();
        const textureUploaded = this.ensureTextures(params);
        const textureUploadMs = now() - uploadStart;

        this.ensureMesh(params);

        const uniformStart = now();
        this.updateUniforms(params);
        const uniformUpdateMs = now() - uniformStart;

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
        };
    }

    hide(): void {
        this.root.visible = false;
    }

    private ensureTextures(params: GridGradientShaderFieldUpdateParams): boolean {
        const signature = [
            params.plan.planKey,
            params.plan.presentationKey,
            params.plan.cols,
            params.plan.rows,
            params.plan.paletteSize,
        ].join('|');
        if (this.textureSignature === signature && this.ownerTexture && this.metricsTexture && this.paletteTexture) {
            return false;
        }

        destroyTexture(this.ownerTexture);
        destroyTexture(this.metricsTexture);
        destroyTexture(this.paletteTexture);

        this.ownerTexture = createBufferTexture(params.plan.ownerTextureData, params.plan.cols, params.plan.rows);
        this.metricsTexture = createBufferTexture(params.plan.metricsTextureData, params.plan.cols, params.plan.rows);
        this.paletteTexture = createBufferTexture(params.plan.paletteTextureData, params.plan.paletteSize, 1);
        this.textureSignature = signature;

        if (this.shader) {
            setUniforms(this.shader, {
                uOwnerTex: this.ownerTexture,
                uMetricsTex: this.metricsTexture,
                uPaletteTex: this.paletteTexture,
            });
        }
        return true;
    }

    private ensureMesh(params: GridGradientShaderFieldUpdateParams): void {
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

        this.geometry = createQuadGeometry(
            params.plan.worldMinX,
            params.plan.worldMinY,
            params.plan.worldWidth,
            params.plan.worldHeight,
        );

        const uniforms = this.makeInitialUniforms(params);
        this.shader = createShader(uniforms);
        const MeshAny = asAny(PIXI.Mesh);
        this.mesh = new MeshAny(this.geometry, this.shader) as PIXI.Mesh;
        this.root.addChild(this.mesh);
        this.geometrySignature = geometrySignature;
    }

    private makeInitialUniforms(params: GridGradientShaderFieldUpdateParams): Record<string, unknown> {
        return {
            uOwnerTex: this.ownerTexture,
            uMetricsTex: this.metricsTexture,
            uPaletteTex: this.paletteTexture,
            uGridSize: new Float32Array([params.plan.cols, params.plan.rows]),
            uWorldOrigin: new Float32Array([params.plan.worldMinX, params.plan.worldMinY]),
            uWorldSize: new Float32Array([params.plan.worldWidth, params.plan.worldHeight]),
            uSpacingPx: params.plan.spacingPx,
            uPaletteSize: params.plan.paletteSize,
            uProgress: params.progress,
            uTimeSec: params.nowMs / 1000,
            uFillAlpha: params.settings.fillAlpha,
            uCenterSizePx: params.settings.centerSizePx,
            uEdgeSizePx: params.settings.edgeSizePx,
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
            uNeighborMode: backendToNeighborNumber(params.shaderSettings.neighborMode),
            uDebugMode: debugModeToNumber(params.shaderSettings.shaderDebugMode),
        };
    }

    private updateUniforms(params: GridGradientShaderFieldUpdateParams): void {
        setUniforms(this.shader, this.makeInitialUniforms(params));
    }

    dispose(): void {
        destroyTexture(this.ownerTexture);
        destroyTexture(this.metricsTexture);
        destroyTexture(this.paletteTexture);
        this.mesh?.destroy();
        this.geometry?.destroy();
        this.root.destroy({ children: true });
        this.ownerTexture = null;
        this.metricsTexture = null;
        this.paletteTexture = null;
        this.mesh = null;
        this.shader = null;
        this.geometry = null;
        this.textureSignature = null;
        this.geometrySignature = null;
    }
}
