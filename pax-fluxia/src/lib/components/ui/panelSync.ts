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
import { ANIM_SLIDERS, RESOLVED_PANEL_CONFIG_MAP, CONFIG_TO_PANEL_KEY } from './settingsDefs';
import { recalcOnTickChange, type AnimLockMode } from './animLockMath';
import { dumpSettings } from '$lib/utils/settingsDump';

/** The lock-mode type is owned by animLockMath; re-exported here because this
 *  module's storage API (loadAnimLockModes/saveAnimLockModes) speaks it. */
export type { AnimLockMode };

// ── Storage Keys ────────────────────────────────────────────────────────────

export const PANEL_STORAGE_KEY = 'pax-fluxia-panel-settings';
/** Retired store (2026-07-15). Read once by migrateVisualsStoreIntoPanel, then removed. */
const VISUALS_STORAGE_KEY = 'pax-fluxia-visuals';
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
const CONQUEST_FRONT_POLICY_VERSION = 2;

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

    // v2 (2026-07-10): the short-lived 'push' front mode is retired (the
    // one-graph architecture is restored; front shapes are 'linear'/'radial'
    // splits applied in the geometry). Any 'push' value — including those the
    // v1 migration force-wrote — maps back to 'radial'.
    if (stored.conquestFrontPolicyVersion !== CONQUEST_FRONT_POLICY_VERSION) {
        if (stored.territoryConquestFrontMode === 'push') {
            stored.territoryConquestFrontMode = 'radial';
        }
        stored.conquestFrontPolicyVersion = CONQUEST_FRONT_POLICY_VERSION;
        changed = true;
    }

    return changed;
}

// ── Background image ────────────────────────────────────────────────────────

/**
 * Set the background image: normalize the path, write config, notify the
 * canvas. The ONE way to change the background — three call sites used to
 * hand-roll this triple (applyVisuals, the settings panel's config-patch path,
 * and themeStore).
 *
 * Returns the normalized path, which is what callers should persist.
 */
export function applyBgImageChange(rawPath: string): string {
    const bgPath = normalizeBgImagePath(rawPath);
    GAME_CONFIG.BG_IMAGE_URL = bgPath;
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pax-bg-change', { detail: bgPath }));
    }
    return bgPath;
}

// The `pax-fluxia-visuals` store (VISUAL_DEFAULTS / loadVisuals / saveVisuals /
// applyVisuals) lived here until the 2026-07-15 audit. All five of its values
// — lane width/alpha, lane shadow width/alpha, background image — are ordinary
// PANEL_CONFIG_MAP entries (CONNECTION_WIDTH, CONNECTION_ALPHA,
// CONNECTION_SHADOW_WIDTH, CONNECTION_SHADOW_ALPHA, BG_IMAGE_URL), so every one
// of them was persisted TWICE under two different key spellings, and boot order
// (applyPanelToConfig then applyVisuals) silently decided which copy won.
// Deleted; migrateVisualsStoreIntoPanel below folds any saved values forward.

// ── Panel Settings Persistence ──────────────────────────────────────────────

/**
 * One-time fold-in of the retired `pax-fluxia-visuals` store (2026-07-15).
 *
 * The visuals store won at boot — hydrateConfigFromPersistedUiSettings ran
 * applyPanelToConfig FIRST and applyVisuals SECOND — so its values are the
 * ones the user has actually been looking at. They therefore overwrite the
 * panel's parallel copies here, not the other way round. The old key is
 * removed once folded, so this runs exactly once per browser.
 */
function migrateVisualsStoreIntoPanel(stored: Record<string, any>): boolean {
    if (typeof window === 'undefined') return false;

    let changed = false;
    const raw = localStorage.getItem(VISUALS_STORAGE_KEY);
    if (raw) {
        try {
            const vis = JSON.parse(raw) as Record<string, unknown>;
            const folds: Array<[string, string]> = [
                ['laneWidth', 'connectionWidth'],
                ['laneAlpha', 'connectionAlpha'],
                ['shadowWidth', 'connectionShadowWidth'],
                ['shadowAlpha', 'connectionShadowAlpha'],
                ['bgImage', 'bgImageUrl'],
            ];
            for (const [visKey, panelKey] of folds) {
                if (vis[visKey] === undefined) continue;
                stored[panelKey] = vis[visKey];
                changed = true;
            }
        } catch {
            /* a corrupt visuals blob just means nothing to fold */
        }
        localStorage.removeItem(VISUALS_STORAGE_KEY);
        changed = true;
    }

    // loadVisuals used to normalize the bg path on every read; the panel now
    // holds it, so normalize it here instead of trusting whatever was stored.
    if (typeof stored.bgImageUrl === 'string') {
        const normalized = normalizeBgImagePath(stored.bgImageUrl);
        if (normalized !== stored.bgImageUrl) {
            stored.bgImageUrl = normalized;
            changed = true;
        }
    }

    return changed;
}

/**
 * Historical panel key renames.
 * These were stored under old (incorrect) keys in localStorage; migrate them
 * forward once by reading under the old key and writing under the new key.
 * Keys that were "historical accidents" — abbreviated or semantically renamed
 * forms that diverged from the SCREAMING_SNAKE_CASE → camelCase convention.
 */
