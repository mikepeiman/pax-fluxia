/**
 * Panel Sync — Persistence and config↔panel bridging
 *
 * Extracted from GameSettingsPanel.svelte.
 * Handles localStorage save/load and the bidirectional
 * GAME_CONFIG ↔ panel state synchronization.
 */

import { GAME_CONFIG } from '$lib/config/game.config';
import { gameplayConfigDefaults } from '$lib/config/gameplay.config';
import { normalizeBgImagePath } from '$lib/config/bgManifest';
import { normalizeTerritoryRenderModeId } from '$lib/territory/ui/territoryRenderModeCatalog';
import { RESOLVED_PANEL_CONFIG_MAP, CONFIG_TO_PANEL_KEY, type AnimSliderDef } from './settingsDefs';
import { dumpSettings } from '$lib/utils/settingsDump';

function isTickRelativeUnit(unit?: string): boolean {
    return unit === '×tick' || unit === 'ticks';
}

// ── Storage Keys ────────────────────────────────────────────────────────────

export const STORAGE_KEY = 'pax-fluxia-combat-tuning';
export const PANEL_STORAGE_KEY = 'pax-fluxia-panel-settings';
export const VISUALS_STORAGE_KEY = 'pax-fluxia-visuals';
export const ANIM_LOCK_STORAGE_KEY = 'pax-anim-lock-ratios';
export const TIER_STORAGE_KEY = 'pax-fluxia-settings-tier';
const LEGACY_CELL_GRID_SPACING_PX = 48;
const SMOOTH_CELL_GRID_SPACING_PX = 32;
const LEGACY_CELL_GRID_FLIP_TRANSITION = 'hard';
const SMOOTH_CELL_GRID_FLIP_TRANSITION = 'dual_pass_blend';
const LEGACY_CELL_GRID_FLIP_WINDOW = 0.06;
const SMOOTH_CELL_GRID_FLIP_WINDOW = 0.14;
const LEGACY_CELL_GRID_FLIP_WINDOW_JITTER = 0.02;
const SMOOTH_CELL_GRID_FLIP_WINDOW_JITTER = 0;
const LEGACY_TERRITORY_TRANSITION_MS = 400;
const TERRITORY_TRANSITION_POLICY_VERSION = 1;
const TERRITORY_MODE_SPLIT_POLICY_VERSION = 1;

function resolveStoredTickInterval(stored: Record<string, any>): number {
    if (
        typeof stored.tickInterval === 'number' &&
        Number.isFinite(stored.tickInterval)
    ) {
        return stored.tickInterval;
    }
    return GAME_CONFIG.BASE_TICK_MS || gameplayConfigDefaults.BASE_TICK_MS;
}

export function normalizeTerritoryTransitionTimingDefaults(
    stored: Record<string, any>,
): boolean {
    let changed = false;
    const tickInterval = resolveStoredTickInterval(stored);
    const transitionDurationUnset =
        stored.territoryTransitionMs === undefined ||
        stored.territoryTransitionMs === null;
    const transitionDurationIsLegacy =
        transitionDurationUnset ||
        stored.territoryTransitionMs === LEGACY_TERRITORY_TRANSITION_MS;

    if (transitionDurationIsLegacy) {
        stored.territoryTransitionMs = tickInterval;
        changed = true;
    }

    const bindingPolicyUnversioned =
        stored.territoryTransitionBindingPolicyVersion !==
        TERRITORY_TRANSITION_POLICY_VERSION;
    const transitionBindUnset =
        stored.territoryTransitionBindToTick === undefined ||
        stored.territoryTransitionBindToTick === null;
    const looksAutoBoundFromLegacyPolicy =
        stored.territoryTransitionBindToTick === true &&
        stored.territoryTransitionMs === tickInterval;

    if (bindingPolicyUnversioned && (transitionBindUnset || looksAutoBoundFromLegacyPolicy)) {
        stored.territoryTransitionBindToTick = false;
        changed = true;
    } else if (transitionBindUnset) {
        stored.territoryTransitionBindToTick = false;
        changed = true;
    }

    if (bindingPolicyUnversioned) {
        stored.territoryTransitionBindingPolicyVersion =
            TERRITORY_TRANSITION_POLICY_VERSION;
        changed = true;
    }

    return changed;
}

// ── Combat Tuning Persistence ───────────────────────────────────────────────

export function loadCombatTuning<T extends Record<string, any>>(defaults: T): T {
    if (typeof window === 'undefined') return { ...defaults };
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return { ...defaults, ...JSON.parse(stored) };
    } catch {
        /* ignore */
    }
    return { ...defaults };
}

