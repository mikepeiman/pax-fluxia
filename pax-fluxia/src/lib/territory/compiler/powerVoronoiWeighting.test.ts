import { describe, expect, it } from 'vitest';
import {
    resolvePowerVoronoiBaseWeight,
    resolvePowerVoronoiWeightedSite,
} from './powerVoronoiWeighting';

describe('powerVoronoiWeighting', () => {
    it('uses a stable generator base weight independent of MSR tuning', () => {
        expect(resolvePowerVoronoiBaseWeight()).toBe(2025);
    });

    it('scales virtual-site weights from the stable base weight', () => {
        expect(resolvePowerVoronoiWeightedSite(0.5)).toBe(1012.5);
        expect(resolvePowerVoronoiWeightedSite(1)).toBe(2025);
    });
});
