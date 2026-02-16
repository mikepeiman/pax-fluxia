// ============================================================================
// Animation Store — Client-side animation speed settings
// ============================================================================
// Decoupled from GAME_CONFIG and game tick rate.
// The FXOrchestrator's FXClock uses this as the source of truth for
// visual animation speed. Game logic tick rate is independent.
// ============================================================================

import { GAME_CONFIG } from '$lib/config/game.config';

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
let speedMs = $state(loadSetting('speedMs', GAME_CONFIG.ANIMATION_SPEED_MS));

// --- Actions ---
function setAnimationSpeed(ms: number) {
    speedMs = ms;
    saveSetting('speedMs', ms);
}

// --- Store Export ---
export const animationStore = {
    get speedMs() { return speedMs; },
    setAnimationSpeed,
};