export function saveCombatTuning(vals: Record<string, any>): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(vals));
    } catch {
        /* ignore */
    }
    dumpSettings();
}

// ── Visual Persistence ──────────────────────────────────────────────────────

export const VISUAL_DEFAULTS = {
    laneWidth: GAME_CONFIG.CONNECTION_WIDTH,
    laneAlpha: GAME_CONFIG.CONNECTION_ALPHA,
    shadowWidth: GAME_CONFIG.CONNECTION_SHADOW_WIDTH,
    shadowAlpha: GAME_CONFIG.CONNECTION_SHADOW_ALPHA,
    /** Basename under `/assets/` — see `bgManifest.normalizeBgImagePath` */
    bgImage: 'pax-fluxia-bg-25.jpg',
};

export function loadVisuals(): typeof VISUAL_DEFAULTS {
    if (typeof window === 'undefined') return { ...VISUAL_DEFAULTS };
    try {
        const s = localStorage.getItem(VISUALS_STORAGE_KEY);
        if (s) {
            const merged = { ...VISUAL_DEFAULTS, ...JSON.parse(s) };
            merged.bgImage = normalizeBgImagePath(merged.bgImage);
            return merged;
        }
    } catch {
        /* ignore */
    }
    return { ...VISUAL_DEFAULTS };
}

export function saveVisuals(vis: typeof VISUAL_DEFAULTS): void {
    if (typeof window === 'undefined') return;
    const toSave = { ...vis, bgImage: normalizeBgImagePath(vis.bgImage) };
    localStorage.setItem(VISUALS_STORAGE_KEY, JSON.stringify(toSave));
    dumpSettings();
}

export function applyVisuals(vis: typeof VISUAL_DEFAULTS): void {
    GAME_CONFIG.CONNECTION_WIDTH = vis.laneWidth;
    GAME_CONFIG.CONNECTION_ALPHA = vis.laneAlpha;
    GAME_CONFIG.CONNECTION_SHADOW_WIDTH = vis.shadowWidth;
    GAME_CONFIG.CONNECTION_SHADOW_ALPHA = vis.shadowAlpha;

    const bgPath = normalizeBgImagePath(vis.bgImage);
    // Live-update background image if it changes
    if (GAME_CONFIG.BG_IMAGE_URL !== bgPath) {
        GAME_CONFIG.BG_IMAGE_URL = bgPath;
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('pax-bg-change', { detail: bgPath }));
        }
    }
}

// ── Panel Settings Persistence ──────────────────────────────────────────────

/**
 * Historical panel key renames.
 * These were stored under old (incorrect) keys in localStorage; migrate them
 * forward once by reading under the old key and writing under the new key.
 * Only the 8 keys that were "historical accidents" — abbreviated forms that
 * diverged from the SCREAMING_SNAKE_CASE → camelCase convention.
 */
const PANEL_KEY_RENAMES: Record<string, string> = {
    settleDuration:    'settleDurationMs',
    globalDamage:      'globalDamageModifier',
    arrowLength:       'arrowLengthFraction',
    departJitter:      'departJitterMs',
    metaballRadius:    'metaballInfluenceRadius',
    metaballStrength:  'metaballStrengthMult',
    orbitBias:         'orbitBiasStrength',
    transferAnimMs:    'transferAnimationMs',
};

function migrateLegacyCellGridPanelSettings(
    stored: Record<string, any>,
): boolean {
    let changed = false;
    if (stored.cellGridSpacingPx === LEGACY_CELL_GRID_SPACING_PX) {
        stored.cellGridSpacingPx = SMOOTH_CELL_GRID_SPACING_PX;
        changed = true;
    }
    if (
        stored.cellGridFlipTransition ===
        LEGACY_CELL_GRID_FLIP_TRANSITION
    ) {
        stored.cellGridFlipTransition =
            SMOOTH_CELL_GRID_FLIP_TRANSITION;
        changed = true;
    }
    if (stored.cellGridFlipWindow === LEGACY_CELL_GRID_FLIP_WINDOW) {
        stored.cellGridFlipWindow = SMOOTH_CELL_GRID_FLIP_WINDOW;
        changed = true;
    }
    if (
        stored.cellGridFlipWindowJitter ===
        LEGACY_CELL_GRID_FLIP_WINDOW_JITTER
    ) {
        stored.cellGridFlipWindowJitter =
            SMOOTH_CELL_GRID_FLIP_WINDOW_JITTER;
        changed = true;
    }
    if (normalizeTerritoryTransitionTimingDefaults(stored)) {
        changed = true;
    }
    return changed;
}

