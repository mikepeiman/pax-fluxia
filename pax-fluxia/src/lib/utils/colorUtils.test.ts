import { describe, expect, it } from 'vitest';
import { adjustColorHSL } from './colorUtils';

describe('adjustColorHSL', () => {
    it('applies hue shift while preserving existing saturation and lightness multipliers', () => {
        expect(adjustColorHSL(0xff0000, 1, 1, 120)).toBe(0x00ff00);
        expect(adjustColorHSL(0xff0000, 1, 1, -120)).toBe(0x0000ff);
    });
});
