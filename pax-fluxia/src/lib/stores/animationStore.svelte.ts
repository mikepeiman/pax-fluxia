// ============================================================================
// Animation Store — Client-side animation speed settings
// ============================================================================
// Decoupled from GAME_CONFIG and game tick rate.
// The FXOrchestrator's FXClock uses this as the source of truth for
// visual animation speed. Game logic tick rate is independent.
// ============================================================================

import { GAME_CONFIG } from '$lib/config/game.config';
import { log } from '$lib/utils/logger';

const ANIMATION_STORAGE_KEY = 'pax-animation-settings';

function loadSetting<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const allSettings = localStorage.getItem(ANIMATION_STORAGE_KEY);
        if (allSettings) {
            const parsed = JSON.parse(allSettings);
            return parsed[key] ?? defaultValue;
        }
    } catch { /* ignore parse errors */ }
    return defaultValue;
}

function saveSetting(key: string, value: unknown) {
    if (typeof window === 'undefined') return;
    try {
        const allSettings = JSON.parse(localStorage.getItem(ANIMATION_STORAGE_KEY) || '{}');
        allSettings[key] = value;
        localStorage.setItem(ANIMATION_STORAGE_KEY, JSON.stringify(allSettings));
    } catch { /* ignore storage errors */ }
}

// --- State ---
/**
 * The REFERENCE speed the multiplier is measured against — deliberately captured
 * once, at import, and deliberately never updated.
 *
 * `speedMultiplier` answers "how much faster or slower than the shipped default
 * are we running", so its numerator has to stay fixed. Re-reading GAME_CONFIG
 * live would make the ratio permanently 1.0 and silently disable animation-speed
 * scaling in ShipRenderer.
 *
 * This is NOT the startup-only defect it looks like: the settings apply path
 * calls `animationStore.setAnimationSpeed(GAME_CONFIG.ANIMATION_SPEED_MS)`
 * (settingsStore), so a change to Animation Speed moves `speedMs` immediately —
 * no reload involved.
 */
// ast-grep-ignore: settings-frozen-at-import
const DEFAULT_SPEED_MS = GAME_CONFIG.ANIMATION_SPEED_MS;
let speedMs = $state(loadSetting('speedMs', DEFAULT_SPEED_MS));

// --- Actions ---
function setAnimationSpeed(ms: number) {
    if (ms !== speedMs) {
        log.state('AnimStore', `speedMs changed: ${speedMs} → ${ms}`, new Error().stack);
    }
    speedMs = ms;
    saveSetting('speedMs', ms);
}

// --- Store Export ---
export const animationStore = {
    get speedMs() { return speedMs; },
    /** Speed multiplier: >1 = faster animations, <1 = slower. */
    get speedMultiplier() { return DEFAULT_SPEED_MS / Math.max(50, speedMs); },
    setAnimationSpeed,
};