/** Old→new panel-key handles for the 9 shared surface controls (2026-06-24 rename). */
const LEGACY_SURFACE_PANEL_KEY_RENAMES: Readonly<Record<string, string>> = {
    metaballSaturation: 'territorySurfaceSaturation',
    metaballLightness: 'territorySurfaceLightness',
    metaballAlpha: 'territorySurfaceAlpha',
    metaballFillEnabled: 'territorySurfaceFillEnabled',
    metaballBorderEnabled: 'territorySurfaceBorderEnabled',
    metaballBorderWidth: 'territorySurfaceBorderWidth',
    metaballBorderAlpha: 'territorySurfaceBorderAlpha',
    metaballBorderSaturation: 'territorySurfaceBorderSaturation',
    metaballBorderLightness: 'territorySurfaceBorderLightness',
};

function migrateLegacyTerritoryModeSplit(
    stored: Record<string, any>,
): boolean {
    let changed = false;

    // 2026-06-24 semantic rename: migrate persisted legacy render-mode ids
    // (metaball_grid_*) to their canonical prefix-less names.
    if (typeof stored.territoryRenderMode === 'string') {
        const normalized = normalizeTerritoryRenderModeId(stored.territoryRenderMode);
        if (normalized !== stored.territoryRenderMode) {
            stored.territoryRenderMode = normalized;
            changed = true;
        }
    }

    // 2026-06-24 semantic rename: the 9 shared surface panel-key handles dropped
    // their (misnomer) `metaball` prefix for `territorySurface`. Migrate any saved
    // panel value to the new key so existing setups keep their fill/border tuning.
    for (const [oldKey, newKey] of Object.entries(LEGACY_SURFACE_PANEL_KEY_RENAMES)) {
        if (oldKey in stored) {
            if (!(newKey in stored)) stored[newKey] = stored[oldKey];
            delete stored[oldKey];
            changed = true;
        }
    }

    // 2026-06-24 rename: the cell-grid family panel handles dropped the `metaballGrid`
    // misnomer prefix for `cellGrid` (e.g. metaballGridPatternSpacingPx ->
    // cellGridPatternSpacingPx). Migrate any saved value forward and ALWAYS drop the
    // stale key so obsolete `metaballGrid*` entries don't linger in localStorage.
    // (Genuine metaball-compositor keys start with `metaball` but never `metaballGrid`.)
    for (const oldKey of Object.keys(stored)) {
        if (!oldKey.startsWith('metaballGrid')) continue;
        const newKey = `cellGrid${oldKey.slice('metaballGrid'.length)}`;
        if (!(newKey in stored)) stored[newKey] = stored[oldKey];
        delete stored[oldKey];
        changed = true;
    }

    const splitPolicyUnversioned =
        stored.territoryModeSplitPolicyVersion !==
        TERRITORY_MODE_SPLIT_POLICY_VERSION;

    if (
        splitPolicyUnversioned &&
        stored.territoryRenderMode === 'phase_edges'
    ) {
        stored.territoryRenderMode = 'ember_lattice';
        changed = true;
    }

    if (splitPolicyUnversioned) {
        stored.territoryModeSplitPolicyVersion =
            TERRITORY_MODE_SPLIT_POLICY_VERSION;
        changed = true;
    }

    return changed;
}

function normalizeCellGridSmoothnessDefaults(
    panel: Record<string, any>,
): boolean {
    let changed = false;
    if (migrateLegacyCellGridPanelSettings(panel)) {
        changed = true;
    }
    if (migrateLegacyTerritoryModeSplit(panel)) {
        changed = true;
    }
    return changed;
}

export function loadPanelSettings<T extends Record<string, any>>(defaults: T): T {
    if (typeof window === 'undefined') return { ...defaults };
    try {
        const s = localStorage.getItem(PANEL_STORAGE_KEY);
        if (s) {
            const stored: Record<string, any> = JSON.parse(s);
            // Migrate renamed keys forward
            for (const [oldKey, newKey] of Object.entries(PANEL_KEY_RENAMES)) {
                if (oldKey in stored && !(newKey in stored)) {
                    stored[newKey] = stored[oldKey];
                    delete stored[oldKey];
                }
            }
            // Lane margin vs MSR split (2026-04-10): old panel had additive buffer only
            if ('mapgenLaneBufferPx' in stored && !('mapgenLaneMarginPx' in stored)) {
                const buf = typeof stored.mapgenLaneBufferPx === 'number' ? stored.mapgenLaneBufferPx : 30;
                const starM =
                    typeof stored.starMargin === 'number'
                        ? stored.starMargin
                        : typeof defaults.starMargin === 'number'
                          ? defaults.starMargin
                          : 45;
                stored.mapgenLaneMarginPx = starM + buf;
                if (!('mapgenLaneMarginEnabled' in stored)) {
                    stored.mapgenLaneMarginEnabled = true;
                }
                delete stored.mapgenLaneBufferPx;
            }
            // Run the FULL legacy migration (cell-grid smoothness + territory
            // mode-split + surface/metaballGrid key renames) on every load path,
            // not just the cell-grid subset — otherwise stale `metaballGrid*` /
            // surface keys linger when the panel is opened without a full hydrate.
            if (normalizeCellGridSmoothnessDefaults(stored)) {
                localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(stored));
            }
            return { ...defaults, ...stored };
        }
    } catch {
        /* ignore */
    }
    return { ...defaults };
}

