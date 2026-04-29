import { describe, expect, it } from 'vitest';
import { normalizeTerritoryTransitionTimingDefaults } from './panelSync';

describe('normalizeTerritoryTransitionTimingDefaults', () => {
    it('releases territory transitions from the old auto-bind policy while preserving duration', () => {
        const stored = {
            tickInterval: 1350,
            territoryTransitionMs: 1350,
            territoryTransitionBindToTick: true,
        };

        const changed = normalizeTerritoryTransitionTimingDefaults(stored);

        expect(changed).toBe(true);
        expect(stored.territoryTransitionMs).toBe(1350);
        expect(stored.territoryTransitionBindToTick).toBe(false);
        expect(stored.territoryTransitionBindingPolicyVersion).toBe(1);
    });

    it('preserves an explicit bind choice when duration is not just a mirrored tick value', () => {
        const stored = {
            tickInterval: 1350,
            territoryTransitionMs: 1700,
            territoryTransitionBindToTick: true,
        };

        const changed = normalizeTerritoryTransitionTimingDefaults(stored);

        expect(changed).toBe(true);
        expect(stored.territoryTransitionMs).toBe(1700);
        expect(stored.territoryTransitionBindToTick).toBe(true);
        expect(stored.territoryTransitionBindingPolicyVersion).toBe(1);
    });

    it('fills missing timing state with slider-controlled defaults', () => {
        const stored: Record<string, unknown> = {
            tickInterval: 1050,
        };

        const changed = normalizeTerritoryTransitionTimingDefaults(stored);

        expect(changed).toBe(true);
        expect(stored.territoryTransitionMs).toBe(1050);
        expect(stored.territoryTransitionBindToTick).toBe(false);
        expect(stored.territoryTransitionBindingPolicyVersion).toBe(1);
    });
});
