import { describe, expect, it } from 'vitest';
import { resolvePixiRendererDiagnostics } from './pixiRendererDiagnostics';

describe('resolvePixiRendererDiagnostics', () => {
    it('uses the reported Pixi renderer type when available', () => {
        const diagnostics = resolvePixiRendererDiagnostics({
            type: 'webgpu',
        } as never);

        expect(diagnostics.rendererType).toBe('webgpu');
        expect(diagnostics.rendererTypeSource).toBe('reported');
    });

    it('falls back to renderer class name', () => {
        class TestWebGLRenderer {}
        const diagnostics = resolvePixiRendererDiagnostics(
            new TestWebGLRenderer() as never,
        );

        expect(diagnostics.rendererType).toBe('webgl');
        expect(diagnostics.rendererTypeSource).toBe('class');
        expect(diagnostics.rendererConstructorName).toBe('TestWebGLRenderer');
    });

    it('falls back to renderer feature systems', () => {
        const diagnostics = resolvePixiRendererDiagnostics({
            gpu: { device: {} },
        } as never);

        expect(diagnostics.rendererType).toBe('webgpu');
        expect(diagnostics.rendererTypeSource).toBe('feature');
        expect(diagnostics.rendererHasWebGPUDevice).toBe(true);
    });

    it('returns unknown when the renderer is unavailable', () => {
        const diagnostics = resolvePixiRendererDiagnostics(null);

        expect(diagnostics.rendererType).toBe('unknown');
        expect(diagnostics.rendererTypeSource).toBe('missing');
    });
});
