/**
 * Animation-lock math — the pure transition functions behind the pin/lock
 * buttons on every animation slider.
 *
 * Three lock modes per slider (persisted; see panelSync):
 *  - "pinned"    the value is pinned to the tick duration itself (ms sliders
 *                pin to BASE_TICK_MS; multiplier sliders pin to 1.0)
 *  - "ratio"     the value keeps its CURRENT ratio to the tick, rescaling
 *                whenever the tick interval changes
 *  - "animSpeed" the value keeps its current ratio to the animation speed
 *
 * Unit semantics (AnimSliderDef.unit) drive everything:
 *  - "ms"            absolute milliseconds — ratio = value / tickMs
 *  - "×"             multiplier — already tick-relative in effect, but its
 *                    pin ratio is expressed against the tick (1 / tickMs)
 *  - "×tick"/"ticks" tick-relative — the value IS the ratio; it never rescales
 *
 * Extracted from GameSettingsPanel.svelte (Stage 6). Pure: the component owns
 * the $state and persistence; these functions only compute the next state.
 * That is what makes the unit math testable at all.
 */
import type { AnimSliderDef } from './settingsDefs';

/**
 * A slider's lock mode. This type lives HERE, with the math that gives it
 * meaning — it used to live in panelSync (persistence), which forced this
 * module to import from its own consumer and made a second, side-effectful
 * copy of the recalc math there look natural. panelSync re-exports it for
 * the storage API's signatures.
 */
export type AnimLockMode = 'pinned' | 'ratio' | 'animSpeed' | null;

export interface AnimLockState {
    modes: Record<string, AnimLockMode>;
    ratios: Record<string, number | null>;
}

export interface AnimLockTransition extends AnimLockState {
    /** A config value the caller must apply (via its setAnimValue path). */
    set?: { key: string; value: number };
}

export function isTickRelativeSlider(def?: AnimSliderDef): boolean {
    return def?.unit === '×tick' || def?.unit === 'ticks';
}

/** Clamp to the slider's range, then round per unit (ms → integer, else 2dp). */
function clampAndRound(value: number, def: AnimSliderDef | undefined): number {
    let next = value;
    if (def && def.min != null && def.max != null) {
        next = Math.max(def.min, Math.min(def.max, next));
    }
    return def?.unit === 'ms' ? Math.round(next) : Math.round(next * 100) / 100;
}

/** Toggle "pinned": pin the value to the tick duration, or unpin. */
export function togglePin(
    state: AnimLockState,
    key: string,
    def: AnimSliderDef | undefined,
    baseTickMs: number,
): AnimLockTransition {
    if (state.modes[key] === 'pinned') {
        return {
            modes: { ...state.modes, [key]: null },
            ratios: { ...state.ratios, [key]: null },
        };
    }
    const unit = def?.unit ?? '';
    const isTickRelative = unit === '×tick' || unit === 'ticks';
    const isMultiplier = isTickRelative || unit === '×';
    const pinnedValue = isMultiplier ? 1.0 : baseTickMs;
    const pinnedRatio = isTickRelative ? 1.0 : unit === '×' ? 1.0 / baseTickMs : 1;
    return {
        modes: { ...state.modes, [key]: 'pinned' },
        ratios: { ...state.ratios, [key]: pinnedRatio },
        set: { key, value: pinnedValue },
    };
}

/** Toggle "ratio": capture the current value/tick ratio, or unlock. */
export function toggleTickRatio(
    state: AnimLockState,
    key: string,
    def: AnimSliderDef | undefined,
    currentValue: number,
    baseTickMs: number,
): AnimLockTransition {
    if (state.modes[key] === 'ratio') {
        return {
            modes: { ...state.modes, [key]: null },
            ratios: { ...state.ratios, [key]: null },
        };
    }
    return {
        modes: { ...state.modes, [key]: 'ratio' },
        ratios: {
            ...state.ratios,
            [key]: isTickRelativeSlider(def) ? currentValue : currentValue / baseTickMs,
        },
    };
}

/** Toggle "animSpeed": capture the current value/animSpeed ratio, or unlock. */
export function toggleAnimSpeedRatio(
    state: AnimLockState,
    key: string,
    currentValue: number,
    animSpeedMs: number,
): AnimLockTransition {
    if (state.modes[key] === 'animSpeed') {
        return {
            modes: { ...state.modes, [key]: null },
            ratios: { ...state.ratios, [key]: null },
        };
    }
    return {
        modes: { ...state.modes, [key]: 'animSpeed' },
        ratios: { ...state.ratios, [key]: currentValue / animSpeedMs },
    };
}

/**
 * New values for every pinned/ratio-locked slider after a tick change.
 * Tick-relative sliders hold their value (it IS the ratio); everything else
 * rescales by ratio * newTickMs, clamped to the slider range.
 */
export function recalcOnTickChange(
    state: AnimLockState,
    sliders: readonly AnimSliderDef[],
    newTickMs: number,
): Record<string, number> {
    const updates: Record<string, number> = {};
    for (const [key, mode] of Object.entries(state.modes)) {
        if (mode !== 'pinned' && mode !== 'ratio') continue;
        const ratio = state.ratios[key];
        if (ratio == null) continue;
        const def = sliders.find((s) => s.key === key);
        const raw = isTickRelativeSlider(def) ? ratio : ratio * newTickMs;
        updates[key] = clampAndRound(raw, def);
    }
    return updates;
}

/** New values for every animSpeed-locked slider after an anim-speed change. */
export function recalcOnAnimSpeedChange(
    state: AnimLockState,
    sliders: readonly AnimSliderDef[],
    newAnimMs: number,
): Record<string, number> {
    const updates: Record<string, number> = {};
    for (const [key, mode] of Object.entries(state.modes)) {
        if (mode !== 'animSpeed') continue;
        const ratio = state.ratios[key];
        if (ratio == null) continue;
        const def = sliders.find((s) => s.key === key);
        updates[key] = clampAndRound(ratio * newAnimMs, def);
    }
    return updates;
}
