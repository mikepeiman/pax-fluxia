/**
 * Panel Sync — Persistence and config↔panel bridging
 *
 * Extracted from GameSettingsPanel.svelte.
 * Handles localStorage save/load and the bidirectional
 * GAME_CONFIG ↔ panel state synchronization.
 */

import { GAME_CONFIG } from '$lib/config/game.config';
import { PANEL_CONFIG_MAP, CONFIG_TO_PANEL_KEY, type AnimSliderDef } from './settingsDefs';
import { dumpSettings } from '$lib/utils/settingsDump';

// ── Storage Keys ────────────────────────────────────────────────────────────

export const STORAGE_KEY = 'pax-fluxia-combat-tuning';
export const PANEL_STORAGE_KEY = 'pax-fluxia-panel-settings';
export const VISUALS_STORAGE_KEY = 'pax-fluxia-visuals';
export const ANIM_LOCK_STORAGE_KEY = 'pax-anim-lock-ratios';
export const TIER_STORAGE_KEY = 'pax-fluxia-settings-tier';

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
    bgImage: '/images/backgrounds/bg-25.jpg',
};

export function loadVisuals(): typeof VISUAL_DEFAULTS {
    if (typeof window === 'undefined') return { ...VISUAL_DEFAULTS };
    try {
        const s = localStorage.getItem(VISUALS_STORAGE_KEY);
        if (s) return { ...VISUAL_DEFAULTS, ...JSON.parse(s) };
    } catch {
        /* ignore */
    }
    return { ...VISUAL_DEFAULTS };
}

export function saveVisuals(vis: typeof VISUAL_DEFAULTS): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(VISUALS_STORAGE_KEY, JSON.stringify(vis));
    dumpSettings();
}

export function applyVisuals(vis: typeof VISUAL_DEFAULTS): void {
    GAME_CONFIG.CONNECTION_WIDTH = vis.laneWidth;
    GAME_CONFIG.CONNECTION_ALPHA = vis.laneAlpha;
    GAME_CONFIG.CONNECTION_SHADOW_WIDTH = vis.shadowWidth;
    GAME_CONFIG.CONNECTION_SHADOW_ALPHA = vis.shadowAlpha;

    // Live-update background image if it changes
    if (GAME_CONFIG.BG_IMAGE_URL !== vis.bgImage) {
        GAME_CONFIG.BG_IMAGE_URL = vis.bgImage;
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent("pax-bg-change", { detail: vis.bgImage }));
        }
    }
}

// ── Panel Settings Persistence ──────────────────────────────────────────────

export function loadPanelSettings<T extends Record<string, any>>(defaults: T): T {
    if (typeof window === 'undefined') return { ...defaults };
    try {
        const s = localStorage.getItem(PANEL_STORAGE_KEY);
        if (s) return { ...defaults, ...JSON.parse(s) };
    } catch {
        /* ignore */
    }
    return { ...defaults };
}

/**
 * Build panel defaults by reading every key in PANEL_CONFIG_MAP from GAME_CONFIG.
 * This ensures panel state always starts consistent with game config — no undefined keys.
 */
export function panelDefaultsFromConfig(
    configSource: Record<string, any> = GAME_CONFIG as Record<string, any>,
): Record<string, any> {
    const defaults: Record<string, any> = {};
    for (const m of PANEL_CONFIG_MAP) {
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
 * Uses PANEL_CONFIG_MAP for the mapping; handles 'inverse' transform.
 */
export function applyPanelToConfig(panel: Record<string, any>): void {
    for (const mapping of PANEL_CONFIG_MAP) {
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
 * Read GAME_CONFIG into panel object.
 * Used after theme apply or config import to sync display.
 */
export function syncPanelFromConfig(
    existing: Record<string, any>,
    configSource: Record<string, any> = GAME_CONFIG as Record<string, any>,
): Record<string, any> {
    const updated = { ...existing };
    for (const mapping of PANEL_CONFIG_MAP) {
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
                let newVal = ratio * newTickMs;
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


