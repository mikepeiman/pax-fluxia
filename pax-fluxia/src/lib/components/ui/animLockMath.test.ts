import { describe, it, expect } from 'vitest';
import {
    isTickRelativeSlider,
    togglePin,
    toggleTickRatio,
    toggleAnimSpeedRatio,
    recalcOnTickChange,
    recalcOnAnimSpeedChange,
    type AnimLockState,
} from './animLockMath';
import type { AnimSliderDef } from './settingsDefs';

const MS_SLIDER: AnimSliderDef = {
    key: 'TRANSFER_ANIMATION_MS',
    label: 'Transfer Anim',
    min: 0,
    max: 5000,
    step: 10,
    unit: 'ms',
    group: 'test',
};
const MULT_SLIDER: AnimSliderDef = {
    key: 'ATTACK_SURGE_MULT',
    label: 'Surge',
    min: 0.1,
    max: 10,
    step: 0.1,
    unit: '×',
    group: 'test',
};
const TICK_SLIDER: AnimSliderDef = {
    key: 'TRAVEL_DURATION_MULT',
    label: 'Travel',
    min: 0.1,
    max: 10,
    step: 0.1,
    unit: '×tick',
    group: 'test',
};

const EMPTY: AnimLockState = { modes: {}, ratios: {} };
const TICK = 250;

