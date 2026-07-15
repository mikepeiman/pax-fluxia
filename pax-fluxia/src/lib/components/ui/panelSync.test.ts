import { beforeEach, describe, expect, it } from 'vitest';
import {
    ANIM_LOCK_STORAGE_KEY,
    PANEL_STORAGE_KEY,
    applyTickIntervalChange,
    normalizeTerritoryTransitionTimingDefaults,
} from './panelSync';
import { GAME_CONFIG } from '$lib/config/game.config';

/**
 * The suite runs in node (no jsdom), but every panelSync storage function
 * short-circuits on `typeof window === 'undefined'`. This is the smallest
 * stub that lets the real code paths run: a Map-backed localStorage and a
 * window that only has to exist (dispatchEvent is called on it).
 */
function installBrowserStubs(): void {
    const store = new Map<string, string>();
    const localStorageStub = {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, String(v)),
        removeItem: (k: string) => void store.delete(k),
        clear: () => store.clear(),
        key: (i: number) => Array.from(store.keys())[i] ?? null,
        get length() {
            return store.size;
        },
    };
    const g = globalThis as any;
    g.localStorage = localStorageStub;
    g.window = {
        localStorage: localStorageStub,
        dispatchEvent: () => true,
        addEventListener: () => {},
        removeEventListener: () => {},
    };
    g.CustomEvent = class {
        type: string;
        detail: unknown;
        constructor(type: string, init?: { detail?: unknown }) {
            this.type = type;
            this.detail = init?.detail;
        }
    };
}

describe('applyTickIntervalChange — tick-locked values follow the tick', () => {
    // Guards the 2026-07-15 dedupe: this function used to get its GAME_CONFIG
    // writes as a side effect of panelSync's private copy of the lock math.
    // That copy is gone (animLockMath is the one implementation), so the
    // writes are now explicit here — and must stay.
    beforeEach(() => {
        installBrowserStubs();
        localStorage.clear();
        GAME_CONFIG.BASE_TICK_MS = 1000;
        GAME_CONFIG.SETTLE_DURATION_MS = 500;
        GAME_CONFIG.TRAVEL_DURATION_MULT = 2;
    });

    it('rescales a ratio-locked ms slider into GAME_CONFIG and the saved panel', () => {
        // SETTLE_DURATION_MS locked at half the tick.
        localStorage.setItem(
            ANIM_LOCK_STORAGE_KEY + '-modes',
            JSON.stringify({ SETTLE_DURATION_MS: 'ratio' }),
        );
        localStorage.setItem(
            ANIM_LOCK_STORAGE_KEY,
            JSON.stringify({ SETTLE_DURATION_MS: 0.5 }),
        );

        const result = applyTickIntervalChange(2000);

        expect(result.tickMs).toBe(2000);
        expect(GAME_CONFIG.BASE_TICK_MS).toBe(2000);
        expect(GAME_CONFIG.SETTLE_DURATION_MS).toBe(1000);

        const savedPanel = JSON.parse(
            localStorage.getItem(PANEL_STORAGE_KEY) ?? '{}',
        );
        expect(savedPanel.settleDurationMs).toBe(1000);
    });

    it('holds a tick-relative slider steady — its value IS the ratio', () => {
        localStorage.setItem(
            ANIM_LOCK_STORAGE_KEY + '-modes',
            JSON.stringify({ TRAVEL_DURATION_MULT: 'ratio' }),
        );
        localStorage.setItem(
            ANIM_LOCK_STORAGE_KEY,
            JSON.stringify({ TRAVEL_DURATION_MULT: 2 }),
        );

        applyTickIntervalChange(3000);

        expect(GAME_CONFIG.TRAVEL_DURATION_MULT).toBe(2);
    });

    it('leaves unlocked sliders alone', () => {
        applyTickIntervalChange(2000);

        expect(GAME_CONFIG.SETTLE_DURATION_MS).toBe(500);
    });
});

describe('normalizeTerritoryTransitionTimingDefaults', () => {
    it('releases territory transitions from the old auto-bind policy while preserving duration', () => {
        const stored: Record<string, unknown> = {
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
        const stored: Record<string, unknown> = {
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
