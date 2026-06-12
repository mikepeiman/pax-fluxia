import type * as PIXI from 'pixi.js';

export type PixiRendererBackend = 'webgl' | 'webgpu' | 'canvas' | 'unknown';

export interface PixiRendererDiagnostics {
    readonly rendererType: PixiRendererBackend;
    readonly rendererTypeSource: 'reported' | 'class' | 'feature' | 'missing';
    readonly rendererConstructorName: string | null;
    readonly rendererReportedType: string | null;
    readonly rendererHasWebGPUDevice: boolean;
    readonly rendererHasWebGLContext: boolean;
}

function asObject(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null
        ? (value as Record<string, unknown>)
        : null;
}

function readString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
}

function readConstructorName(value: unknown): string | null {
    if (
        (typeof value !== 'object' && typeof value !== 'function') ||
        value === null
    ) {
        return null;
    }
    const ctor = (value as { constructor?: unknown }).constructor;
    if (typeof ctor === 'function') return readString(ctor.name);
    return readString(asObject(ctor)?.name);
}

function normalizeRendererType(value: string | null): PixiRendererBackend | null {
    if (!value) return null;
    const normalized = value.toLowerCase();
    if (normalized.includes('webgpu')) return 'webgpu';
    if (normalized.includes('webgl')) return 'webgl';
    if (normalized.includes('canvas')) return 'canvas';
    return null;
}

export function resolvePixiRendererDiagnostics(
    renderer: PIXI.Renderer | null | undefined,
): PixiRendererDiagnostics {
    const rendererObject = asObject(renderer);
    if (!rendererObject) {
        return {
            rendererType: 'unknown',
            rendererTypeSource: 'missing',
            rendererConstructorName: null,
            rendererReportedType: null,
            rendererHasWebGPUDevice: false,
            rendererHasWebGLContext: false,
        };
    }

    const constructorName = readConstructorName(renderer);
    const reportedType =
        readString(rendererObject.type) ??
        readString(rendererObject.rendererType);
    const reportedBackend = normalizeRendererType(reportedType);

    const gpuSystem = asObject(rendererObject.gpu);
    const contextSystem = asObject(rendererObject.context);
    const directGl = asObject(rendererObject.gl);
    const contextGl = asObject(contextSystem?.gl);
    const rendererHasWebGPUDevice = Boolean(
        gpuSystem ||
            asObject(rendererObject.device) ||
            asObject(rendererObject.encoder),
    );
    const rendererHasWebGLContext = Boolean(
        directGl ||
            contextGl ||
            normalizeRendererType(readConstructorName(contextSystem)) === 'webgl',
    );

    if (reportedBackend) {
        return {
            rendererType: reportedBackend,
            rendererTypeSource: 'reported',
            rendererConstructorName: constructorName,
            rendererReportedType: reportedType,
            rendererHasWebGPUDevice,
            rendererHasWebGLContext,
        };
    }

    const classBackend = normalizeRendererType(constructorName);
    if (classBackend) {
        return {
            rendererType: classBackend,
            rendererTypeSource: 'class',
            rendererConstructorName: constructorName,
            rendererReportedType: reportedType,
            rendererHasWebGPUDevice,
            rendererHasWebGLContext,
        };
    }

    if (rendererHasWebGPUDevice) {
        return {
            rendererType: 'webgpu',
            rendererTypeSource: 'feature',
            rendererConstructorName: constructorName,
            rendererReportedType: reportedType,
            rendererHasWebGPUDevice,
            rendererHasWebGLContext,
        };
    }

    if (rendererHasWebGLContext) {
        return {
            rendererType: 'webgl',
            rendererTypeSource: 'feature',
            rendererConstructorName: constructorName,
            rendererReportedType: reportedType,
            rendererHasWebGPUDevice,
            rendererHasWebGLContext,
        };
    }

    return {
        rendererType: 'unknown',
        rendererTypeSource: 'missing',
        rendererConstructorName: constructorName,
        rendererReportedType: reportedType,
        rendererHasWebGPUDevice,
        rendererHasWebGLContext,
    };
}