describe('animLockMath', () => {
    describe('unit classification', () => {
        it('treats ×tick and ticks as tick-relative; ms and × are not', () => {
            expect(isTickRelativeSlider(TICK_SLIDER)).toBe(true);
            expect(isTickRelativeSlider({ ...TICK_SLIDER, unit: 'ticks' })).toBe(true);
            expect(isTickRelativeSlider(MS_SLIDER)).toBe(false);
            expect(isTickRelativeSlider(MULT_SLIDER)).toBe(false);
            expect(isTickRelativeSlider(undefined)).toBe(false);
        });
    });

    describe('togglePin', () => {
        it('pins an ms slider to the tick duration itself', () => {
            const t = togglePin(EMPTY, MS_SLIDER.key, MS_SLIDER, TICK);
            expect(t.modes[MS_SLIDER.key]).toBe('pinned');
            expect(t.set).toEqual({ key: MS_SLIDER.key, value: TICK });
            // ms ratio is 1 so a later tick change tracks the tick exactly
            expect(t.ratios[MS_SLIDER.key]).toBe(1);
        });

        it('pins a multiplier slider to 1.0 with a 1/tick ratio', () => {
            const t = togglePin(EMPTY, MULT_SLIDER.key, MULT_SLIDER, TICK);
            expect(t.set).toEqual({ key: MULT_SLIDER.key, value: 1.0 });
            expect(t.ratios[MULT_SLIDER.key]).toBeCloseTo(1 / TICK);
        });

        it('pins a tick-relative slider to 1.0 with ratio 1.0', () => {
            const t = togglePin(EMPTY, TICK_SLIDER.key, TICK_SLIDER, TICK);
            expect(t.set).toEqual({ key: TICK_SLIDER.key, value: 1.0 });
            expect(t.ratios[TICK_SLIDER.key]).toBe(1.0);
        });

        it('unpins on second toggle without touching the value', () => {
            const pinned = togglePin(EMPTY, MS_SLIDER.key, MS_SLIDER, TICK);
            const unpinned = togglePin(pinned, MS_SLIDER.key, MS_SLIDER, TICK);
            expect(unpinned.modes[MS_SLIDER.key]).toBeNull();
            expect(unpinned.ratios[MS_SLIDER.key]).toBeNull();
            expect(unpinned.set).toBeUndefined();
        });

        it('does not mutate the input state', () => {
            const t = togglePin(EMPTY, MS_SLIDER.key, MS_SLIDER, TICK);
            expect(EMPTY.modes).toEqual({});
            expect(t.modes).not.toBe(EMPTY.modes);
        });
    });

    describe('toggleTickRatio', () => {
        it('captures value/tick for an ms slider', () => {
            const t = toggleTickRatio(EMPTY, MS_SLIDER.key, MS_SLIDER, 500, TICK);
            expect(t.modes[MS_SLIDER.key]).toBe('ratio');
            expect(t.ratios[MS_SLIDER.key]).toBeCloseTo(2);
            expect(t.set).toBeUndefined(); // locking never moves the value
        });

        it('captures the raw value for a tick-relative slider (it IS the ratio)', () => {
            const t = toggleTickRatio(EMPTY, TICK_SLIDER.key, TICK_SLIDER, 3, TICK);
            expect(t.ratios[TICK_SLIDER.key]).toBe(3);
        });

        it('unlocks on second toggle', () => {
            const locked = toggleTickRatio(EMPTY, MS_SLIDER.key, MS_SLIDER, 500, TICK);
            const unlocked = toggleTickRatio(locked, MS_SLIDER.key, MS_SLIDER, 500, TICK);
            expect(unlocked.modes[MS_SLIDER.key]).toBeNull();
        });
    });

    describe('recalcOnTickChange', () => {
        it('rescales a ratio-locked ms slider proportionally', () => {
            // 500ms at tick 250 (ratio 2) -> tick 400 gives 800ms
            const locked = toggleTickRatio(EMPTY, MS_SLIDER.key, MS_SLIDER, 500, TICK);
            expect(recalcOnTickChange(locked, [MS_SLIDER], 400)).toEqual({
                [MS_SLIDER.key]: 800,
            });
        });

        it('keeps a pinned ms slider equal to the tick', () => {
            const pinned = togglePin(EMPTY, MS_SLIDER.key, MS_SLIDER, TICK);
            expect(recalcOnTickChange(pinned, [MS_SLIDER], 320)).toEqual({
                [MS_SLIDER.key]: 320,
            });
        });

        it('leaves a tick-relative slider at its own value', () => {
            const locked = toggleTickRatio(EMPTY, TICK_SLIDER.key, TICK_SLIDER, 3, TICK);
            expect(recalcOnTickChange(locked, [TICK_SLIDER], 999)).toEqual({
                [TICK_SLIDER.key]: 3,
            });
        });

        it('clamps to the slider range', () => {
            // ratio 2 at tick 4000 -> 8000, above max 5000
            const locked = toggleTickRatio(EMPTY, MS_SLIDER.key, MS_SLIDER, 500, TICK);
            expect(recalcOnTickChange(locked, [MS_SLIDER], 4000)).toEqual({
                [MS_SLIDER.key]: 5000,
            });
        });

        it('rounds ms to integers and multipliers to 2dp', () => {
            const msLocked = toggleTickRatio(EMPTY, MS_SLIDER.key, MS_SLIDER, 100, 300);
            // ratio 1/3 * 250 = 83.33 -> 83
            expect(recalcOnTickChange(msLocked, [MS_SLIDER], 250)).toEqual({
                [MS_SLIDER.key]: 83,
            });

            const multLocked = toggleTickRatio(EMPTY, MULT_SLIDER.key, MULT_SLIDER, 1, 300);
            // ratio 1/300 * 250 = 0.8333 -> 0.83
            expect(recalcOnTickChange(multLocked, [MULT_SLIDER], 250)).toEqual({
                [MULT_SLIDER.key]: 0.83,
            });
        });

        it('ignores animSpeed-locked and unlocked sliders', () => {
            const state: AnimLockState = {
                modes: { [MS_SLIDER.key]: 'animSpeed', other: null },
                ratios: { [MS_SLIDER.key]: 2, other: null },
            };
            expect(recalcOnTickChange(state, [MS_SLIDER], 400)).toEqual({});
        });
    });

    describe('animSpeed locks', () => {
        it('captures value/animSpeed and rescales on speed change', () => {
            const locked = toggleAnimSpeedRatio(EMPTY, MS_SLIDER.key, 600, 300);
            expect(locked.ratios[MS_SLIDER.key]).toBeCloseTo(2);

            expect(recalcOnAnimSpeedChange(locked, [MS_SLIDER], 450)).toEqual({
                [MS_SLIDER.key]: 900,
            });
        });

        it('recalc ignores tick locks', () => {
            const locked = toggleTickRatio(EMPTY, MS_SLIDER.key, MS_SLIDER, 500, TICK);
            expect(recalcOnAnimSpeedChange(locked, [MS_SLIDER], 450)).toEqual({});
        });

        it('unlocks on second toggle', () => {
            const locked = toggleAnimSpeedRatio(EMPTY, MS_SLIDER.key, 600, 300);
            const unlocked = toggleAnimSpeedRatio(locked, MS_SLIDER.key, 600, 300);
            expect(unlocked.modes[MS_SLIDER.key]).toBeNull();
        });
    });

    describe('round trip', () => {
        it('pin -> tick change -> tick change tracks the tick for ms sliders', () => {
            const pinned = togglePin(EMPTY, MS_SLIDER.key, MS_SLIDER, 250);
            const first = recalcOnTickChange(pinned, [MS_SLIDER], 100);
            expect(first[MS_SLIDER.key]).toBe(100);
            const second = recalcOnTickChange(pinned, [MS_SLIDER], 750);
            expect(second[MS_SLIDER.key]).toBe(750);
        });
    });
});
