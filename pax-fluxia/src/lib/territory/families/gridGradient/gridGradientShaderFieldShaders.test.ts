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

    it('does not apply a hidden color power curve after palette lookup', () => {
        const source = [
            gridGradientShaderFieldBitGl.fragment.header,
            gridGradientShaderFieldBitGl.fragment.main,
        ].join('\n');

        expect(source).not.toContain('uColorMixPower');
        expect(source).not.toContain('pow(max(rgb');
    });

    it('uses per-cell two-axis hashes for pulse and center jitter', () => {
        const source = [
            gridGradientShaderFieldBitGl.fragment.header,
            gridGradientShaderFieldBitGl.fragment.main,
        ].join('\n');

        expect(source).toContain('cellPhaseHash');
        expect(source).toContain('cell.yx * vec2');
        expect(source).toContain('cellPhaseHash(cell, ownerSalt + vec2(101.0, 7.0))');
        expect(source).toContain('cellPhaseHash(cell.yx, ownerSalt.yx + vec2(13.0, 149.0))');
        expect(source).toContain('cellPhaseHash(cell, ownerSalt + vec2(29.0, 83.0))');
        expect(source).not.toContain('valueNoise2d');
        expect(source).not.toContain('cell * 0.11');
        expect(source).not.toContain('cell * 0.29');
        expect(source).not.toContain('sin(uTimeSec * uPulseSpeed + noiseSeed * 6.2831)');
        expect(source).not.toContain('vec2(jitter, -jitter * 0.37)');
    });

    it('renders fill transitions as two scaled dot-grid passes instead of one color-mixed mark', () => {
        const source = [
            gridGradientShaderFieldBitGl.fragment.header,
            gridGradientShaderFieldBitGl.fragment.main,
        ].join('\n');

        expect(source).toContain('float t = saturate(uProgress);');
        expect(source).toContain('transitionMarkScale');
        expect(source).toContain('shadeCellSide');
        expect(source).toContain('shadeCellSide(');
        expect(source).toContain('1.0 - t');
        expect(source).toContain('radius * scale');
        expect(source).not.toContain('smoothstep(flipTime - blendWindow');
        expect(source).not.toContain('vec4 color = mix(prevColor, nextColor, t)');
    });
});