const PANEL_KEY_RENAMES: Record<string, string> = {
    // defense held AGGRESSOR_ADVANTAGE behind an 'inverse' transform; the Battle
    // slider stored CONFIG-space values under it (the flip-on-reload bug), so the
    // verbatim copy this table performs is the correct migration.
    defense:           'aggressorAdvantage',
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
        const stored: Record<string, any> = s ? (JSON.parse(s) ?? {}) : {};
        let changed = false;

        // Migrations that only make sense against previously-saved panel data.
        // (Running these on an empty object would stamp policy decisions onto
        // brand-new users, overriding their compile-time config defaults.)
        if (s) {
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
            if (normalizeCellGridSmoothnessDefaults(stored)) changed = true;
        }

        // The visuals fold-in is NOT gated on prior panel storage: a user who
        // only ever changed their background from the main menu has a visuals
        // store and no panel store, and their choice must survive.
        if (migrateVisualsStoreIntoPanel(stored)) changed = true;

        if (changed) {
            localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(stored));
        }
        return { ...defaults, ...stored };
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
        defaults[m.panelKey] = raw;
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
 * Uses RESOLVED_PANEL_CONFIG_MAP for the mapping.
 */
export function applyPanelToConfig(panel: Record<string, any>): void {
    for (const mapping of RESOLVED_PANEL_CONFIG_MAP) {
        const val = panel[mapping.panelKey];
        if (val === undefined) continue;
        (GAME_CONFIG as any)[mapping.configKey] = val;
    }
}

/**
 * Restore persisted panel settings into GAME_CONFIG before any gameplay render
 * path reads config-driven territory mode or tunables.
 *
 * This is required because GameSettingsPanel may remain unmounted until the
 * user opens settings; startup must not depend on that mount side effect.
 *
 * Background/lane visuals used to be applied separately here (applyVisuals,
 * after applyPanelToConfig) from their own store; they are ordinary panel keys
 * now, so applyPanelToConfig covers them and boot order stops deciding which
 * copy of a value wins.
 */
export function hydrateConfigFromPersistedUiSettings(): {
    panel: Record<string, any>;
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

    // Surge pulse: the tick binding is resolved live in ShipRenderer
    // (resolveSurgePulseDurationMs) — never overwrite the saved free-run
    // duration here, or toggling the bind off loses the user's value.
    if (
        typeof panel.surgePulseDurationMs === 'number'
        && Number.isFinite(panel.surgePulseDurationMs)
    ) {
        GAME_CONFIG.SURGE_PULSE_DURATION_MS = panel.surgePulseDurationMs;
    }

    // The background path is normalized on load (migrateVisualsStoreIntoPanel);
    // applyPanelToConfig above has already written it to config. No event is
    // dispatched here: nothing is listening yet at hydrate time, and the canvas
    // reads GAME_CONFIG.BG_IMAGE_URL when it initializes.

    return { panel };
}

// ── Anim Lock Persistence ───────────────────────────────────────────────────

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

/** Fired (on window) whenever the tick interval changes from ANY control
 *  surface, so every tick display (settings panel, HUD Game Speed widget)
 *  can re-read GAME_CONFIG.BASE_TICK_MS. */
export const TICK_INTERVAL_CHANGED_EVENT = 'pax-tick-interval-changed';

/**
 * Apply a tick-interval change from a control surface OUTSIDE the settings
 * panel (e.g. the HUD Game Speed widget) as one data-layer operation:
 * GAME_CONFIG, persisted panel settings, and every tick-bound value
 * (animation speed, territory transition, tick-locked anim sliders).
 *
 * Stores stay out of this module — the caller must push the returned values
 * into the live game:
 *   activeGameStore.updateTickInterval(result.tickMs)
 *   animationStore.setAnimationSpeed(result.animSpeedMs)
 *
 * Dispatches 'pax-settings-config-sync-requested' (an open settings panel
 * re-reads config) and TICK_INTERVAL_CHANGED_EVENT (tick displays refresh),
 * so control surfaces never have to know about each other.
 */
export function applyTickIntervalChange(valueMs: number): {
    tickMs: number;
    animSpeedMs: number;
} {
    const panel = loadPanelSettings(panelDefaultsFromConfig());
    panel.tickInterval = valueMs;
    GAME_CONFIG.BASE_TICK_MS = valueMs;

    if (panel.bindAnimToTick) {
        GAME_CONFIG.ANIMATION_SPEED_MS = valueMs;
        panel.animSpeed = valueMs;
    }
    if (panel.territoryTransitionBindToTick) {
        GAME_CONFIG.TERRITORY_TRANSITION_MS = valueMs;
        panel.territoryTransitionMs = valueMs;
    }

    // The lock math is animLockMath's (pure); this function owns the writes.
    const lockUpdates = recalcOnTickChange(
        { modes: loadAnimLockModes(), ratios: loadAnimLockRatios() },
        ANIM_SLIDERS,
        valueMs,
    );
    for (const [configKey, value] of Object.entries(lockUpdates)) {
        (GAME_CONFIG as any)[configKey] = value;
        const panelKey = CONFIG_TO_PANEL_KEY[configKey];
        if (panelKey) panel[panelKey] = value;
    }

    savePanelSettings(panel);

    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent('pax-settings-config-sync-requested', {
                detail: { source: 'tick-interval-change', valueMs },
            }),
        );
        window.dispatchEvent(
            new CustomEvent(TICK_INTERVAL_CHANGED_EVENT, {
                detail: { valueMs },
            }),
        );
    }

    return { tickMs: valueMs, animSpeedMs: GAME_CONFIG.ANIMATION_SPEED_MS };
}

// The two recalcAnimLocks* functions that lived here were a second, side-
// effectful copy of animLockMath's recalcOnTickChange/recalcOnAnimSpeedChange
// (2026-07-15 audit): identical unit/clamp/round rules, plus a GAME_CONFIG
// write. Which copy ran depended on which control surface you touched, and
// their callers wrote every value a second time anyway. Deleted — animLockMath
// is the one implementation; callers own their writes.

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

