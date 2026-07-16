/**
 * Settings Store — the single owner of the settings data layer.
 *
 * Before this (2026-07-15 audit, phase 2), GameSettingsPanel.svelte carried the
 * panel mirror, a second reactive mirror for animation sliders, the anim-lock
 * state, SEVEN overlapping config→view sync functions, and FOUR config-write
 * paths with different side effects — then drilled all of it into 15 section
 * components as up to 13 props each. This module is that layer, extracted:
 *
 *   - ONE reactive mirror of settings values (`panel`, keyed by panelKey — the
 *     panelKey↔configKey bijection means rekeying to configKey would be pure
 *     churn with no behavioural gain, so we don't).
 *   - ONE write path: `set(panelKey, value)` — writes GAME_CONFIG, updates the
 *     mirror, persists, records telemetry, and fires domain invalidations from
 *     the registry's `invalidates` tags (no key-prefix ladder).
 *   - ONE batch path: `applyPatch(configPatch)` — themes, presets, config import.
 *   - ONE read-back: `syncFromConfig()`.
 *
 * Reactivity crosses the module boundary the Svelte-5 way: module-level `$state`
 * exposed through a getter object (matches animationStore / selectedStarStore).
 * Sections read `settingsStore.panel.x`; to keep their existing `panel.x` markup
 * untouched they alias `const panel = $derived(settingsStore.panel)`.
 *
 * What this module does NOT own: settings NAVIGATION (which section/category is
 * open) still lives in GameSettingsPanel — that is phase 3's target.
 */
import { GAME_CONFIG } from '$lib/config/game.config';
import { animationStore } from '$lib/stores/animationStore.svelte';
import { activeGameStore } from '$lib/stores/activeGameStore.svelte';
import { bumpTerritoryVisualConfig } from '$lib/territory/bumpTerritoryVisualConfig';
import {
    ANIM_SLIDERS,
    CONFIG_TO_PANEL_KEY,
    formatAnimValue,
    resolveInvalidationsForKeys,
    type SettingsTier,
} from './settingsDefs';
import {
    setSetting,
    setSettingsFromConfigPatch,
    syncPanelFromConfigPatch,
} from './settingsState';
import {
    applyBgImageChange,
    loadPanelSettings,
    panelDefaultsFromConfig,
    savePanelSettings,
    applyPanelToConfig,
    loadAnimLockRatios,
    saveAnimLockRatios,
    loadAnimLockModes,
    saveAnimLockModes,
    loadTier,
    saveTier,
    TICK_INTERVAL_CHANGED_EVENT,
} from './panelSync';
import {
    togglePin,
    toggleTickRatio,
    toggleAnimSpeedRatio,
    recalcOnTickChange,
    recalcOnAnimSpeedChange,
    type AnimLockMode,
    type AnimLockTransition,
} from './animLockMath';

// ── State (module-level $state, exposed through the getter object below) ─────

let _panel = $state<Record<string, any>>(loadPanelSettings(panelDefaultsFromConfig()));
let _animLockRatios = $state<Record<string, number | null>>(loadAnimLockRatios());
let _animLockModes = $state<Record<string, AnimLockMode>>(loadAnimLockModes());
let _tickInterval = $state<number>(GAME_CONFIG.BASE_TICK_MS);
let _activeTier = $state<SettingsTier>(loadTier());

/** Reactive mirror of animation slider values — GAME_CONFIG is not $state. */
function initAnimValues(): Record<string, number> {
    const vals: Record<string, number> = {};
    for (const s of ANIM_SLIDERS) {
        vals[s.key] = (GAME_CONFIG as any)[s.key] as number;
    }
    return vals;
}
let _animValues = $state<Record<string, number>>(initAnimValues());

// ── Anim-lock persistence + math (animLockMath is pure; this owns the state) ─

function applyLockTransition(transition: AnimLockTransition) {
    _animLockModes = transition.modes;
    _animLockRatios = transition.ratios;
    if (transition.set) setAnimValue(transition.set.key, transition.set.value);
    saveAnimLockRatios(_animLockRatios);
    saveAnimLockModes(_animLockModes);
}

/** Recalculate all locked/pinned animation values when tick interval changes. */
function recalcAnimLocksOnTickChange(newTickMs: number): Record<string, number> {
    const updates = recalcOnTickChange(
        { modes: _animLockModes, ratios: _animLockRatios },
        ANIM_SLIDERS,
        newTickMs,
    );
    for (const [key, value] of Object.entries(updates)) setAnimValue(key, value);
    return updates;
}

