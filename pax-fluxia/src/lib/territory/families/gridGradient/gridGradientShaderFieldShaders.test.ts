import { describe, expect, it } from 'vitest';
import { gridGradientShaderFieldBitGl } from './shaderField/gridGradientShaderFieldShaders';

describe('gridGradientShaderFieldBitGl', () => {
    it('does not include a full-field diagnostic color overlay in shipped rendering', () => {
        const source = [
            gridGradientShaderFieldBitGl.fragment.header,
            gridGradientShaderFieldBitGl.fragment.main,
        ].join('\n');

        expect(source).not.toContain('uDebugMode');
        expect(source).not.toContain('vec4(0.2, 0.8, 1.0');
    });
});
