import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    VISUAL_DEFAULTS,
    loadVisuals,
    normalizeTerritoryTransitionTimingDefaults,
    saveVisuals,
    setVisualSetting,
} from './panelSync';

type LocalStorageMock = {
    clear: () => void;
    getItem: (key: string) => string | null;
    removeItem: (key: string) => void;
    setItem: (key: string, value: string) => void;
};

function createLocalStorageMock(): LocalStorageMock {
    const store = new Map<string, string>();
    return {
        clear: () => store.clear(),
        getItem: (key: string) => store.get(key) ?? null,
        removeItem: (key: string) => {
            store.delete(key);
        },
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
    };
}

let localStorageMock: LocalStorageMock;

beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('window', {
        localStorage: localStorageMock,
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

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

describe('visual background persistence', () => {
    it('round-trips live background tunables and per-player selections through localStorage', () => {
        let visuals = setVisualSetting(
            VISUAL_DEFAULTS,
            'backgroundSelection',
            {
                modeId: 'nebula_veil',
                tunables: {
                    intensity: 7.4,
                    density: 3.5,
                    driftSpeed: 2.25,
                },
            },
        );
        visuals = setVisualSetting(
            visuals,
            'backgroundAffectAllTerritory',
            false,
        );
        visuals = setVisualSetting(
            visuals,
            'playerBackgroundSelections',
            {
                p1: {
                    modeId: 'storm_current',
                    tunables: {
                        intensity: 9.5,
                        chargeDensity: 4.4,
                        crawlSpeed: 5.1,
                    },
                },
            },
        );

        saveVisuals(visuals);
        const loaded = loadVisuals();

        expect(loaded.backgroundSelection.modeId).toBe('nebula_veil');
        expect(loaded.backgroundSelection.tunables.intensity).toBe(7.4);
        expect(loaded.backgroundSelection.tunables.density).toBe(3.5);
        expect(loaded.backgroundSelection.tunables.driftSpeed).toBe(2.25);
        expect(loaded.backgroundAffectAllTerritory).toBe(false);
        expect(loaded.playerBackgroundSelections.p1?.modeId).toBe('storm_current');
        expect(
            loaded.playerBackgroundSelections.p1?.tunables.intensity,
        ).toBe(9.5);
        expect(
            loaded.playerBackgroundSelections.p1?.tunables.chargeDensity,
        ).toBe(4.4);
        expect(
            loaded.playerBackgroundSelections.p1?.tunables.crawlSpeed,
        ).toBe(5.1);
    });
});