/**
 * Build panel defaults by reading every key in RESOLVED_PANEL_CONFIG_MAP from GAME_CONFIG.
 * This ensures panel state always starts consistent with game config — no undefined keys.
 */
export function panelDefaultsFromConfig(
    configSource: Record<string, any> = GAME_CONFIG as Record<string, any>,
): Record<string, any> {
    const defaults: Record<string, any> = {};
    for (const m of RESOLVED_PANEL_CONFIG_MAP) {
        const raw = configSource[m.configKey];
        defaults[m.panelKey] = m.transform === 'inverse' ? (1 / raw) : raw;
    }
    return defaults;
}

export function savePanelSettings(panel: Record<string, any>): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(panel));
    } catch {
        /* ignore */
    }
    dumpSettings();
}

// ── Panel → Config Sync ─────────────────────────────────────────────────────

/**
 * Write all panel values to GAME_CONFIG.
 * Uses RESOLVED_PANEL_CONFIG_MAP for the mapping; handles 'inverse' transform.
 */
export function applyPanelToConfig(panel: Record<string, any>): void {
    for (const mapping of RESOLVED_PANEL_CONFIG_MAP) {
        const val = panel[mapping.panelKey];
        if (val === undefined) continue;
        if (mapping.transform === 'inverse') {
            (GAME_CONFIG as any)[mapping.configKey] = 1 / (val as number);
        } else {
            (GAME_CONFIG as any)[mapping.configKey] = val;
        }
    }
}

/**
 * Restore persisted panel and visual settings into GAME_CONFIG before any
 * gameplay render path reads config-driven territory mode or tunables.
 *
 * This is required because GameSettingsPanel may remain unmounted until the
 * user opens settings; startup must not depend on that mount side effect.
 */
export function hydrateConfigFromPersistedUiSettings(): {
    panel: Record<string, any>;
    visuals: typeof VISUAL_DEFAULTS;
} {
    const panel = loadPanelSettings(panelDefaultsFromConfig());
    if (
        typeof window !== 'undefined' &&
        normalizeCellGridSmoothnessDefaults(panel)
    ) {
        savePanelSettings(panel);
    }
    applyPanelToConfig(panel);

    const tickInterval =
        typeof panel.tickInterval === 'number' && Number.isFinite(panel.tickInterval)
            ? panel.tickInterval
            : GAME_CONFIG.BASE_TICK_MS;
    GAME_CONFIG.BASE_TICK_MS = tickInterval;

    if (panel.bindAnimToTick) {
        GAME_CONFIG.ANIMATION_SPEED_MS = tickInterval;
    } else if (typeof panel.animSpeed === 'number' && Number.isFinite(panel.animSpeed)) {
        GAME_CONFIG.ANIMATION_SPEED_MS = panel.animSpeed;
    }

    if (panel.territoryTransitionBindToTick) {
        GAME_CONFIG.TERRITORY_TRANSITION_MS = tickInterval;
    } else if (
        typeof panel.territoryTransitionMs === 'number'
        && Number.isFinite(panel.territoryTransitionMs)
    ) {
        GAME_CONFIG.TERRITORY_TRANSITION_MS = panel.territoryTransitionMs;
    }

    if (panel.surgePulseBindToTick ?? GAME_CONFIG.SURGE_PULSE_BIND_TO_TICK ?? true) {
        GAME_CONFIG.SURGE_PULSE_DURATION_MS = tickInterval;
    } else if (
        typeof panel.surgePulseDurationMs === 'number'
        && Number.isFinite(panel.surgePulseDurationMs)
    ) {
        GAME_CONFIG.SURGE_PULSE_DURATION_MS = panel.surgePulseDurationMs;
    }

    const visuals = loadVisuals();
    applyVisuals(visuals);

    return { panel, visuals };
}

/**
 * Read GAME_CONFIG into panel object.
 * Used after theme apply or config import to sync display.
 */