/** Recalculate animSpeed-locked values when animation speed changes. */
function recalcAnimLocksOnAnimSpeedChange(newAnimMs: number): Record<string, number> {
    const updates = recalcOnAnimSpeedChange(
        { modes: _animLockModes, ratios: _animLockRatios },
        ANIM_SLIDERS,
        newAnimMs,
    );
    for (const [key, value] of Object.entries(updates)) setAnimValue(key, value);
    return updates;
}

function pinValueToTickDuration(key: string) {
    applyLockTransition(
        togglePin(
            { modes: _animLockModes, ratios: _animLockRatios },
            key,
            ANIM_SLIDERS.find((s) => s.key === key),
            GAME_CONFIG.BASE_TICK_MS,
        ),
    );
}

function lockRatioToTick(key: string) {
    applyLockTransition(
        toggleTickRatio(
            { modes: _animLockModes, ratios: _animLockRatios },
            key,
            ANIM_SLIDERS.find((s) => s.key === key),
            (GAME_CONFIG as any)[key] as number,
            GAME_CONFIG.BASE_TICK_MS,
        ),
    );
}

function lockRatioToAnimSpeed(key: string) {
    applyLockTransition(
        toggleAnimSpeedRatio(
            { modes: _animLockModes, ratios: _animLockRatios },
            key,
            (GAME_CONFIG as any)[key] as number,
            animationStore.speedMs,
        ),
    );
}

function getAnimValue(key: string): number {
    return _animValues[key] ?? ((GAME_CONFIG as any)[key] as number);
}

function syncPanelKey(configKey: string, val: number) {
    const panelKey = CONFIG_TO_PANEL_KEY[configKey] ?? null;
    if (panelKey) {
        _panel = { ..._panel, [panelKey]: val };
        savePanelSettings(_panel);
    }
    _animValues = { ..._animValues, [configKey]: val };
}

function setAnimValue(key: string, val: number) {
    (GAME_CONFIG as any)[key] = val;
    syncPanelKey(key, val);
}

// ── Timing bindings (tick ⇄ anim/territory-transition, plus lock recalc) ─────

function applyTimingBindingsAndLocks() {
    const nextTick = _panel.tickInterval ?? GAME_CONFIG.BASE_TICK_MS;
    GAME_CONFIG.BASE_TICK_MS = nextTick;

    if (_panel.bindAnimToTick) {
        GAME_CONFIG.ANIMATION_SPEED_MS = nextTick;
        _panel = { ..._panel, animSpeed: nextTick };
    }

    if (_panel.territoryTransitionBindToTick) {
        GAME_CONFIG.TERRITORY_TRANSITION_MS = nextTick;
        _panel = { ..._panel, territoryTransitionMs: nextTick };
    }

    // Surge pulse tick-binding is resolved live in ShipRenderer — no config/
    // panel write here (writing clobbered the saved free-run value).

    const tickUpdates = recalcAnimLocksOnTickChange(nextTick) ?? {};
    if (Object.keys(tickUpdates).length > 0) {
        const patch: Record<string, number> = {};
        for (const [configKey, value] of Object.entries(tickUpdates)) {
            const panelKey = CONFIG_TO_PANEL_KEY[configKey];
            if (panelKey) patch[panelKey] = value;
        }
        _panel = { ..._panel, ...patch };
    }

    const animSpeed = _panel.bindAnimToTick
        ? nextTick
        : (GAME_CONFIG.ANIMATION_SPEED_MS ?? animationStore.speedMs);
    const animUpdates = recalcAnimLocksOnAnimSpeedChange(animSpeed) ?? {};
    if (Object.keys(animUpdates).length > 0) {
        const patch: Record<string, number> = {};
        for (const [configKey, value] of Object.entries(animUpdates)) {
            const panelKey = CONFIG_TO_PANEL_KEY[configKey];
            if (panelKey) patch[panelKey] = value;
        }
        _panel = { ..._panel, ...patch };
    }

    savePanelSettings(_panel);
    _tickInterval = nextTick;
    activeGameStore.updateTickInterval(nextTick);
    animationStore.setAnimationSpeed(GAME_CONFIG.ANIMATION_SPEED_MS);
    syncAnimValuesFromConfig();
    notifyTickIntervalChanged(nextTick);
}

/** Let tick displays outside this panel (HUD Game Speed widget) refresh. */
function notifyTickIntervalChanged(valueMs: number) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent(TICK_INTERVAL_CHANGED_EVENT, { detail: { valueMs } }),
    );
}

