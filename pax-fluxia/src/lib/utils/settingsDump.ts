/**
 * Settings Dump — Dev-only client helper
 * 
 * Debounced POST of the full GAME_CONFIG to the Vite dev server,
 * which writes it to common/resources/settings-live/current-settings.json.
 * Only fires in dev mode. No-ops in production builds.
 */

import { GAME_CONFIG } from '$lib/config/game.config';

let timer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 500;

/**
 * Call this after any save* function in panelSync.
 * Debounced to max once per 500ms to avoid thrashing during slider drags.
 */
export function dumpSettings(): void {
    // Only in dev
    if (typeof window === 'undefined') return;
    if (!import.meta.env.DEV) return;

    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
        timer = null;
        try {
            fetch('/__settings-dump', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(GAME_CONFIG, null, 2),
            }).catch(() => { /* silent — server may not support it */ });
        } catch {
            /* ignore */
        }
    }, DEBOUNCE_MS);
}