export function syncPanelFromConfig(
    existing: Record<string, any>,
    configSource: Record<string, any> = GAME_CONFIG as Record<string, any>,
): Record<string, any> {
    const updated = { ...existing };
    for (const mapping of RESOLVED_PANEL_CONFIG_MAP) {
        const configVal = configSource[mapping.configKey];
        if (configVal === undefined) continue;
        if (mapping.transform === 'inverse') {
            updated[mapping.panelKey] = 1 / (configVal as number);
        } else {
            updated[mapping.panelKey] = configVal;
        }
    }
    return updated;
}

// ── Anim Lock Persistence ───────────────────────────────────────────────────

export type AnimLockMode = 'pinned' | 'ratio' | 'animSpeed' | null;

export function loadAnimLockRatios(): Record<string, number | null> {
    if (typeof window === 'undefined') return {};
    try {
        const s = localStorage.getItem(ANIM_LOCK_STORAGE_KEY);
        return s ? JSON.parse(s) : {};
    } catch {
        return {};
    }
}

export function saveAnimLockRatios(ratios: Record<string, number | null>): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(ANIM_LOCK_STORAGE_KEY, JSON.stringify(ratios));
    } catch {
        /* ignore */
    }
}

export function loadAnimLockModes(): Record<string, AnimLockMode> {
    if (typeof window === 'undefined') return {};
    try {
        const s = localStorage.getItem(ANIM_LOCK_STORAGE_KEY + '-modes');
        return s ? JSON.parse(s) : {};
    } catch {
        return {};
    }
}

export function saveAnimLockModes(modes: Record<string, AnimLockMode>): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(ANIM_LOCK_STORAGE_KEY + '-modes', JSON.stringify(modes));
    } catch {
        /* ignore */
    }
}

/** Recalculate tick-locked/pinned values when tick interval changes */
export function recalcAnimLocksOnTickChange(
    newTickMs: number,
    lockModes: Record<string, AnimLockMode>,
    lockRatios: Record<string, number | null>,
    sliders: AnimSliderDef[],
): Record<string, number> {
    const updates: Record<string, number> = {};
    for (const [key, mode] of Object.entries(lockModes)) {
        if (mode === 'pinned' || mode === 'ratio') {
            const ratio = lockRatios[key];
            if (ratio != null) {
                const def = sliders.find(s => s.key === key);
                let newVal = isTickRelativeUnit(def?.unit) ? ratio : ratio * newTickMs;
                if (def && def.min != null && def.max != null) {
                    newVal = Math.max(def.min, Math.min(def.max, newVal));
                }
                newVal = def?.unit === 'ms'
                    ? Math.round(newVal)
                    : Math.round(newVal * 100) / 100;
                (GAME_CONFIG as any)[key] = newVal;
                updates[key] = newVal;
            }
        }
    }
    return updates;
}

/** Recalculate animSpeed-locked values when animation speed changes */
export function recalcAnimLocksOnAnimSpeedChange(
    newAnimMs: number,
    lockModes: Record<string, AnimLockMode>,
    lockRatios: Record<string, number | null>,
    sliders: AnimSliderDef[],
): Record<string, number> {
    const updates: Record<string, number> = {};
    for (const [key, mode] of Object.entries(lockModes)) {
        if (mode === 'animSpeed') {
            const ratio = lockRatios[key];
            if (ratio != null) {
                const def = sliders.find(s => s.key === key);
                let newVal = ratio * newAnimMs;
                if (def && def.min != null && def.max != null) {
                    newVal = Math.max(def.min, Math.min(def.max, newVal));
                }
                newVal = def?.unit === 'ms'
                    ? Math.round(newVal)
                    : Math.round(newVal * 100) / 100;
                (GAME_CONFIG as any)[key] = newVal;
                updates[key] = newVal;
            }
        }
    }
    return updates;
}

// ── Tier Persistence ────────────────────────────────────────────────────────

export function loadTier(): 'basic' | 'advanced' | 'developer' {
    if (typeof window === 'undefined') return 'developer';
    const s = localStorage.getItem(TIER_STORAGE_KEY);
    if (s === 'basic' || s === 'advanced') return s;
    return 'developer';
}

export function saveTier(tier: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(TIER_STORAGE_KEY, tier);
    }
}

// ── Config Export ────────────────────────────────────────────────────────────

export function exportConfigJSON(): void {
    const data = JSON.stringify(GAME_CONFIG, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `pax-config-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

/** Map GAME_CONFIG key → panel key for sync */
export function configKeyToPanelKey(configKey: string): string | null {
    return CONFIG_TO_PANEL_KEY[configKey] ?? null;
}