// ── Config → view sync ──────────────────────────────────────────────────────

function syncAnimValuesFromConfig(
    configSource: Record<string, any> = GAME_CONFIG as Record<string, any>,
) {
    const next = { ..._animValues };
    for (const slider of ANIM_SLIDERS) {
        if (configSource[slider.key] !== undefined) {
            next[slider.key] = configSource[slider.key] as number;
        }
    }
    _animValues = next;
}

function syncRuntimeViewsFromConfig(
    configSource: Record<string, any> = GAME_CONFIG as Record<string, any>,
) {
    syncAnimValuesFromConfig(configSource);
    _tickInterval = configSource.BASE_TICK_MS;
    activeGameStore.updateTickInterval(configSource.BASE_TICK_MS);
    animationStore.setAnimationSpeed(configSource.ANIMATION_SPEED_MS);
}

/** The ONE read-back: pull GAME_CONFIG into the panel mirror + runtime views. */
function syncFromConfig(
    configSource: Record<string, any> = GAME_CONFIG as Record<string, any>,
) {
    _panel = syncPanelFromConfigPatch(_panel, configSource, savePanelSettings);
    applyTimingBindingsAndLocks();
    syncRuntimeViewsFromConfig(configSource);
}

// ── Writes ──────────────────────────────────────────────────────────────────

/** The ONE per-setting write path. */
function set(panelKey: string, value: any) {
    _panel = setSetting(_panel, panelKey, value, savePanelSettings);
}

/** Background image: normalize + write config + notify the canvas, then persist. */
function updateBgImage(rawPath: string) {
    set('bgImageUrl', applyBgImageChange(rawPath));
}

/** The ONE batch write path: themes, category presets, config import. */
function applyPatch(configPatch: Record<string, unknown>) {
    _panel = setSettingsFromConfigPatch(_panel, configPatch, savePanelSettings);
    applyTimingBindingsAndLocks();
    syncRuntimeViewsFromConfig();

    // Which domains a patch wakes is DATA on the registry (resolveInvalidations),
    // not a key-prefix ladder. See settingsDefs.
    const invalidated = resolveInvalidationsForKeys(Object.keys(configPatch));
    if (invalidated.has('background')) {
        applyBgImageChange(GAME_CONFIG.BG_IMAGE_URL);
    }
    if (invalidated.has('backgroundAlpha') && typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent('pax-bg-alpha-change', {
                detail: GAME_CONFIG.BG_IMAGE_ALPHA ?? 0.5,
            }),
        );
    }
    if (invalidated.has('territory')) {
        bumpTerritoryVisualConfig();
    }
}

function setTier(tier: SettingsTier) {
    _activeTier = tier;
    saveTier(tier);
}

function updateTickInterval(value: number) {
    _tickInterval = value;
    activeGameStore.updateTickInterval(value);
    notifyTickIntervalChanged(value);
}

// ── Boot hydrate (run once) ──────────────────────────────────────────────────

let _hydrated = false;

/**
 * Restore saved panel values INTO GAME_CONFIG before syncFromConfig reads
 * GAME_CONFIG back into the panel — without this, compile-time defaults would
 * overwrite user-saved slider values. Idempotent: safe to call on every panel
 * mount; the heavy work runs once.
 */
function hydrate() {
    if (_hydrated) {
        // Already hydrated (e.g. panel reopened): just re-pull current config,
        // which external control surfaces keep authoritative.
        syncFromConfig();
        return;
    }
    _hydrated = true;
    applyPanelToConfig(_panel);
    applyTimingBindingsAndLocks();
    syncFromConfig();
}

// ── Public getter object ─────────────────────────────────────────────────────

export const settingsStore = {
    get panel() {
        return _panel;
    },
    get animValues() {
        return _animValues;
    },
    get animLockModes() {
        return _animLockModes;
    },
    get animLockRatios() {
        return _animLockRatios;
    },
    get tickInterval() {
        return _tickInterval;
    },
    get activeTier() {
        return _activeTier;
    },

    // Writes / sync
    set,
    applyPatch,
    syncFromConfig,
    updateBgImage,
    updateTickInterval,
    setTier,
    hydrate,

    // Animation sliders + locks
    getAnimValue,
    setAnimValue,
    formatAnimValue,
    pinValueToTickDuration,
    lockRatioToTick,
    lockRatioToAnimSpeed,
};
